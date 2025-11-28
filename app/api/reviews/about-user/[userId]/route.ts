import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;

    // Get user reviews where this user is the reviewed_user
    const { data: userReviews } = await supabase
      .from("user_reviews")
      .select(`
        *,
        reviewer:users!user_reviews_reviewer_id_fkey(id, name, avatar_url)
      `)
      .eq("reviewed_user_id", userId)
      .order("created_at", { ascending: false });

    // Format the reviews
    const allReviews = (userReviews || []).map(review => ({
      ...review,
      reviewer: review.reviewer,
      type: "user"
    }));

    return NextResponse.json({ reviews: allReviews });
  } catch (error: any) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

