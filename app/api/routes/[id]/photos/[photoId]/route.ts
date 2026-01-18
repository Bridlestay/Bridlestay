import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE - Delete a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId, photoId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user owns the route
    const { data: route } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", routeId)
      .single();

    if (!route || route.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("route_photos")
      .delete()
      .eq("id", photoId)
      .eq("route_id", routeId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ROUTE_PHOTO_DELETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update photo caption
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId, photoId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user owns the route
    const { data: route } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", routeId)
      .single();

    if (!route || route.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { caption, order_index } = body;

    const updates: any = {};
    if (caption !== undefined) updates.caption = caption;
    if (order_index !== undefined) updates.order_index = order_index;

    const { data: photo, error } = await supabase
      .from("route_photos")
      .update(updates)
      .eq("id", photoId)
      .eq("route_id", routeId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ photo });
  } catch (error: any) {
    console.error("[ROUTE_PHOTO_PATCH] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
