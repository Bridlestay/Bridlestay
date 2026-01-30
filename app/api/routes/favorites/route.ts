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

    // Fetch the actual routes
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
        cover_photo_url,
        owner:users!routes_owner_user_id_fkey(id, name, avatar_url)
      `)
      .in("id", routeIds)
      .order("created_at", { ascending: false });

    if (routesError) throw routesError;

    return NextResponse.json({ routes: routes || [] });
  } catch (error: any) {
    console.error("Favorites error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

