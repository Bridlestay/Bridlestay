import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH - Update waypoint
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; waypointId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId, waypointId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check route ownership
    const { data: route } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", routeId)
      .single();

    if (!route || route.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updates: any = {};

    if (body.name) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.icon_type) updates.icon_type = body.icon_type;
    if (body.photo_url !== undefined) updates.photo_url = body.photo_url;
    if (body.tag) updates.tag = body.tag;

    const { data: waypoint, error } = await supabase
      .from("route_waypoints")
      .update(updates)
      .eq("id", waypointId)
      .eq("route_id", routeId)
      .select()
      .single();

    if (error) {
      console.error("[ROUTE_WAYPOINT_UPDATE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ waypoint });
  } catch (error: any) {
    console.error("[ROUTE_WAYPOINT_UPDATE] Error:", error);
    return NextResponse.json(
      { error: "Failed to update waypoint" },
      { status: 500 }
    );
  }
}

// DELETE - Delete waypoint
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; waypointId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId, waypointId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check route ownership
    const { data: route } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", routeId)
      .single();

    if (!route || route.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("route_waypoints")
      .delete()
      .eq("id", waypointId)
      .eq("route_id", routeId);

    if (error) {
      console.error("[ROUTE_WAYPOINT_DELETE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ROUTE_WAYPOINT_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete waypoint" },
      { status: 500 }
    );
  }
}



