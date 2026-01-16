import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Get routes near a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: propertyId } = await params;

    // Get routes linked to this property
    const { data: routes, error } = await supabase
      .from("routes")
      .select(
        `
        id,
        title,
        description,
        distance_km,
        difficulty,
        avg_rating,
        review_count,
        terrain_tags,
        route_photos (url, order_index)
      `
      )
      .eq("is_public", true)
      .eq("near_property_id", propertyId)
      .order("avg_rating", { ascending: false })
      .limit(5);

    if (error) {
      console.error("[NEARBY_ROUTES] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ routes: routes || [] });
  } catch (error: any) {
    console.error("[NEARBY_ROUTES] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nearby routes" },
      { status: 500 }
    );
  }
}

