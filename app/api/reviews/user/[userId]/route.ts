import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient();

    // Fetch user reviews
    const { data: reviews, error } = await supabase
      .from("user_reviews")
      .select(`
        *,
        reviewer:reviewer_id (id, name, avatar_url)
      `)
      .eq("reviewed_user_id", params.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Calculate stats
    const stats = {
      totalReviews: reviews?.length || 0,
      averageRating: reviews?.length
        ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length
        : 0,
      recommendationRate: reviews?.length
        ? Math.round(
            (reviews.filter((r) => r.would_recommend).length / reviews.length) * 100
          )
        : 0,
      totalStays: reviews?.length || 0, // Each review = one stay
    };

    return NextResponse.json({ reviews: reviews || [], stats });
  } catch (error: any) {
    console.error("Error fetching user reviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

