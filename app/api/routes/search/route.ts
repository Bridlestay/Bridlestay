import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      q, // search query
      county,
      difficulty,
      minDistanceKm,
      maxDistanceKm,
      nearPropertyId,
      radiusKm = 10,
      terrainTags,
      myRoutes, // NEW: filter for user's own routes
      page = 1,
      limit = 20,
    } = body;

    // Get current user for myRoutes filter
    const { data: { user } } = await supabase.auth.getUser();

    // Start building query
    let query = supabase
      .from("routes")
      .select(
        `
        *,
        route_photos (url, caption, order_index)
      `,
        { count: "exact" }
      );

    // Filter by ownership - for "my routes", show ALL user's routes regardless of visibility
    if (myRoutes && user) {
      // Only show routes created by this user (including private ones)
      query = query.eq("owner_user_id", user.id);
    } else {
      // For explore/public routes, only show public ones
      query = query.eq("is_public", true);
    }

    // Text search
    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    // County filter
    if (county) {
      query = query.eq("county", county);
    }

    // Difficulty filter
    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }

    // Distance range
    if (minDistanceKm) {
      query = query.gte("distance_km", minDistanceKm);
    }
    if (maxDistanceKm) {
      query = query.lte("distance_km", maxDistanceKm);
    }

    // Terrain tags (contains any)
    if (terrainTags && terrainTags.length > 0) {
      query = query.overlaps("terrain_tags", terrainTags);
    }

    // Near property filter (basic - just check if route references the property)
    // For true radius filtering, we'd need PostGIS, but this is MVP
    if (nearPropertyId) {
      query = query.eq("near_property_id", nearPropertyId);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Order by rating and recency
    query = query.order("avg_rating", { ascending: false });
    query = query.order("created_at", { ascending: false });

    const { data: routes, error, count } = await query;

    if (error) {
      console.error("[ROUTES_SEARCH] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      routes: routes || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error: any) {
    console.error("[ROUTES_SEARCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to search routes" },
      { status: 500 }
    );
  }
}


