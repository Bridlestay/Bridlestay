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
      difficulty, // singular (legacy)
      difficulties, // array of difficulty values
      minDistanceKm,
      maxDistanceKm,
      minDistance, // alias sent by find-routes-panel
      maxDistance, // alias sent by find-routes-panel
      minRating, // minimum avg_rating
      routeTypes, // array: ["circular", "linear"]
      nearPropertyId,
      radiusKm = 10,
      terrainTags,
      myRoutes, // filter for user's own routes
      sortBy, // most_popular, highest_rated, newest, shortest, longest
      page = 1,
      limit = 20,
      // Location-based search
      lat, // latitude for proximity search
      lng, // longitude for proximity search
      searchRadius = 25, // radius in km for location search
    } = body;

    // Normalise distance params (accept both naming conventions)
    const effectiveMinDistance = minDistanceKm ?? minDistance;
    const effectiveMaxDistance = maxDistanceKm ?? maxDistance;
    // Normalise difficulty (accept singular or array)
    const effectiveDifficulties: string[] | undefined =
      difficulties?.length ? difficulties : difficulty ? [difficulty] : undefined;

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
          created_at, owner_user_id, geometry, route_type, variant_of_id,
          show_on_explore, estimated_time_minutes
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

    // Location-based search: if lat/lng provided, search within radius
    if (lat !== undefined && lng !== undefined) {
      // Use bounding box approach for initial filtering
      const kmPerDegLat = 111.32;
      const kmPerDegLng = 111.32 * Math.cos(lat * Math.PI / 180);
      const latDelta = searchRadius / kmPerDegLat;
      const lngDelta = searchRadius / kmPerDegLng;

      // Fetch routes with geometry that could be within range
      let nearbyQuery = supabase
        .from("routes")
        .select(`id, title, description, difficulty, distance_km, county, visibility,
          terrain_tags, avg_rating, review_count, is_public, created_at, owner_user_id,
          geometry, route_type, variant_of_id, show_on_explore, estimated_time_minutes`)
        .eq("is_public", true)
        .not("owner_user_id", "is", null)
        .not("geometry", "is", null);

      // Apply filters to location search too
      if (effectiveDifficulties && effectiveDifficulties.length > 0) {
        nearbyQuery = nearbyQuery.in("difficulty", effectiveDifficulties);
      }
      if (effectiveMinDistance !== undefined && effectiveMinDistance > 0) {
        nearbyQuery = nearbyQuery.gte("distance_km", effectiveMinDistance);
      }
      if (effectiveMaxDistance !== undefined && effectiveMaxDistance < 1000) {
        nearbyQuery = nearbyQuery.lte("distance_km", effectiveMaxDistance);
      }
      if (minRating !== undefined && minRating > 0) {
        nearbyQuery = nearbyQuery.gte("avg_rating", minRating);
      }
      if (routeTypes && routeTypes.length > 0) {
        nearbyQuery = nearbyQuery.in("route_type", routeTypes);
      }

      const { data: nearbyRoutes, error: nearbyError } = await nearbyQuery;

      if (nearbyError) {
        console.error("[ROUTES_SEARCH_LOCATION] Error:", nearbyError);
        return NextResponse.json({ error: nearbyError.message }, { status: 500 });
      }

      // Filter by actual distance using route start point
      const routesWithDistance = (nearbyRoutes || [])
        .map(route => {
          if (!route.geometry?.coordinates?.length) return null;
          
          // Get first coordinate of route as reference point
          const routeStart = route.geometry.coordinates[0];
          if (!routeStart || routeStart.length < 2) return null;
          
          const routeLng = routeStart[0];
          const routeLat = routeStart[1];
          
          // Calculate distance using Haversine formula
          const R = 6371; // Earth radius in km
          const dLat = (routeLat - lat) * Math.PI / 180;
          const dLng = (routeLng - lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat * Math.PI / 180) * Math.cos(routeLat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          if (distance <= searchRadius) {
            return { ...route, distanceFromSearch: distance };
          }
          return null;
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => a.distanceFromSearch - b.distanceFromSearch);

      // Apply text search filter if provided
      let filteredRoutes = routesWithDistance;
      if (q) {
        const qLower = q.toLowerCase();
        filteredRoutes = routesWithDistance.filter(r => 
          r.title?.toLowerCase().includes(qLower) ||
          r.description?.toLowerCase().includes(qLower)
        );
      }

      // Paginate
      const total = filteredRoutes.length;
      const offset = (page - 1) * limit;
      const paginatedRoutes = filteredRoutes.slice(offset, offset + limit);

      // Get cover photos
      if (paginatedRoutes.length > 0) {
        const routeIds = paginatedRoutes.map(r => r.id);
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

        const routesWithPhotos = paginatedRoutes.map(route => ({
          ...route,
          cover_photo_url: coverMap.get(route.id) || null,
          route_photos: coverMap.has(route.id) ? [{ url: coverMap.get(route.id) }] : [],
        }));

        return NextResponse.json({
          routes: routesWithPhotos,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          searchLocation: { lat, lng, radius: searchRadius },
        });
      }

      return NextResponse.json({
        routes: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        searchLocation: { lat, lng, radius: searchRadius },
      });
    }

    // Fallback: simple public routes query - ONLY user-created routes
    let query = supabase
      .from("routes")
      .select(`id, title, description, difficulty, distance_km, county, visibility,
        terrain_tags, avg_rating, review_count, is_public, created_at, owner_user_id,
        geometry, route_type, variant_of_id, show_on_explore, estimated_time_minutes`,
        { count: "exact" })
      .eq("is_public", true)
      .not("owner_user_id", "is", null); // Only show user-created routes, not imported bridleways

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,county.ilike.%${q}%`);
    }
    if (county) {
      query = query.eq("county", county);
    }
    // Difficulty filter (array)
    if (effectiveDifficulties && effectiveDifficulties.length > 0) {
      query = query.in("difficulty", effectiveDifficulties);
    }
    // Distance filter
    if (effectiveMinDistance !== undefined && effectiveMinDistance > 0) {
      query = query.gte("distance_km", effectiveMinDistance);
    }
    if (effectiveMaxDistance !== undefined && effectiveMaxDistance < 1000) {
      query = query.lte("distance_km", effectiveMaxDistance);
    }
    // Rating filter
    if (minRating !== undefined && minRating > 0) {
      query = query.gte("avg_rating", minRating);
    }
    // Route type filter (circular/linear)
    if (routeTypes && routeTypes.length > 0) {
      query = query.in("route_type", routeTypes);
    }

    // Sorting
    switch (sortBy) {
      case "highest_rated":
        query = query.order("avg_rating", { ascending: false, nullsFirst: false });
        break;
      case "most_popular":
        query = query.order("review_count", { ascending: false, nullsFirst: false });
        break;
      case "shortest":
        query = query.order("distance_km", { ascending: true });
        break;
      case "longest":
        query = query.order("distance_km", { ascending: false });
        break;
      case "newest":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: routes, error, count } = await query;

    if (error) {
      console.error("[ROUTES_SEARCH] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get cover photos for public routes
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
      // Fallback to first photo if no cover set
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
  } catch (error: any) {
    console.error("[ROUTES_SEARCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to search routes" },
      { status: 500 }
    );
  }
}


