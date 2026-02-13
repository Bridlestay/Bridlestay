import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Haversine distance between two points in km
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Sample N evenly-spaced indices from an array
function sampleIndices(total: number, maxSamples: number): number[] {
  if (total <= maxSamples) return Array.from({ length: total }, (_, i) => i);
  const indices: number[] = [0];
  const step = (total - 1) / (maxSamples - 1);
  for (let i = 1; i < maxSamples - 1; i++) {
    indices.push(Math.round(i * step));
  }
  indices.push(total - 1);
  return indices;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    // Parse optional waypoint coordinates from query string
    const url = new URL(request.url);
    const waypointParam = url.searchParams.get("waypoints");

    // Fetch route geometry
    const { data: route, error } = await supabase
      .from("routes")
      .select("geometry, distance_km, elevation_gain_m, elevation_loss_m")
      .eq("id", routeId)
      .single();

    if (error || !route) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 }
      );
    }

    const coords: [number, number][] = route.geometry?.coordinates || [];
    if (coords.length < 2) {
      return NextResponse.json(
        { error: "Route has insufficient coordinates" },
        { status: 400 }
      );
    }

    // Sample up to 200 points for the profile
    const maxSamples = 200;
    const indices = sampleIndices(coords.length, maxSamples);
    const sampledLats = indices.map((i) => coords[i][1]);
    const sampledLngs = indices.map((i) => coords[i][0]);

    // Also gather waypoint coordinates for elevation lookup
    let waypointCoords: { lat: number; lng: number }[] = [];
    if (waypointParam) {
      try {
        waypointCoords = JSON.parse(waypointParam);
      } catch {
        // ignore bad JSON
      }
    }

    // Combine all coordinates for a single API call
    const allLats = [...sampledLats, ...waypointCoords.map((w) => w.lat)];
    const allLngs = [...sampledLngs, ...waypointCoords.map((w) => w.lng)];

    // Call open-meteo elevation API (free, no key needed)
    // API supports up to ~10000 points per request
    const elevationUrl = `https://api.open-meteo.com/v1/elevation?latitude=${allLats.join(",")}&longitude=${allLngs.join(",")}`;
    const elevRes = await fetch(elevationUrl);

    if (!elevRes.ok) {
      console.error(
        "[ELEVATION] open-meteo error:",
        elevRes.status,
        await elevRes.text()
      );
      return NextResponse.json(
        { error: "Failed to fetch elevation data" },
        { status: 502 }
      );
    }

    const elevData = await elevRes.json();
    const allElevations: number[] = elevData.elevation || [];

    // Split back into profile and waypoint elevations
    const profileElevations = allElevations.slice(0, sampledLats.length);
    const waypointElevations = allElevations.slice(sampledLats.length);

    // Calculate cumulative distances for sampled points
    const distances: number[] = [0];
    for (let i = 1; i < indices.length; i++) {
      const prevIdx = indices[i - 1];
      const currIdx = indices[i];
      // Sum actual distances between consecutive original coords
      let segDist = 0;
      for (let j = prevIdx + 1; j <= currIdx; j++) {
        segDist += haversineKm(
          coords[j - 1][1],
          coords[j - 1][0],
          coords[j][1],
          coords[j][0]
        );
      }
      distances.push(distances[distances.length - 1] + segDist);
    }

    // Calculate total ascent/descent
    let totalAscent = 0;
    let totalDescent = 0;
    for (let i = 1; i < profileElevations.length; i++) {
      const diff = profileElevations[i] - profileElevations[i - 1];
      if (diff > 0) totalAscent += diff;
      else totalDescent += Math.abs(diff);
    }

    const minElevation = Math.min(...profileElevations);
    const maxElevation = Math.max(...profileElevations);

    // Cache elevation_gain_m and elevation_loss_m on the route if not set
    if (!route.elevation_gain_m || !route.elevation_loss_m) {
      await supabase
        .from("routes")
        .update({
          elevation_gain_m: Math.round(totalAscent),
          elevation_loss_m: Math.round(totalDescent),
        })
        .eq("id", routeId);
    }

    return NextResponse.json({
      elevations: profileElevations,
      distances,
      totalAscent: Math.round(totalAscent),
      totalDescent: Math.round(totalDescent),
      minElevation: Math.round(minElevation),
      maxElevation: Math.round(maxElevation),
      waypointElevations: waypointElevations.map((e) => Math.round(e)),
    });
  } catch (error: any) {
    console.error("[ELEVATION] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch elevation" },
      { status: 500 }
    );
  }
}
