import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST - Report a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId, commentId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reason, details } = body;

    if (!reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    // Check if comment exists
    const { data: comment, error: commentError } = await supabase
      .from("route_comments")
      .select("id, route_id")
      .eq("id", commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Insert report
    const { data: report, error } = await supabase
      .from("route_comment_reports")
      .insert({
        comment_id: commentId,
        reported_by_user_id: user.id,
        reason,
        details: details || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You have already reported this comment" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ report, message: "Comment reported successfully" });
  } catch (error: any) {
    console.error("[ROUTE_COMMENT_REPORT] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

