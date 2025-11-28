import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().optional(),
});

// GET - Get reviews for a route
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = params;

    const { data: reviews, error } = await supabase
      .from("route_reviews")
      .select(
        `
        *,
        user:users!user_id (id, name, avatar_url, admin_verified)
      `
      )
      .eq("route_id", routeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ROUTE_REVIEWS_GET] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reviews: reviews || [] });
  } catch (error: any) {
    console.error("[ROUTE_REVIEWS_GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// POST - Add review to route
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = ReviewSchema.parse(body);

    // Check if user already reviewed this route
    const { data: existingReview } = await supabase
      .from("route_reviews")
      .select("id")
      .eq("route_id", routeId)
      .eq("user_id", user.id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this route" },
        { status: 400 }
      );
    }

    // Insert review
    const { data: review, error } = await supabase
      .from("route_reviews")
      .insert({
        route_id: routeId,
        user_id: user.id,
        ...validated,
      })
      .select(
        `
        *,
        user:users!user_id (id, name, avatar_url, admin_verified)
      `
      )
      .single();

    if (error) {
      console.error("[ROUTE_REVIEW_CREATE] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger will automatically update route's avg_rating and review_count

    return NextResponse.json({ review }, { status: 201 });
  } catch (error: any) {
    console.error("[ROUTE_REVIEW_CREATE] Error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}



