import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Get comments for a route
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const routeId = searchParams.get("routeId");

    if (!routeId) {
      return NextResponse.json(
        { error: "Route ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: comments, error } = await supabase
      .from("route_point_comments")
      .select(`
        id,
        lat,
        lng,
        content,
        image_url,
        created_at,
        user:user_id (
          id,
          name,
          avatar_url
        )
      `)
      .eq("route_id", routeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ROUTE_COMMENTS] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: comments || [] });
  } catch (error: any) {
    console.error("[ROUTE_COMMENTS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

/**
 * Add a comment to a route at a specific point
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const routeId = formData.get("routeId") as string;
    const lat = parseFloat(formData.get("lat") as string);
    const lng = parseFloat(formData.get("lng") as string);
    const content = formData.get("content") as string;
    const imageFile = formData.get("image") as File | null;

    if (!routeId || isNaN(lat) || isNaN(lng) || !content?.trim()) {
      return NextResponse.json(
        { error: "Route ID, coordinates, and content are required" },
        { status: 400 }
      );
    }

    // Verify route exists and is public
    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("id, visibility")
      .eq("id", routeId)
      .single();

    if (routeError || !route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    if (route.visibility !== "public") {
      return NextResponse.json(
        { error: "Can only comment on public routes" },
        { status: 403 }
      );
    }

    let imageUrl: string | null = null;

    // Upload image if provided
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${routeId}/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("route-comments")
        .upload(fileName, imageFile, {
          contentType: imageFile.type,
          cacheControl: "3600",
        });

      if (uploadError) {
        console.error("[ROUTE_COMMENTS] Upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 }
        );
      }

      const { data: urlData } = supabase.storage
        .from("route-comments")
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from("route_point_comments")
      .insert({
        route_id: routeId,
        user_id: user.id,
        lat,
        lng,
        content: content.trim(),
        image_url: imageUrl,
      })
      .select(`
        id,
        lat,
        lng,
        content,
        image_url,
        created_at,
        user:user_id (
          id,
          name,
          avatar_url
        )
      `)
      .single();

    if (insertError) {
      console.error("[ROUTE_COMMENTS] Insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ comment });
  } catch (error: any) {
    console.error("[ROUTE_COMMENTS] Error:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}

/**
 * Delete a comment
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400 }
      );
    }

    // Get comment to check ownership and get image path
    const { data: comment, error: fetchError } = await supabase
      .from("route_point_comments")
      .select("id, user_id, image_url")
      .eq("id", commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    // Delete image from storage if exists
    if (comment.image_url) {
      const urlParts = comment.image_url.split("/route-comments/");
      if (urlParts.length > 1) {
        await supabase.storage.from("route-comments").remove([urlParts[1]]);
      }
    }

    // Delete comment
    const { error: deleteError } = await supabase
      .from("route_point_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      console.error("[ROUTE_COMMENTS] Delete error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ROUTE_COMMENTS] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}

