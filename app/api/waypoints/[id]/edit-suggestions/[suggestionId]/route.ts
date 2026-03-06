import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/waypoints/[id]/edit-suggestions/[suggestionId] - Approve or reject suggestion
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; suggestionId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const waypointId = params.id;
    const suggestionId = params.suggestionId;
    const body = await req.json();
    // action: "approve" | "reject" | "approve_photos"
    const { action, rejection_reason } = body;

    if (!action || !["approve", "reject", "approve_photos"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "reject" && !rejection_reason?.trim()) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Only route owners can approve/reject suggestions" }, { status: 403 });
    }

    // Get the suggestion
    const { data: suggestion, error: fetchError } = await supabase
      .from("waypoint_edit_suggestions")
      .select("*")
      .eq("id", suggestionId)
      .eq("waypoint_id", waypointId)
      .single();

    if (fetchError || !suggestion) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    if (suggestion.status !== "pending") {
      return NextResponse.json({ error: "Suggestion has already been reviewed" }, { status: 400 });
    }

    if (action === "approve" || action === "approve_photos") {
      // Apply text changes (only for full approve)
      if (action === "approve") {
        const updates: any = {};
        if (suggestion.suggested_name !== null) updates.name = suggestion.suggested_name;
        if (suggestion.suggested_tag !== null) updates.tag = suggestion.suggested_tag;
        if (suggestion.suggested_icon_type !== null) updates.icon_type = suggestion.suggested_icon_type;
        if (suggestion.suggested_description !== null) updates.description = suggestion.suggested_description;

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from("route_waypoints")
            .update(updates)
            .eq("id", waypointId);

          if (updateError) {
            console.error("Error updating waypoint:", updateError);
            return NextResponse.json({ error: "Failed to apply changes" }, { status: 500 });
          }
        }
      }

      // Apply photo additions (for both approve and approve_photos)
      const suggestedPhotos = suggestion.suggested_photos as any[] | null;
      if (Array.isArray(suggestedPhotos) && suggestedPhotos.length > 0) {
        const serviceClient = createServiceClient();
        const photoInserts = suggestedPhotos
          .filter((p: any) => p.action === "add" && p.url)
          .map((p: any) => ({
            waypoint_id: waypointId,
            route_id: waypoint.route_id,
            user_id: suggestion.user_id,
            url: p.url,
            caption: p.caption || null,
          }));

        if (photoInserts.length > 0) {
          const { error: photoError } = await serviceClient
            .from("waypoint_photos")
            .insert(photoInserts);

          if (photoError) {
            console.error("Error inserting suggested photos:", photoError);
            return NextResponse.json({ error: "Failed to add suggested photos" }, { status: 500 });
          }
        }
      }

      // Mark suggestion as approved
      const { error: approveError } = await supabase
        .from("waypoint_edit_suggestions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by_user_id: user.id,
        })
        .eq("id", suggestionId);

      if (approveError) {
        console.error("Error approving suggestion:", approveError);
        return NextResponse.json({ error: "Failed to approve suggestion" }, { status: 500 });
      }

      const msg = action === "approve_photos"
        ? "Photos accepted"
        : "Suggestion approved and changes applied";
      return NextResponse.json({ message: msg }, { status: 200 });
    } else {
      // Reject the suggestion
      const { error: rejectError } = await supabase
        .from("waypoint_edit_suggestions")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by_user_id: user.id,
          rejection_reason: rejection_reason.trim(),
        })
        .eq("id", suggestionId);

      if (rejectError) {
        console.error("Error rejecting suggestion:", rejectError);
        return NextResponse.json({ error: "Failed to reject suggestion" }, { status: 500 });
      }

      return NextResponse.json({ message: "Suggestion rejected" }, { status: 200 });
    }
  } catch (error) {
    console.error("Error in PATCH /api/waypoints/[id]/edit-suggestions/[suggestionId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
