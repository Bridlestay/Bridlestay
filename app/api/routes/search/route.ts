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

    // For "my routes", use simple query (no RLS issues with own routes)
    if (myRoutes && user) {
      let query = supabase
        .from("routes")
        .select(`
          id, title, description, difficulty, distance_km, county,
          terrain_tags, avg_rating, review_count, is_public, visibility,
          created_at, owner_user_id
        `, { count: "exact" })
        .eq("owner_user_id", user.id);

      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
      query = query.order("created_at", { ascending: false });

      const { data: routes, error, count } = await query;

      if (error) {
        console.error("[ROUTES_SEARCH_MY] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Get cover photos for user's routes
      let routesWithPhotos = routes || [];
      if (routes && routes.length > 0) {
        const routeIds = routes.map(r => r.id);
        const { data: photos } = await supabase
          .from("route_photos")
          .select("route_id, url, is_cover")
          .in("route_id", routeIds);

        const coverMap = new Map<string, string>();
        photos?.forEach(p => {
          if (p.is_cover && !coverMap.has(p.route_id)) {
            coverMap.set(p.route_id, p.url);
          }
        });
        photos?.forEach(p => {
          if (!coverMap.has(p.route_id)) {
            coverMap.set(p.route_id, p.url);
          }
        });

        routesWithPhotos = routes.map(route => ({
          ...route,
          cover_photo_url: coverMap.get(route.id) || null,
          route_photos: coverMap.has(route.id) ? [{ url: coverMap.get(route.id) }] : [],
        }));
      }

      return NextResponse.json({
        routes: routesWithPhotos,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      });
    }

    // For public routes, use a simple query that only returns USER-CREATED routes
    // Bridleways/byways imported from external sources have owner_user_id = null

    // Fallback: simple public routes query - ONLY user-created routes
    let query = supabase
      .from("routes")
      .select(`id, title, description, difficulty, distance_km, county, visibility,
        terrain_tags, avg_rating, review_count, is_public, created_at, owner_user_id`, 
        { count: "exact" })
      .eq("is_public", true)
      .not("owner_user_id", "is", null); // Only show user-created routes, not imported bridleways

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }
    if (county) {
      query = query.eq("county", county);
    }
    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
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


