import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Get ALL routes for map display (no pagination)
 * Returns simplified data for map polylines
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch ALL public routes with minimal data for map
    const { data: routes, error } = await supabase
      .from("routes")
      .select(
        `
        id,
        title,
        county,
        difficulty,
        distance_km,
        geometry,
        condition,
        featured,
        avg_rating,
        owner_user_id
      `
      )
      .eq("is_public", true)
      .order("featured", { ascending: false })
      .order("avg_rating", { ascending: false });

    if (error) {
      console.error("[MAP_ROUTES] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      routes: routes || [],
      total: routes?.length || 0,
    });
  } catch (error: any) {
    console.error("[MAP_ROUTES] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch map routes" },
      { status: 500 }
    );
  }
}

