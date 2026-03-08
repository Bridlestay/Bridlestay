import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { moderateComment } from "@/lib/routes/moderation";
import { createNotification } from "@/lib/notifications";

// GET - Get comments for a route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    // Fetch comments with nested replies
    const { data: comments, error } = await supabase
      .from("route_comments")
      .select(
        `
        *,
        user:users!user_id (id, name, avatar_url, admin_verified),
        replies:route_comments!parent_comment_id (
          *,
          user:users!user_id (id, name, avatar_url, admin_verified)
        )
      `
      )
      .eq("route_id", routeId)
      .is("parent_comment_id", null) // Only top-level comments
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ROUTE_COMMENTS_GET] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: comments || [] });
  } catch (error: any) {
    console.error("[ROUTE_COMMENTS_GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST - Add comment to route
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();
    const { id: routeId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { body: commentBody, parent_comment_id } = body;

    if (!commentBody || commentBody.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment body required" },
        { status: 400 }
      );
    }

    // Moderate comment
    const moderation = moderateComment(commentBody);

    // Insert comment
    const { data: comment, error } = await supabase
      .from("route_comments")
      .insert({
        route_id: routeId,
        user_id: user.id,
        parent_comment_id: parent_comment_id || null,
        body: commentBody,
        flagged: moderation.flagged,
        blocked: moderation.blocked,
      })
      .select(
        `
        *,
        user:users!user_id (id, name, avatar_url, admin_verified)
      `
      )
      .single();

    if (error) {
      console.error("[ROUTE_COMMENT_CREATE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If flagged, create flag record using service client
    if (moderation.flagged) {
      await serviceSupabase.from("route_comment_flags").insert({
        comment_id: comment.id,
        flagged_by_user_id: null, // System flagged
        reason: moderation.reason,
        severity: moderation.severity,
      });
    }

    // Notify route owner about the comment
    if (!moderation.blocked) {
      const { data: route } = await supabase
        .from("routes")
        .select("owner_user_id, title")
        .eq("id", routeId)
        .single();

      if (route) {
        const commenterName = comment.user?.name || "Someone";

        if (parent_comment_id) {
          // Reply — notify the parent comment author
          const { data: parentComment } = await supabase
            .from("route_comments")
            .select("user_id")
            .eq("id", parent_comment_id)
            .single();

          if (parentComment) {
            createNotification({
              userId: parentComment.user_id,
              type: "route_comment",
              title: `${commenterName} replied to your comment`,
              body: commentBody.length > 100
                ? commentBody.slice(0, 100) + "..."
                : commentBody,
              link: `/routes/${routeId}`,
              actorId: user.id,
            });
          }
        }

        // Also notify route owner (if different from commenter and parent author)
        createNotification({
          userId: route.owner_user_id,
          type: "route_comment",
          title: `${commenterName} commented on your route`,
          body: route.title,
          link: `/routes/${routeId}`,
          actorId: user.id,
        });
      }
    }

    return NextResponse.json({ comment, moderation }, { status: 201 });
  } catch (error: any) {
    console.error("[ROUTE_COMMENT_CREATE] Error:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}



