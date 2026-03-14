import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  calculateGeometrySimilarity,
  boundingBoxesOverlap,
} from "@/lib/routes/geometry-similarity";

// POST - Check if a route geometry is similar to existing routes
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { geometry, exclude_route_id } = body;

    if (
      !geometry?.coordinates ||
      !Array.isArray(geometry.coordinates) ||
      geometry.coordinates.length < 2
    ) {
      return NextResponse.json(
        { error: "Valid geometry with coordinates is required" },
        { status: 400 }
      );
    }

    // Get the start point to find nearby routes
    const startCoord = geometry.coordinates[0];
    const startLat = startCoord[1];
    const startLng = startCoord[0];

    // Search radius in degrees (~5km)
    const searchRadius = 0.045;

    // Fetch nearby public routes with geometry
    const { data: nearbyRoutes, error } = await supabase
      .from("routes")
      .select("id, title, geometry, distance_km, created_at, show_on_explore")
      .gte("geometry->coordinates->0->1", startLat - searchRadius)
      .lte("geometry->coordinates->0->1", startLat + searchRadius)
      .gte("geometry->coordinates->0->0", startLng - searchRadius)
      .lte("geometry->coordinates->0->0", startLng + searchRadius)
      .eq("is_public", true)
      .neq("id", exclude_route_id || "00000000-0000-0000-0000-000000000000")
      .limit(50);

    if (error) {
      // JSON path filtering may not work on all Supabase setups
      // Fall back to fetching all public routes and filtering in JS
      console.error(
        "[SIMILARITY] Coordinate filter failed, using fallback:",
        error.message
      );

      const { data: allRoutes, error: fallbackError } = await supabase
        .from("routes")
        .select("id, title, geometry, distance_km, created_at, show_on_explore")
        .eq("is_public", true)
        .neq(
          "id",
          exclude_route_id || "00000000-0000-0000-0000-000000000000"
        )
        .limit(200);

      if (fallbackError) {
        console.error("[SIMILARITY] Fallback error:", fallbackError);
        return NextResponse.json({ matches: [] });
      }

      return processMatches(allRoutes || [], geometry);
    }

    return processMatches(nearbyRoutes || [], geometry);
  } catch (error: any) {
    console.error("[SIMILARITY] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check similarity" },
      { status: 500 }
    );
  }
}

function processMatches(
  routes: any[],
  newGeometry: { coordinates: [number, number][] }
) {
  const THRESHOLD = 65;
  const matches: {
    route_id: string;
    title: string;
    similarity_score: number;
    distance_km: number;
    created_at: string;
    show_on_explore: boolean;
  }[] = [];

  for (const route of routes) {
    if (!route.geometry?.coordinates || route.geometry.coordinates.length < 2) {
      continue;
    }

    // Quick bounding box check to skip distant routes
    if (!boundingBoxesOverlap(newGeometry, route.geometry)) {
      continue;
    }

    // Full similarity calculation
    const score = calculateGeometrySimilarity(newGeometry, route.geometry);

    if (score >= THRESHOLD) {
      matches.push({
        route_id: route.id,
        title: route.title,
        similarity_score: score,
        distance_km: route.distance_km,
        created_at: route.created_at,
        show_on_explore: route.show_on_explore,
      });
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity_score - a.similarity_score);

  return NextResponse.json({
    matches,
    has_match: matches.length > 0,
    best_match: matches[0] || null,
  });
}
