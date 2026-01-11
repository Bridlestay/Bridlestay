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
    const { lat, lng, name, description, icon_type, photo_url, order_index } = body;

    if (!lat || !lng || !name) {
      return NextResponse.json(
        { error: "Latitude, longitude, and name are required" },
        { status: 400 }
      );
    }

    // Verify route ownership
    const { data: route } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", routeId)
      .single();

    if (!route || route.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: waypoint, error } = await supabase
      .from("route_waypoints")
      .insert({
        route_id: routeId,
        lat,
        lng,
        name,
        description: description || null,
        icon_type: icon_type || "other",
        photo_url: photo_url || null,
        order_index: order_index || 0,
      })
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
