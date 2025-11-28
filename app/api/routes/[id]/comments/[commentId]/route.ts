import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE - Delete/soft delete comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const supabase = await createClient();
    const { id: routeId, commentId } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get comment and route info
    const { data: comment } = await supabase
      .from("route_comments")
      .select("user_id, route_id")
      .eq("id", commentId)
      .single();

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check if user owns comment or owns the route
    const { data: route } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", routeId)
      .single();

    const canDelete = comment.user_id === user.id || route?.owner_user_id === user.id;

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete (mark as deleted)
    const { error } = await supabase
      .from("route_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId);

    if (error) {
      console.error("[ROUTE_COMMENT_DELETE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ROUTE_COMMENT_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}



