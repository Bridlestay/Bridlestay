import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Admin client for faster queries (bypasses RLS)
function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    return null; // Fall back to regular client
  }
  
  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const userSupabase = await createClient();
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
      myRoutes, // filter for user's own routes
      page = 1,
      limit = 20,
    } = body;

    // Get current user for myRoutes filter
    const { data: { user } } = await userSupabase.auth.getUser();

    // Use admin client for faster queries
    const adminSupabase = getAdminSupabase();
    const supabase = adminSupabase || userSupabase;

    // Build filters
    let query = supabase
      .from("routes")
      .select(`
        id,
        title,
        description,
        difficulty,
        distance_km,
        county,
        terrain_tags,
        avg_rating,
        review_count,
        is_public,
        visibility,
        created_at,
        owner_user_id,
        cover_photo_id
      `, { count: "exact" });

    // Filter by ownership or public
    if (myRoutes && user) {
      query = query.eq("owner_user_id", user.id);
    } else {
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

    // Terrain tags
    if (terrainTags && terrainTags.length > 0) {
      query = query.overlaps("terrain_tags", terrainTags);
    }

    // Near property filter
    if (nearPropertyId) {
      query = query.eq("near_property_id", nearPropertyId);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Order by rating and recency
    query = query.order("avg_rating", { ascending: false, nullsFirst: false });
    query = query.order("created_at", { ascending: false });

    const { data: routes, error, count } = await query;

    if (error) {
      console.error("[ROUTES_SEARCH] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If we have routes, get cover photos in a separate query
    let routesWithPhotos = routes || [];
    if (routes && routes.length > 0) {
      const routeIds = routes.map(r => r.id);
      
      // Get cover photos for these routes
      const { data: coverPhotos } = await supabase
        .from("route_photos")
        .select("route_id, url")
        .in("route_id", routeIds)
        .eq("is_cover", true);

      // Also get first photo for routes without cover
      const { data: firstPhotos } = await supabase
        .from("route_photos")
        .select("route_id, url")
        .in("route_id", routeIds)
        .order("created_at", { ascending: true });

      // Map photos to routes
      const coverMap = new Map(coverPhotos?.map(p => [p.route_id, p.url]) || []);
      const firstPhotoMap = new Map<string, string>();
      firstPhotos?.forEach(p => {
        if (!firstPhotoMap.has(p.route_id)) {
          firstPhotoMap.set(p.route_id, p.url);
        }
      });

      routesWithPhotos = routes.map(route => ({
        ...route,
        cover_photo_url: coverMap.get(route.id) || firstPhotoMap.get(route.id) || null,
        route_photos: coverMap.has(route.id) || firstPhotoMap.has(route.id) 
          ? [{ url: coverMap.get(route.id) || firstPhotoMap.get(route.id) }]
          : [],
      }));
    }

    return NextResponse.json({
      routes: routesWithPhotos,
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


