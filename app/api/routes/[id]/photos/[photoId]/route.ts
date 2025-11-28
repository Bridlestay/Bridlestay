import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE - Delete photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  try {
    const supabase = await createClient();
    const { id: routeId, photoId } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check route ownership
    const { data: route } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", routeId)
      .single();

    if (!route || route.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete photo
    const { error } = await supabase
      .from("route_photos")
      .delete()
      .eq("id", photoId)
      .eq("route_id", routeId);

    if (error) {
      console.error("[ROUTE_PHOTO_DELETE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ROUTE_PHOTO_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}



