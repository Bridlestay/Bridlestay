import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get properties pending verification (prioritize these)
    const { data: pendingVerification, error: pvError } = await supabase
      .from("properties")
      .select(`
        *,
        host:host_id (id, name, email, admin_verified),
        property_photos (url, is_cover, "order", category),
        property_amenities (*),
        property_equine (*)
      `)
      .eq("pending_verification", true)
      .eq("removed", false)
      .order("submitted_for_verification_at", { ascending: true });

    // Get other unpublished properties (drafts)
    const { data: drafts, error: dError } = await supabase
      .from("properties")
      .select(`
        *,
        host:host_id (id, name, email, admin_verified),
        property_photos (url, is_cover, "order", category),
        property_amenities (*),
        property_equine (*)
      `)
      .eq("published", false)
      .neq("pending_verification", true)
      .eq("removed", false)
      .order("created_at", { ascending: false });

    const error = pvError || dError;

    // Combine with pending verification first
    const properties = [
      ...(pendingVerification || []).map(p => ({ ...p, _status: 'pending_verification' })),
      ...(drafts || []).map(p => ({ ...p, _status: 'draft' })),
    ];

    if (error) {
      console.error("Error fetching pending listings:", error);
      throw error;
    }

    return NextResponse.json({ properties: properties || [] });
  } catch (error: any) {
    console.error("Error fetching pending listings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending listings" },
      { status: 500 }
    );
  }
}



