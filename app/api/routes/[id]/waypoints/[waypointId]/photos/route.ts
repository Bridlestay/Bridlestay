import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

// GET - Get photos for a waypoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; waypointId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId, waypointId } = await params;

    const { data: photos, error } = await supabase
      .from("waypoint_photos")
      .select(
        `
        *,
        user:users!waypoint_photos_user_id_fkey(id, name, avatar_url)
      `
      )
      .eq("waypoint_id", waypointId)
      .eq("route_id", routeId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ photos: photos || [] });
  } catch (error: any) {
    console.error("[WAYPOINT_PHOTOS_GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Upload a photo to a waypoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; waypointId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId, waypointId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify waypoint exists and belongs to route
    const { data: waypoint, error: wpError } = await supabase
      .from("route_waypoints")
      .select("id")
      .eq("id", waypointId)
      .eq("route_id", routeId)
      .single();

    if (wpError || !waypoint) {
      return NextResponse.json(
        { error: "Waypoint not found" },
        { status: 404 }
      );
    }

    // Route owner can always upload photos to their waypoints
    const { data: route } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", routeId)
      .single();

    const isRouteOwner = route?.owner_user_id === user.id;

    if (!isRouteOwner) {
      // Non-owners must have completed the route to upload community photos
      const { data: completion } = await supabase
        .from("route_completions")
        .select("id")
        .eq("route_id", routeId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!completion) {
        return NextResponse.json(
          {
            error:
              "You must complete this route before adding photos. Mark the route as completed first!",
          },
          { status: 403 }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage (reuse route-photos bucket)
    const fileExt = file.name.split(".").pop();
    const fileName = `${routeId}/waypoints/${waypointId}/${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("route-photos")
      .upload(fileName, file);

    if (uploadError) {
      console.error("[WAYPOINT_PHOTOS_UPLOAD] Error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("route-photos").getPublicUrl(fileName);

    // Use service client for DB insert (bypasses RLS)
    const serviceClient = createServiceClient();

    const { data: photo, error } = await serviceClient
      .from("waypoint_photos")
      .insert({
        waypoint_id: waypointId,
        route_id: routeId,
        user_id: user.id,
        url: publicUrl,
        caption: (formData.get("caption") as string) || null,
      })
      .select(
        `
        *,
        user:users!waypoint_photos_user_id_fkey(id, name, avatar_url)
      `
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error: any) {
    console.error("[WAYPOINT_PHOTOS_POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a waypoint photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; waypointId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId, waypointId } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json(
        { error: "Photo ID required" },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Try deleting as the photo owner first
    const { data: deleted, error: deleteError } = await serviceClient
      .from("waypoint_photos")
      .delete()
      .eq("id", photoId)
      .eq("user_id", user.id)
      .select();

    if (deleteError) throw deleteError;

    // If nothing deleted, check if user is route owner or admin
    if (!deleted || deleted.length === 0) {
      const { data: route } = await supabase
        .from("routes")
        .select("owner_user_id")
        .eq("id", routeId)
        .single();

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      const isOwnerOrAdmin =
        route?.owner_user_id === user.id || userData?.role === "admin";

      if (!isOwnerOrAdmin) {
        return NextResponse.json(
          { error: "Photo not found or not yours" },
          { status: 404 }
        );
      }

      // Admin/owner can delete any photo
      const { error: adminDeleteError } = await serviceClient
        .from("waypoint_photos")
        .delete()
        .eq("id", photoId)
        .eq("waypoint_id", waypointId);

      if (adminDeleteError) throw adminDeleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[WAYPOINT_PHOTOS_DELETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
