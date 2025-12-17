import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all published properties with coordinates
    const { data: properties, error } = await supabase
      .from("properties")
      .select(`
        id,
        name,
        city,
        county,
        lat,
        lng,
        nightly_price_pennies,
        max_horses,
        average_rating,
        review_count,
        property_photos (url, is_cover),
        property_equine (max_horses)
      `)
      .eq("published", true)
      .not("lat", "is", null)
      .not("lng", "is", null);

    if (error) {
      console.error("Error fetching properties:", error);
      throw error;
    }

    // Format properties for the map
    const formattedProperties = (properties || []).map((property) => {
      // Get cover photo
      const photos = Array.isArray(property.property_photos) ? property.property_photos : [];
      const coverPhoto = photos.find((p: any) => p.is_cover) || photos[0];
      
      // Get max horses from equine data
      const equineData = Array.isArray(property.property_equine) 
        ? property.property_equine[0] 
        : property.property_equine;

      return {
        id: property.id,
        name: property.name,
        city: property.city,
        county: property.county,
        // Use database column names (lat/lng)
        latitude: property.lat,
        longitude: property.lng,
        nightly_price_pennies: property.nightly_price_pennies,
        max_horses: equineData?.max_horses || property.max_horses || 0,
        average_rating: property.average_rating,
        review_count: property.review_count,
        mainPhoto: coverPhoto?.url || null,
      };
    });

    return NextResponse.json({ properties: formattedProperties });
  } catch (error) {
    console.error("Error in nearby properties API:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}

