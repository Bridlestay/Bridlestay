import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { calculateDistanceFromGeometry, validateGeometry } from "@/lib/routes/gpx-converter";

// GET - Get single route
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    const { data: route, error } = await supabase
      .from("routes")
      .select(
        `
        *,
        route_photos (id, url, caption, order_index, created_at),
        route_waypoints (id, lat, lng, name, description, icon_type, photo_url, order_index),
        owner:users!owner_user_id (id, name, avatar_url, admin_verified)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("[ROUTE_GET] Error:", error);
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    return NextResponse.json({ route });
  } catch (error: any) {
    console.error("[ROUTE_GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch route" },
      { status: 500 }
    );
  }
}

// PATCH - Update route
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: existingRoute } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", id)
      .single();

    if (!existingRoute || existingRoute.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updates: any = {};

    // Only update provided fields
    if (body.title) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.county) updates.county = body.county;
    if (body.terrain_tags) updates.terrain_tags = body.terrain_tags;
    if (body.difficulty) updates.difficulty = body.difficulty;
    if (body.seasonal_notes !== undefined) updates.seasonal_notes = body.seasonal_notes;
    if (body.surface) updates.surface = body.surface;
    if (body.is_public !== undefined) updates.is_public = body.is_public;
    if (body.featured !== undefined) updates.featured = body.featured;
    if (body.near_property_id !== undefined) updates.near_property_id = body.near_property_id;

    // If geometry is updated, recalculate distance
    if (body.geometry) {
      if (!validateGeometry(body.geometry)) {
        return NextResponse.json(
          { error: "Invalid route geometry" },
          { status: 400 }
        );
      }
      updates.geometry = body.geometry;
      updates.distance_km = calculateDistanceFromGeometry(body.geometry);
    }

    const { data: route, error } = await supabase
      .from("routes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[ROUTE_UPDATE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ route });
  } catch (error: any) {
    console.error("[ROUTE_UPDATE] Error:", error);
    return NextResponse.json(
      { error: "Failed to update route" },
      { status: 500 }
    );
  }
}

// DELETE - Delete route
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: existingRoute } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", id)
      .single();

    if (!existingRoute || existingRoute.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("routes").delete().eq("id", id);

    if (error) {
      console.error("[ROUTE_DELETE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ROUTE_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete route" },
      { status: 500 }
    );
  }
}



