import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  
  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError || userData?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Use service role client to bypass RLS
    const serviceClient = getAdminSupabase();

    // Fetch all claims
    const { data: claims, error: claimsError } = await serviceClient
      .from("property_damage_claims")
      .select(`
        *,
        property:properties (id, name),
        booking:bookings (id, start_date, end_date, total_charge_pennies)
      `)
      .order("created_at", { ascending: false });

    if (claimsError) {
      console.error("Error fetching claims:", claimsError);
      return NextResponse.json({ error: claimsError.message }, { status: 500 });
    }

    // Fetch host and guest info for each claim
    const claimsWithUsers = await Promise.all(
      (claims || []).map(async (claim) => {
        const [hostResult, guestResult] = await Promise.all([
          serviceClient
            .from("users")
            .select("id, name, avatar_url, email")
            .eq("id", claim.host_id)
            .single(),
          serviceClient
            .from("users")
            .select("id, name, avatar_url, email")
            .eq("id", claim.guest_id)
            .single()
        ]);

        return {
          ...claim,
          host: hostResult.data || { id: claim.host_id, name: "Unknown", avatar_url: null, email: null },
          guest: guestResult.data || { id: claim.guest_id, name: "Unknown", avatar_url: null, email: null }
        };
      })
    );

    return NextResponse.json({ claims: claimsWithUsers });
  } catch (error: any) {
    console.error("Error in damage-claims API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

