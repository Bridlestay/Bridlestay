import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const routeId = id;

    const { data: waypoints, error } = await supabase
      .from("route_waypoints")
      .select("*")
      .eq("route_id", routeId)
      .order("order_index");

    if (error) throw error;

    return NextResponse.json({ waypoints: waypoints || [] });
  } catch (error: any) {
    console.error("Error fetching waypoints:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch waypoints" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const routeId = id;
    const body = await request.json();
    const { lat, lng, name, description, icon_type, photo_url, order_index, snapped, snapped_to_path_type } = body;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Verify route exists and is accessible (any authenticated user can add waypoints)
    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("id, owner_user_id")
      .eq("id", routeId)
      .single();

    if (routeError || !route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }
    
    // Any authenticated user can add waypoints to help others navigate

    // Build insert object with only provided fields
    const insertData: any = {
      route_id: routeId,
      lat,
      lng,
      order_index: order_index || 0,
      created_by_user_id: user.id, // Track who created this waypoint
    };
    
    // Only add optional fields if provided (these columns may or may not exist)
    if (name !== undefined) insertData.name = name;
    if (description !== undefined) insertData.description = description;
    if (icon_type !== undefined) insertData.icon_type = icon_type;
    if (photo_url !== undefined) insertData.photo_url = photo_url;
    if (snapped !== undefined) insertData.snapped = snapped;
    if (snapped_to_path_type !== undefined) insertData.snapped_to_path_type = snapped_to_path_type;

    const { data: waypoint, error } = await supabase
      .from("route_waypoints")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ waypoint });
  } catch (error: any) {
    console.error("Error creating waypoint:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create waypoint" },
      { status: 500 }
    );
  }
}
