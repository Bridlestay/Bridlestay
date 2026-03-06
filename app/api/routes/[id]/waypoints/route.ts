import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const routeId = id;

    const { data: waypoints, error } = await supabase
      .from("route_waypoints")
      .select("*, waypoint_photos(id, url, caption, created_at)")
      .eq("route_id", routeId)
      .order("order_index");

    if (error) throw error;

    // Check if current user is the route owner (for suggestion counts)
    let isOwner = false;
    let suggestionCounts: Record<string, number> = {};
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && waypoints && waypoints.length > 0) {
      const { data: route } = await supabase
        .from("routes")
        .select("owner_user_id")
        .eq("id", routeId)
        .single();

      if (route?.owner_user_id === user.id) {
        isOwner = true;
        // Batch count pending edit suggestions for all waypoints
        const wpIds = waypoints.map((wp: any) => wp.id);
        const { data: counts } = await supabase
          .from("waypoint_edit_suggestions")
          .select("waypoint_id")
          .in("waypoint_id", wpIds)
          .eq("status", "pending");

        if (counts) {
          for (const row of counts) {
            suggestionCounts[row.waypoint_id] =
              (suggestionCounts[row.waypoint_id] || 0) + 1;
          }
        }
      }
    }

    // Enrich with community photo counts and previews
    const enriched = (waypoints || []).map((wp: any) => {
      const communityPhotos = (wp.waypoint_photos || [])
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
        .slice(0, 3);

      const { waypoint_photos: _raw, ...rest } = wp;
      const photoList = communityPhotos.map((p: any) => ({
        id: p.id,
        url: p.url,
        caption: p.caption,
      }));
      return {
        ...rest,
        photo_count: (wp.waypoint_photos || []).length,
        community_photos: photoList,
        photos: photoList,
        ...(isOwner && suggestionCounts[wp.id]
          ? { pending_suggestions_count: suggestionCounts[wp.id] }
          : {}),
      };
    });

    return NextResponse.json({ waypoints: enriched });
  } catch (error: any) {
    console.error("Error fetching waypoints:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch waypoints" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const routeId = id;
    const body = await request.json();
    const { lat, lng, name, description, icon_type, photo_url, order_index, snapped, snapped_to_path_type } = body;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Verify route exists and is accessible (any authenticated user can add waypoints)
    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("id, owner_user_id")
      .eq("id", routeId)
      .single();

    if (routeError || !route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }
    
    // Any authenticated user can add waypoints to help others navigate

    // Build insert object with only provided fields
    const insertData: any = {
      route_id: routeId,
      lat,
      lng,
      order_index: order_index || 0,
      created_by_user_id: user.id, // Track who created this waypoint
    };
    
    // Only add optional fields if provided (these columns may or may not exist)
    if (name !== undefined) insertData.name = name;
    if (description !== undefined) insertData.description = description;
    if (icon_type !== undefined) insertData.icon_type = icon_type;
    if (photo_url !== undefined) insertData.photo_url = photo_url;
    if (snapped !== undefined) insertData.snapped = snapped;
    if (snapped_to_path_type !== undefined) insertData.snapped_to_path_type = snapped_to_path_type;
    if (body.tag !== undefined) insertData.tag = body.tag;

    const { data: waypoint, error } = await supabase
      .from("route_waypoints")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ waypoint });
  } catch (error: any) {
    console.error("Error creating waypoint:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create waypoint" },
      { status: 500 }
    );
  }
}
