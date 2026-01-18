import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Check if user has favorited a route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ favorited: false });
    }

    const { data: favorite } = await supabase
      .from("route_favorites")
      .select("id")
      .eq("route_id", routeId)
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({ favorited: !!favorite });
  } catch (error: any) {
    console.error("[ROUTE_FAVORITE_GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Favorite a route
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

    const { error } = await supabase
      .from("route_favorites")
      .insert({ route_id: routeId, user_id: user.id });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ favorited: true });
      }
      throw error;
    }

    return NextResponse.json({ favorited: true });
  } catch (error: any) {
    console.error("[ROUTE_FAVORITE_POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove from favorites
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
      .from("route_favorites")
      .delete()
      .eq("route_id", routeId)
      .eq("user_id", user.id);

    return NextResponse.json({ favorited: false });
  } catch (error: any) {
    console.error("[ROUTE_FAVORITE_DELETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

