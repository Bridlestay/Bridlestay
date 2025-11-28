import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if requester is admin
    const { data: adminData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!adminData || adminData.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID required" },
        { status: 400 }
      );
    }

    // Update property verification status (always verify when this endpoint is called)
    const { error } = await supabase
      .from("properties")
      .update({
        admin_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .eq("id", propertyId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error verifying property:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify property" },
      { status: 500 }
    );
  }
}

