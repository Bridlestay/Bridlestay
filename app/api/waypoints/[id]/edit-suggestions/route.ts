import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/waypoints/[id]/edit-suggestions - Create edit suggestion
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: waypointId } = await params;
    const body = await req.json();

    // Check if waypoint exists and user is NOT the owner
    const { data: waypoint } = await supabase
      .from("route_waypoints")
      .select("route_id, routes!inner(owner_user_id, is_public)")
      .eq("id", waypointId)
      .single();

    if (!waypoint) {
      return NextResponse.json({ error: "Waypoint not found" }, { status: 404 });
    }

    // Check if route is public
    if (!waypoint.routes.is_public) {
      return NextResponse.json({ error: "Cannot suggest edits to private routes" }, { status: 403 });
    }

    // Check if user is the owner (owners can't suggest edits to their own waypoints)
    if (waypoint.routes.owner_user_id === user.id) {
      return NextResponse.json({ error: "Route owners should edit directly, not suggest" }, { status: 403 });
    }

    // Validate that at least one field is being suggested
    const {
      suggested_name,
      suggested_tag,
      suggested_icon_type,
      suggested_description,
      suggested_photos,
      suggestion_comment,
    } = body;

    const hasTextChanges = suggested_name || suggested_tag || suggested_icon_type || suggested_description;
    const hasPhotoChanges = Array.isArray(suggested_photos) && suggested_photos.length > 0;

    if (!hasTextChanges && !hasPhotoChanges) {
      return NextResponse.json({ error: "At least one change must be suggested" }, { status: 400 });
    }

    if (!suggestion_comment || !suggestion_comment.trim()) {
      return NextResponse.json({ error: "Suggestion comment is required" }, { status: 400 });
    }

    // Create edit suggestion
    const insertData: any = {
      waypoint_id: waypointId,
      user_id: user.id,
      suggested_name: suggested_name || null,
      suggested_tag: suggested_tag || null,
      suggested_icon_type: suggested_icon_type || null,
      suggested_description: suggested_description || null,
      suggestion_comment: suggestion_comment.trim(),
      status: "pending",
    };

    if (hasPhotoChanges) {
      insertData.suggested_photos = suggested_photos;
    }

    const { data: suggestion, error } = await supabase
      .from("waypoint_edit_suggestions")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating edit suggestion:", error);
      return NextResponse.json({ error: "Failed to create suggestion" }, { status: 500 });
    }

    return NextResponse.json({ suggestion }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/waypoints/[id]/edit-suggestions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/waypoints/[id]/edit-suggestions - Get all edit suggestions for a waypoint
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: waypointId } = await params;

    // Check if waypoint exists and user is the owner
    const { data: waypoint } = await supabase
      .from("route_waypoints")
      .select("route_id, routes!inner(owner_user_id)")
      .eq("id", waypointId)
      .single();

    if (!waypoint) {
      return NextResponse.json({ error: "Waypoint not found" }, { status: 404 });
    }

    if (waypoint.routes.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Only route owners can view edit suggestions" }, { status: 403 });
    }

    // Get all edit suggestions for this waypoint
    const { data: suggestions, error } = await supabase
      .from("waypoint_edit_suggestions")
      .select("*")
      .eq("waypoint_id", waypointId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching edit suggestions:", error);
      return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }

    // Fetch user info separately (FK points to auth.users, not public.users)
    const userIds = [
      ...new Set(
        (suggestions || []).map((s: any) => s.user_id).filter(Boolean)
      ),
    ];
    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, username, avatar_url")
        .in("id", userIds);
      if (users) {
        for (const u of users) {
          usersMap[u.id] = u;
        }
      }
    }

    // Attach user info to each suggestion
    const enriched = (suggestions || []).map((s: any) => ({
      ...s,
      users: usersMap[s.user_id] || null,
    }));

    return NextResponse.json({ suggestions: enriched }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/waypoints/[id]/edit-suggestions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
