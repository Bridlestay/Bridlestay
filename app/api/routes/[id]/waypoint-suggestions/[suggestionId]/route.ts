import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// PATCH - Approve or reject a waypoint suggestion
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; suggestionId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: routeId, suggestionId } = await params;
    const body = await request.json();
    const { action, rejection_reason } = body; // action: 'approve' | 'reject'

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Verify user owns the route
    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("id, owner_user_id")
      .eq("id", routeId)
      .single();

    if (routeError || !route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    if (route.owner_user_id !== user.id) {
      return NextResponse.json(
        { error: "Only route owner can approve/reject suggestions" },
        { status: 403 }
      );
    }

    // Fetch the suggestion
    const { data: suggestion, error: suggestionError } = await supabase
      .from("waypoint_suggestions")
      .select("*")
      .eq("id", suggestionId)
      .eq("route_id", routeId)
      .single();

    if (suggestionError || !suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    if (suggestion.status !== "pending") {
      return NextResponse.json(
        { error: `Suggestion already ${suggestion.status}` },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    if (action === "approve") {
      // Get current waypoint count for order_index
      const { data: existingWaypoints } = await supabase
        .from("route_waypoints")
        .select("order_index")
        .eq("route_id", routeId)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrderIndex =
        existingWaypoints && existingWaypoints.length > 0
          ? (existingWaypoints[0].order_index || 0) + 1
          : 0;

      // Create waypoint from suggestion
      const { data: waypoint, error: waypointError } = await serviceClient
        .from("route_waypoints")
        .insert({
          route_id: routeId,
          lat: suggestion.lat,
          lng: suggestion.lng,
          name: suggestion.name,
          tag: suggestion.tag,
          icon_type: suggestion.icon_type,
          description: suggestion.description,
          order_index: nextOrderIndex,
          created_by_user_id: suggestion.user_id, // Track original suggester
        })
        .select()
        .single();

      if (waypointError) throw waypointError;

      // Mark suggestion as approved
      const { error: updateError } = await serviceClient
        .from("waypoint_suggestions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by_user_id: user.id,
        })
        .eq("id", suggestionId);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        action: "approved",
        waypoint,
      });
    } else {
      // Reject suggestion
      const { error: updateError } = await serviceClient
        .from("waypoint_suggestions")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by_user_id: user.id,
          rejection_reason: rejection_reason || null,
        })
        .eq("id", suggestionId);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        action: "rejected",
      });
    }
  } catch (error: any) {
    console.error("[SUGGESTION_APPROVE_REJECT] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process suggestion" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a suggestion (owner or suggester can delete pending suggestions)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; suggestionId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: routeId, suggestionId } = await params;

    // Fetch suggestion to check ownership
    const { data: suggestion, error: suggestionError } = await supabase
      .from("waypoint_suggestions")
      .select("*, routes!inner(owner_user_id)")
      .eq("id", suggestionId)
      .eq("route_id", routeId)
      .single();

    if (suggestionError || !suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    // Allow deletion if user is suggester or route owner
    const isOwner = suggestion.routes.owner_user_id === user.id;
    const isSuggester = suggestion.user_id === user.id;

    if (!isOwner && !isSuggester) {
      return NextResponse.json(
        { error: "Not authorized to delete this suggestion" },
        { status: 403 }
      );
    }

    const serviceClient = createServiceClient();
    const { error: deleteError } = await serviceClient
      .from("waypoint_suggestions")
      .delete()
      .eq("id", suggestionId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[SUGGESTION_DELETE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete suggestion" },
      { status: 500 }
    );
  }
}
