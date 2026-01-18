import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Get user's favorite routes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: favorites, error } = await supabase
      .from("route_favorites")
      .select(`
        id,
        created_at,
        route:routes(
          id,
          title,
          description,
          county,
          distance_km,
          difficulty,
          avg_rating,
          review_count,
          likes_count,
          owner_user_id,
          route_photos(url)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Flatten the response
    const routes = favorites?.map((f) => ({
      ...f.route,
      favorited_at: f.created_at,
    })) || [];

    return NextResponse.json({ routes });
  } catch (error: any) {
    console.error("[USER_FAVORITES_GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

