import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE - Delete a comment (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId, commentId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user owns the comment or is admin
    const { data: comment, error: fetchError } = await supabase
      .from("route_comments")
      .select("user_id")
      .eq("id", commentId)
      .eq("route_id", routeId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check if admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = userData?.role === "admin";

    if (comment.user_id !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: "Not authorized to delete this comment" },
        { status: 403 }
      );
    }

    // Soft delete by setting deleted_at
    const { error: deleteError } = await supabase
      .from("route_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId);

    if (deleteError) {
      console.error("[ROUTE_COMMENT_DELETE] Error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
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
