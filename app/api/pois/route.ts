import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch Points of Interest using Mapbox Places API
 * Returns POIs near a given location
 */
export async function POST(request: NextRequest) {
  try {
    const { lat, lng, radius = 5, types, limit = 20 } = await request.json();
    
    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Mapbox token not configured" }, { status: 500 });
    }

    // Use Mapbox Geocoding API with POI category
    // Types: poi, poi.landmark, food, drink, hotel, etc.
    const poiTypes = types || "poi";
    
    // Create a proximity search
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=${poiTypes}&limit=${Math.min(limit, 10)}&proximity=${lng},${lat}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("Mapbox POI error:", response.status, await response.text());
      return NextResponse.json({ error: "POI fetch failed" }, { status: 500 });
    }

    const data = await response.json();
    
    // Transform Mapbox results to POI format
    const pois = data.features?.map((feature: any) => {
      // Extract category from properties
      const category = feature.properties?.category || feature.place_type?.[0] || "poi";
      
      // Get address from context
      const address = feature.properties?.address || 
        feature.context?.find((c: any) => c.id?.includes("address"))?.text ||
        feature.place_name?.split(",").slice(1).join(",").trim() ||
        "";

      return {
        id: feature.id,
        name: feature.text || feature.properties?.name || "Unknown",
        category: category,
        coordinates: {
          lng: feature.center[0],
          lat: feature.center[1],
        },
        address: address,
        placeName: feature.place_name,
        // Mapbox doesn't provide opening hours/ratings directly
        // These would need to come from a different API (Google Places, Foursquare, etc.)
      };
    }) || [];

    // Calculate distance from search point
    const poisWithDistance = pois.map((poi: any) => {
      const R = 6371; // Earth radius in km
      const dLat = (poi.coordinates.lat - lat) * Math.PI / 180;
      const dLng = (poi.coordinates.lng - lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(poi.coordinates.lat * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return {
        ...poi,
        distance: distance,
      };
    });

    // Filter by radius and sort by distance
    const filteredPois = poisWithDistance
      .filter((poi: any) => poi.distance <= radius)
      .sort((a: any, b: any) => a.distance - b.distance);

    return NextResponse.json({ pois: filteredPois });
  } catch (error) {
    console.error("POI fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch POIs" }, { status: 500 });
  }
}

/**
 * Search for POIs by category near a location
 * GET /api/pois?lat=52.2&lng=-2.5&category=food
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const category = searchParams.get("category") || "poi";
  const radius = parseFloat(searchParams.get("radius") || "5");
  
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Valid lat and lng are required" }, { status: 400 });
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Mapbox token not configured" }, { status: 500 });
  }

  try {
    // Use Mapbox search for specific category
    // Common categories: food, drink, hotel, shop, park, etc.
    const categoryMap: Record<string, string> = {
      food: "restaurant,cafe,fast_food,bakery",
      drink: "pub,bar,nightclub",
      accommodation: "hotel,hostel,guest_house,motel",
      shop: "shop",
      nature: "park,nature_reserve",
      all: "poi",
    };

    const types = categoryMap[category] || "poi";
    
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=poi&limit=10&proximity=${lng},${lat}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json({ error: "POI fetch failed" }, { status: 500 });
    }

    const data = await response.json();
    
    const pois = data.features?.map((feature: any) => ({
      id: feature.id,
      name: feature.text,
      category: feature.properties?.category || "poi",
      coordinates: {
        lng: feature.center[0],
        lat: feature.center[1],
      },
      address: feature.place_name?.split(",").slice(1).join(",").trim() || "",
    })) || [];

    return NextResponse.json({ pois });
  } catch (error) {
    console.error("POI fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch POIs" }, { status: 500 });
  }
}

