import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const otherUserId = searchParams.get("otherUserId");

    if (!propertyId || !otherUserId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find booking between these two users for this property
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        *,
        properties:property_id (
          id,
          name,
          city,
          county,
          nightly_price_pennies,
          property_photos (*)
        ),
        guest:guest_id (
          id,
          name,
          avatar_url
        )
      `)
      .eq("property_id", propertyId)
      .or(`guest_id.eq.${user.id},guest_id.eq.${otherUserId}`)
      .in("status", ["requested", "accepted", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    // If no booking found, still return property details
    if (!booking) {
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select(`
          id,
          name,
          city,
          county,
          nightly_price_pennies,
          property_photos (*)
        `)
        .eq("id", propertyId)
        .single();

      if (propertyError) throw propertyError;

      return NextResponse.json({ 
        booking: null,
        property: property 
      });
    }

    return NextResponse.json({ booking, property: null });
  } catch (error: any) {
    console.error("Error fetching booking details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch booking details" },
      { status: 500 }
    );
  }
}

