import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { calculateDistanceFromGeometry, validateGeometry } from "@/lib/routes/gpx-converter";
import { z } from "zod";

// Validation schema
const RouteSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  county: z.string().optional(),
  terrain_tags: z.array(z.string()).default([]),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  seasonal_notes: z.string().optional(),
  surface: z.string().optional(),
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.tuple([z.number(), z.number()])),
  }),
  near_property_id: z.string().uuid().optional(),
  is_public: z.boolean().default(true),
  featured: z.boolean().default(false),
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

    // Calculate distance
    const distance_km = calculateDistanceFromGeometry(validated.geometry);

    // Insert route
    const { data: route, error } = await supabase
      .from("routes")
      .insert({
        ...validated,
        owner_user_id: user.id,
        distance_km,
      })
      .select()
      .single();

    if (error) {
      console.error("[ROUTES_CREATE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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



