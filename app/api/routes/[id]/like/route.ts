import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

// GET - Check if user has liked a route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ liked: false, likes_count: 0 });
    }

    // Check if user has liked this route
    const { data: like } = await supabase
      .from("route_likes")
      .select("id")
      .eq("route_id", routeId)
      .eq("user_id", user.id)
      .single();

    // Get total likes count
    const { data: route } = await supabase
      .from("routes")
      .select("likes_count")
      .eq("id", routeId)
      .single();

    return NextResponse.json({
      liked: !!like,
      likes_count: route?.likes_count || 0,
    });
  } catch (error: any) {
    console.error("[ROUTE_LIKE_GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Like a route
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Insert like (will fail if already exists due to unique constraint)
    const { error } = await supabase
      .from("route_likes")
      .insert({ route_id: routeId, user_id: user.id });

    if (error) {
      if (error.code === "23505") {
        // Already liked - that's fine
        return NextResponse.json({ liked: true });
      }
      throw error;
    }

    // Notify route owner about the like
    const { data: route } = await supabase
      .from("routes")
      .select("owner_user_id, title")
      .eq("id", routeId)
      .single();

    if (route) {
      const { data: liker } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();

      createNotification({
        userId: route.owner_user_id,
        type: "route_liked",
        title: `${liker?.name || "Someone"} liked your route`,
        body: route.title,
        link: `/routes/${routeId}`,
        actorId: user.id,
      });
    }

    return NextResponse.json({ liked: true });
  } catch (error: any) {
    console.error("[ROUTE_LIKE_POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Unlike a route
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await supabase
      .from("route_likes")
      .delete()
      .eq("route_id", routeId)
      .eq("user_id", user.id);

    return NextResponse.json({ liked: false });
  } catch (error: any) {
    console.error("[ROUTE_LIKE_DELETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

