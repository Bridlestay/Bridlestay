import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's favorited route IDs
    const { data: favorites, error: favError } = await supabase
      .from("route_favorites")
      .select("route_id")
      .eq("user_id", user.id);

    if (favError) throw favError;

    if (!favorites || favorites.length === 0) {
      return NextResponse.json({ routes: [] });
    }

    const routeIds = favorites.map((f) => f.route_id);

    // Fetch the actual routes (without the problematic join)
    const { data: routes, error: routesError } = await supabase
      .from("routes")
      .select(`
        id,
        title,
        description,
        distance_km,
        estimated_time_minutes,
        difficulty,
        route_type,
        visibility,
        geometry,
        avg_rating,
        review_count,
        created_at,
        owner_user_id
      `)
      .in("id", routeIds)
      .order("created_at", { ascending: false });

    if (routesError) throw routesError;

    if (!routes || routes.length === 0) {
      return NextResponse.json({ routes: [] });
    }

    // Get cover photos for these routes
    const { data: photos } = await supabase
      .from("route_photos")
      .select("route_id, url")
      .in("route_id", routeIds)
      .eq("is_cover", true);

    // Get owner info separately
    const ownerIds = [...new Set(routes.map(r => r.owner_user_id).filter(Boolean))];
    let ownersMap = new Map();
    
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase
        .from("users")
        .select("id, name, avatar_url")
        .in("id", ownerIds);
      
      ownersMap = new Map(owners?.map(o => [o.id, o]) || []);
    }

    // Merge data
    const photosMap = new Map(photos?.map(p => [p.route_id, p.url]) || []);
    const routesWithData = routes.map(route => ({
      ...route,
      cover_photo_url: photosMap.get(route.id) || null,
      owner: ownersMap.get(route.owner_user_id) || null
    }));

    return NextResponse.json({ routes: routesWithData });
  } catch (error: any) {
    console.error("Favorites error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

