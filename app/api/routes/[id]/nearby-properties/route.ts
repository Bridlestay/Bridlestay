import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const routeId = params.id;

    // Get the route
    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("geometry, county")
      .eq("id", routeId)
      .single();

    if (routeError || !route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Extract coordinates from geometry
    const coordinates = route.geometry?.coordinates;
    if (!coordinates || coordinates.length === 0) {
      return NextResponse.json({ properties: [] });
    }

    // Calculate center point of route (midpoint)
    const midIndex = Math.floor(coordinates.length / 2);
    const [centerLng, centerLat] = coordinates[midIndex];

    // Search radius in km (approximate)
    const searchRadiusKm = 10;
    
    // Simple bounding box calculation (rough approximation)
    // 1 degree ≈ 111 km
    const latOffset = searchRadiusKm / 111;
    const lngOffset = searchRadiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));

    const minLat = centerLat - latOffset;
    const maxLat = centerLat + latOffset;
    const minLng = centerLng - lngOffset;
    const maxLng = centerLng + lngOffset;

    // Get properties in the area (published only) - use correct column names lat/lng
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select(
        `
        id,
        name,
        city,
        county,
        lat,
        lng,
        nightly_price_pennies,
        max_guests,
        average_rating,
        review_count,
        property_photos (url, order),
        property_equine (stable_count, paddock_available)
      `
      )
      .eq("published", true)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .gte("lat", minLat)
      .lte("lat", maxLat)
      .gte("lng", minLng)
      .lte("lng", maxLng)
      .limit(20);

    if (propertiesError) throw propertiesError;

    // Calculate actual distances and format response
    const propertiesWithDistance = (properties || []).map((property) => {
      // Calculate distance from route midpoint using Haversine formula
      const lat1 = (centerLat * Math.PI) / 180;
      const lat2 = (Number(property.lat) * Math.PI) / 180;
      const deltaLat = ((Number(property.lat) - centerLat) * Math.PI) / 180;
      const deltaLng = ((Number(property.lng) - centerLng) * Math.PI) / 180;

      const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = 6371 * c; // Earth radius in km

      // Get first photo
      const photos = Array.isArray(property.property_photos)
        ? property.property_photos.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        : [];
      const mainPhoto = photos[0]?.url || null;

      // Get facility info
      const equineData = Array.isArray(property.property_equine)
        ? property.property_equine[0]
        : property.property_equine;

      return {
        id: property.id,
        name: property.name,
        city: property.city,
        county: property.county,
        // Privacy: provide approximate lat/lng (rounded to 2 decimals ≈ 1km accuracy)
        approximateLat: Math.round(Number(property.lat) * 100) / 100,
        approximateLng: Math.round(Number(property.lng) * 100) / 100,
        distanceKm: Math.round(distance * 10) / 10, // Round to 1 decimal
        pricePerNight: property.nightly_price_pennies / 100,
        maxGuests: property.max_guests,
        avgRating: property.average_rating,
        reviewCount: property.review_count,
        mainPhoto,
        stableCount: equineData?.stable_count || 0,
        hasPaddock: equineData?.paddock_available || false,
      };
    });

    // Sort by distance
    propertiesWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    // Return top 10 closest
    return NextResponse.json({
      properties: propertiesWithDistance.slice(0, 10),
    });
  } catch (error: any) {
    console.error("Error fetching nearby properties:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch nearby properties" },
      { status: 500 }
    );
  }
}

