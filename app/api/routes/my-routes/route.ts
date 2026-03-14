import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First get user's routes
    const { data: routes, error } = await supabase
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
        variant_of_id,
        show_on_explore
      `)
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get cover photos for these routes
    if (routes && routes.length > 0) {
      const routeIds = routes.map(r => r.id);
      const { data: photos } = await supabase
        .from("route_photos")
        .select("route_id, url")
        .in("route_id", routeIds)
        .eq("is_cover", true);

      // Merge cover photos into routes
      const photosMap = new Map(photos?.map(p => [p.route_id, p.url]) || []);
      const routesWithPhotos = routes.map(route => ({
        ...route,
        cover_photo_url: photosMap.get(route.id) || null
      }));

      return NextResponse.json({ routes: routesWithPhotos });
    }

    return NextResponse.json({ routes: routes || [] });
  } catch (error: any) {
    console.error("My routes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

