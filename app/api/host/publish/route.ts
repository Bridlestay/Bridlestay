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

    // Try to get from JSON body first, then formData
    let propertyId: string | null = null;
    
    try {
      const body = await request.json();
      propertyId = body.propertyId;
    } catch {
      const formData = await request.formData();
      propertyId = formData.get("propertyId") as string;
    }

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID required" },
        { status: 400 }
      );
    }

    console.log("Submitting property for verification:", propertyId);

    // Verify ownership and get all data
    const { data: property, error: fetchError } = await supabase
      .from("properties")
      .select("*, property_photos(id, category), property_equine(*)")
      .eq("id", propertyId)
      .eq("host_id", user.id)
      .single();

    console.log("Property data:", property);
    console.log("Property equine:", property?.property_equine);

    if (fetchError || !property) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Validate requirements
    const allPhotos = property.property_photos || [];
    const photoCount = allPhotos.length;
    const facilityPhotos = allPhotos.filter((p: any) => p.category);
    const stablesPhotos = allPhotos.filter((p: any) => p.category === "stables");
    
    // Handle both array and single object for property_equine
    const equineData = Array.isArray(property.property_equine) 
      ? property.property_equine[0] 
      : property.property_equine;
    const maxHorses = equineData?.max_horses || 0;

    console.log("Photo count:", photoCount);
    console.log("Facility photos:", facilityPhotos.length);
    console.log("Stables photos:", stablesPhotos.length);
    console.log("Max horses:", maxHorses);
    console.log("Description length:", property.description?.length);

    // Minimum 8 general photos
    if (photoCount < 8) {
      return NextResponse.json(
        { error: "At least 8 photos required" },
        { status: 400 }
      );
    }

    // Minimum 2 stables photos for verification
    if (stablesPhotos.length < 2) {
      return NextResponse.json(
        { error: "At least 2 photos of stables required for verification" },
        { status: 400 }
      );
    }

    if (!property.description || property.description.length < 200) {
      return NextResponse.json(
        { error: "Description must be at least 200 characters" },
        { status: 400 }
      );
    }

    if (!maxHorses || maxHorses === 0) {
      return NextResponse.json(
        { error: "Horse capacity must be set" },
        { status: 400 }
      );
    }

    // Mark as pending verification instead of directly publishing
    // Properties need admin verification before going live
    const { error: updateError } = await supabase
      .from("properties")
      .update({ 
        pending_verification: true,
        submitted_for_verification_at: new Date().toISOString(),
      })
      .eq("id", propertyId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    console.log("Successfully submitted property for verification:", propertyId);

    return NextResponse.json({ 
      success: true, 
      propertyId,
      message: "Your listing has been submitted for verification. Our team will review it within 24-48 hours.",
      pendingVerification: true
    });
  } catch (error: any) {
    console.error("Error submitting listing:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit listing" },
      { status: 500 }
    );
  }
}

