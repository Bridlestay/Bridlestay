import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/notifications";

// GET - List waypoint suggestions for a route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const { data: suggestions, error } = await supabase
      .from("waypoint_suggestions")
      .select(`
        *,
        user:users!waypoint_suggestions_user_id_fkey(id, name, avatar_url)
      `)
      .eq("route_id", routeId)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ suggestions: suggestions || [] });
  } catch (error: any) {
    console.error("[WAYPOINT_SUGGESTIONS_GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}

// POST - Create a new waypoint suggestion
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

    const { id: routeId } = await params;
    const body = await request.json();
    const { lat, lng, name, tag, icon_type, description } = body;

    if (!lat || !lng || !name?.trim()) {
      return NextResponse.json(
        { error: "Latitude, longitude, and name are required" },
        { status: 400 }
      );
    }

    // Verify route exists and is public
    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("id, owner_user_id, title")
      .eq("id", routeId)
      .eq("is_public", true)
      .single();

    if (routeError || !route) {
      return NextResponse.json(
        { error: "Route not found or not public" },
        { status: 404 }
      );
    }

    // Don't allow owners to suggest on their own routes
    if (route.owner_user_id === user.id) {
      return NextResponse.json(
        { error: "Route owners should add waypoints directly, not as suggestions" },
        { status: 400 }
      );
    }

    // Create suggestion
    const { data: suggestion, error } = await supabase
      .from("waypoint_suggestions")
      .insert({
        route_id: routeId,
        user_id: user.id,
        lat,
        lng,
        name: name.trim(),
        tag: tag || "note",
        icon_type: icon_type || null,
        description: description?.trim() || null,
        status: "pending",
      })
      .select(
        `
        *,
        user:users!waypoint_suggestions_user_id_fkey(id, name, avatar_url)
      `
      )
      .single();

    if (error) throw error;

    // Send in-app notification to route owner
    await createNotification({
      userId: route.owner_user_id,
      type: "suggestion_received",
      title: `${user.user_metadata?.name || "Someone"} suggested a new waypoint on your route`,
      body: `"${name.trim()}" was suggested for "${route.title}"`,
      link: `/routes/${routeId}`,
      actorId: user.id,
    });

    return NextResponse.json({ suggestion }, { status: 201 });
  } catch (error: any) {
    console.error("[WAYPOINT_SUGGESTIONS_POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create suggestion" },
      { status: 500 }
    );
  }
}
