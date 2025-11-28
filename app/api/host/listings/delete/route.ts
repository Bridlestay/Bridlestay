import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID required" },
        { status: 400 }
      );
    }

    console.log("Deleting property:", propertyId);

    // Verify ownership
    const { data: property } = await supabase
      .from("properties")
      .select("id, host_id")
      .eq("id", propertyId)
      .eq("host_id", user.id)
      .single();

    if (!property) {
      return NextResponse.json(
        { error: "Property not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check if property has any active bookings
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("property_id", propertyId)
      .in("status", ["pending", "accepted"])
      .gte("check_out", new Date().toISOString());

    if (activeBookings && activeBookings.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete property with active or upcoming bookings" },
        { status: 400 }
      );
    }

    // Delete related records first (photos, amenities, equine)
    // Photos will be deleted by cascade
    await supabase
      .from("property_photos")
      .delete()
      .eq("property_id", propertyId);

    await supabase
      .from("property_amenities")
      .delete()
      .eq("property_id", propertyId);

    await supabase
      .from("property_equine")
      .delete()
      .eq("property_id", propertyId);

    // Delete the property
    const { error: deleteError } = await supabase
      .from("properties")
      .delete()
      .eq("id", propertyId)
      .eq("host_id", user.id);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      throw deleteError;
    }

    console.log("Successfully deleted property:", propertyId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting listing:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete listing" },
      { status: 500 }
    );
  }
}



