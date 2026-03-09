import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { calculateDistanceFromGeometry, validateGeometry } from "@/lib/routes/gpx-converter";

// Service role client for admin operations (bypasses RLS)
function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  
  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

// GET - Get single route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Use explicit FK hint for route_photos due to ambiguous relationship (cover_photo_id FK)
    const { data: route, error } = await supabase
      .from("routes")
      .select(
        `
        *,
        route_photos!route_photos_route_id_fkey (id, url, caption, order_index, created_at),
        route_waypoints (id, lat, lng, order_index, snapped, snapped_to_path_type, created_at)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("[ROUTE_GET] Error:", error);
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Fetch owner info separately if owner_user_id exists
    let owner = null;
    if (route.owner_user_id) {
      const { data: ownerData } = await supabase
        .from("users")
        .select("id, name, avatar_url, admin_verified")
        .eq("id", route.owner_user_id)
        .single();
      owner = ownerData;
    }

    return NextResponse.json({ route: { ...route, owner } });
  } catch (error: any) {
    console.error("[ROUTE_GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch route" },
      { status: 500 }
    );
  }
}

// PATCH - Update route
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership or admin status
    const { data: existingRoute } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", id)
      .single();

    if (!existingRoute) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Check if admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    const isAdmin = userData?.role === "admin";
    const isOwner = existingRoute.owner_user_id === user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updates: any = {};

    // Only update provided fields
    if (body.title) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.county) updates.county = body.county;
    if (body.terrain_tags) updates.terrain_tags = body.terrain_tags;
    
    if (body.difficulty !== undefined) {
      updates.difficulty = body.difficulty;
    }
    
    if (body.seasonal_notes !== undefined) updates.seasonal_notes = body.seasonal_notes;
    if (body.surface) updates.surface = body.surface;
    if (body.is_public !== undefined) updates.is_public = body.is_public;
    if (body.featured !== undefined) updates.featured = body.featured;
    if (body.near_property_id !== undefined) updates.near_property_id = body.near_property_id;
    if (body.visibility !== undefined) updates.visibility = body.visibility;
    if (body.route_type !== undefined) updates.route_type = body.route_type;
    if (body.estimated_time_minutes !== undefined) updates.estimated_time_minutes = body.estimated_time_minutes;

    // If geometry is updated, recalculate distance
    if (body.geometry) {
      if (!validateGeometry(body.geometry)) {
        return NextResponse.json(
          { error: "Invalid route geometry" },
          { status: 400 }
        );
      }
      updates.geometry = body.geometry;
      updates.distance_km = body.distance_km || calculateDistanceFromGeometry(body.geometry);
    }

    const { data: route, error } = await supabase
      .from("routes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[ROUTE_UPDATE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ route });
  } catch (error: any) {
    console.error("[ROUTE_UPDATE] Error:", error);
    return NextResponse.json(
      { error: "Failed to update route" },
      { status: 500 }
    );
  }
}

// DELETE - Delete route
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership or admin status
    const { data: existingRoute, error: routeError } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", id)
      .single();

    if (routeError) {
      console.error("[ROUTE_DELETE] Route fetch error:", routeError);
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Check if admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    const isAdmin = userData?.role === "admin";
    const isOwner = existingRoute?.owner_user_id === user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use the database function for reliable deletion with longer timeout
    const adminSupabase = getAdminSupabase();
    
    const { data, error } = await adminSupabase.rpc("delete_route_cascade", {
      route_uuid: id,
    });

    if (error) {
      console.error("[ROUTE_DELETE] RPC error:", error);
      
      // Fallback: try manual deletion if function doesn't exist
      if (error.message.includes("function") || error.code === "42883") {
        console.log("[ROUTE_DELETE] Trying fallback deletion...");
        
        // Delete related records in parallel
        await Promise.all([
          adminSupabase.from("route_comments").delete().eq("route_id", id),
          adminSupabase.from("route_photos").delete().eq("route_id", id),
          adminSupabase.from("route_waypoints").delete().eq("route_id", id),
          adminSupabase.from("route_likes").delete().eq("route_id", id),
          adminSupabase.from("route_favorites").delete().eq("route_id", id),
          adminSupabase.from("route_hazards").delete().eq("route_id", id),
          adminSupabase.from("route_shares").delete().eq("route_id", id),
          adminSupabase.from("route_completions").delete().eq("route_id", id),
        ]);

        const { error: deleteError } = await adminSupabase.from("routes").delete().eq("id", id);
        
        if (deleteError) {
          console.error("[ROUTE_DELETE] Fallback delete error:", deleteError);
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
        
        return NextResponse.json({ success: true });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data === false) {
      return NextResponse.json({ error: "Failed to delete route" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ROUTE_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete route" },
      { status: 500 }
    );
  }
}



