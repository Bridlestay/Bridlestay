import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Get path data (bridleways, boats, footpaths, permissive) as GeoJSON
 * This data comes from UK public rights of way datasets
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const pathType = params.type;
    
    // Validate path type
    const validTypes = ["bridleways", "boats", "footpaths", "permissive"];
    if (!validTypes.includes(pathType)) {
      return NextResponse.json(
        { error: "Invalid path type" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch paths from database
    const { data: paths, error } = await supabase
      .from("public_paths")
      .select("id, name, geometry, path_type, surface, condition, notes")
      .eq("path_type", pathType)
      .not("geometry", "is", null);

    if (error) {
      console.error(`[PATHS/${pathType}] Error:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Convert to GeoJSON FeatureCollection
    const geoJson = {
      type: "FeatureCollection",
      features: (paths || []).map((path) => ({
        type: "Feature",
        id: path.id,
        properties: {
          name: path.name,
          pathType: path.path_type,
          surface: path.surface,
          condition: path.condition,
          notes: path.notes,
        },
        geometry: path.geometry,
      })),
    };

    return NextResponse.json(geoJson, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("[PATHS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch paths" },
      { status: 500 }
    );
  }
}

