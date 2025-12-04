import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { calculateDistanceFromGeometry, validateGeometry } from "@/lib/routes/gpx-converter";
import { z } from "zod";

// Validation schema - updated for new route system
const RouteSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(5000).optional(),
  county: z.string().optional(),
  terrain_tags: z.array(z.string()).default([]),
  difficulty: z.enum(["unrated", "easy", "moderate", "medium", "difficult", "hard", "severe"]).optional(),
  seasonal_notes: z.string().optional(),
  surface: z.string().optional(),
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.tuple([z.number(), z.number()])),
  }),
  near_property_id: z.string().uuid().optional(),
  is_public: z.boolean().default(false),
  featured: z.boolean().default(false),
  // New fields
  visibility: z.enum(["private", "link", "public"]).default("private"),
  route_type: z.enum(["circular", "linear"]).default("linear"),
  distance_km: z.number().optional(),
  estimated_time_minutes: z.number().optional(),
});

// POST - Create new route
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
    const validated = RouteSchema.parse(body);

    // Validate geometry
    if (!validateGeometry(validated.geometry)) {
      return NextResponse.json(
        { error: "Invalid route geometry" },
        { status: 400 }
      );
    }

    // Calculate distance if not provided
    const distance_km = validated.distance_km || calculateDistanceFromGeometry(validated.geometry);

    // Map difficulty values
    let mappedDifficulty = validated.difficulty;
    if (mappedDifficulty === "moderate") mappedDifficulty = "medium";
    if (mappedDifficulty === "difficult" || mappedDifficulty === "severe") mappedDifficulty = "hard";
    if (mappedDifficulty === "unrated") mappedDifficulty = undefined;

    // Insert route
    const { data: route, error } = await supabase
      .from("routes")
      .insert({
        title: validated.title,
        description: validated.description,
        county: validated.county,
        terrain_tags: validated.terrain_tags,
        difficulty: mappedDifficulty,
        seasonal_notes: validated.seasonal_notes,
        surface: validated.surface,
        geometry: validated.geometry,
        near_property_id: validated.near_property_id,
        is_public: validated.visibility === "public",
        featured: validated.featured,
        visibility: validated.visibility,
        route_type: validated.route_type,
        estimated_time_minutes: validated.estimated_time_minutes,
        owner_user_id: user.id,
        distance_km,
      })
      .select()
      .single();

    if (error) {
      console.error("[ROUTES_CREATE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Insert waypoints if we want to store them separately
    // (The geometry already contains all the coordinate data)

    return NextResponse.json({ route }, { status: 201 });
  } catch (error: any) {
    console.error("[ROUTES_CREATE] Error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create route" },
      { status: 500 }
    );
  }
}
