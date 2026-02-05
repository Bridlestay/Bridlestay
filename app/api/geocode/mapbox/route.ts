import { NextRequest, NextResponse } from "next/server";

/**
 * Geocode an address using Mapbox Geocoding API
 * Returns coordinates and place information
 */
export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5 } = await request.json();
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Mapbox token not configured" }, { status: 500 });
    }

    // Use Mapbox Geocoding API
    // Bias results to UK
    const bbox = "-10.5,49.5,2.5,61"; // UK bounding box
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=${limit}&country=gb&bbox=${bbox}&types=place,locality,postcode,address,poi`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("Mapbox geocoding error:", response.status, await response.text());
      return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
    }

    const data = await response.json();
    
    // Transform Mapbox results to a simpler format
    const places = data.features?.map((feature: any) => ({
      id: feature.id,
      name: feature.text,
      placeName: feature.place_name,
      coordinates: {
        lng: feature.center[0],
        lat: feature.center[1],
      },
      type: feature.place_type?.[0] || "unknown",
      context: feature.context?.map((c: any) => ({
        id: c.id,
        text: c.text,
      })) || [],
    })) || [];

    return NextResponse.json({ places });
  } catch (error) {
    console.error("Geocode error:", error);
    return NextResponse.json({ error: "Failed to geocode" }, { status: 500 });
  }
}

