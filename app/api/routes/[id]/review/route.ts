import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rating, difficulty, review_text } = await request.json();

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Check if route exists
    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("id, owner_user_id")
      .eq("id", params.id)
      .single();

    if (routeError || !route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Check if user already reviewed this route
    const { data: existingReview } = await supabase
      .from("route_reviews")
      .select("id")
      .eq("route_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (existingReview) {
      // Update existing review
      const { error: updateError } = await supabase
        .from("route_reviews")
        .update({
          rating,
          difficulty_rating: difficulty,
          review_text,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingReview.id);

      if (updateError) throw updateError;

      return NextResponse.json({ success: true, updated: true });
    }

    // Insert new review
    const { error: insertError } = await supabase
      .from("route_reviews")
      .insert({
        route_id: params.id,
        user_id: user.id,
        rating,
        difficulty_rating: difficulty,
        review_text,
      });

    if (insertError) throw insertError;

    // Record route completion (only if one doesn't already exist)
    const { data: existingCompletion } = await supabase
      .from("route_completions")
      .select("id")
      .eq("route_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingCompletion) {
      const { error: completionError } = await supabase
        .from("route_completions")
        .insert({
          route_id: params.id,
          user_id: user.id,
          completed_at: new Date().toISOString(),
        });

      // Update completions count on route
      if (!completionError) {
        const { count } = await supabase
          .from("route_completions")
          .select("*", { count: "exact", head: true })
          .eq("route_id", params.id);
        await supabase
          .from("routes")
          .update({ completions_count: count || 0 })
          .eq("id", params.id);
      }
    }

    // Update route average rating
    const { data: reviews } = await supabase
      .from("route_reviews")
      .select("rating, difficulty_rating")
      .eq("route_id", params.id);

    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      
      // Calculate average difficulty
      const difficultyMap: Record<string, number> = {
        easy: 1,
        moderate: 2,
        difficult: 3,
        severe: 4,
      };
      const difficultyValues = reviews
        .map((r) => difficultyMap[r.difficulty_rating])
        .filter(Boolean);
      const avgDifficulty = difficultyValues.length > 0
        ? difficultyValues.reduce((sum, d) => sum + d, 0) / difficultyValues.length
        : null;

      // Map back to difficulty label
      let communityDifficulty = null;
      if (avgDifficulty !== null) {
        if (avgDifficulty <= 1.5) communityDifficulty = "easy";
        else if (avgDifficulty <= 2.5) communityDifficulty = "moderate";
        else if (avgDifficulty <= 3.5) communityDifficulty = "difficult";
        else communityDifficulty = "severe";
      }

      await supabase
        .from("routes")
        .update({
          avg_rating: avgRating,
          review_count: reviews.length,
          community_difficulty: communityDifficulty,
        })
        .eq("id", params.id);
    }

    // Notify route owner about the review (only for new reviews, not updates)
    if (!existingReview && route.owner_user_id !== user.id) {
      const { data: reviewer } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();

      await createNotification({
        userId: route.owner_user_id,
        type: "route_review",
        title: `${reviewer?.name || "Someone"} reviewed your route`,
        body: `${"★".repeat(rating)}${"☆".repeat(5 - rating)} — ${review_text?.slice(0, 80) || ""}`,
        link: `/routes?route=${params.id}`,
        actorId: user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Review error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit review" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  try {
    const { data: reviews, error } = await supabase
      .from("route_reviews")
      .select(`
        *,
        user:users(id, name, avatar_url)
      `)
      .eq("route_id", params.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reviews: reviews || [] });
  } catch (error: any) {
    console.error("Fetch reviews error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

