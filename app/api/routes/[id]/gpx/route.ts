import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { convertToGPX } from "@/lib/routes/gpx-converter";

// GET - Download route as GPX file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Fetch route with waypoints
    const { data: route, error } = await supabase
      .from("routes")
      .select(
        `
        *,
        route_waypoints (lat, lng, name, description, order_index)
      `
      )
      .eq("id", id)
      .single();

    if (error || !route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Check if route is public or user owns it
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!route.is_public && (!user || route.owner_user_id !== user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Convert waypoints to simpler format
    const waypoints = (route.route_waypoints || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((wp: any) => ({
        lat: wp.lat,
        lng: wp.lng,
        name: wp.name,
        description: wp.description,
      }));

    // Generate GPX
    const gpxContent = convertToGPX({
      title: route.title,
      description: route.description,
      geometry: route.geometry,
      waypoints,
    });

    // Return as downloadable file
    const filename = `${route.title.replace(/[^a-z0-9]/gi, "_")}.gpx`;

    return new NextResponse(gpxContent, {
      headers: {
        "Content-Type": "application/gpx+xml",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[ROUTE_GPX] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate GPX" },
      { status: 500 }
    );
  }
}



