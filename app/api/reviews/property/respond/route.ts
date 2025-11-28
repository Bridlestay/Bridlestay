import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId, response } = await request.json();

    if (!reviewId || !response) {
      return NextResponse.json(
        { error: "Review ID and response are required" },
        { status: 400 }
      );
    }

    // Get the review and verify the user is the property host
    const { data: review } = await supabase
      .from("property_reviews")
      .select(`
        id,
        property:properties!inner(host_id)
      `)
      .eq("id", reviewId)
      .single();

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.property.host_id !== user.id) {
      return NextResponse.json(
        { error: "Only the property host can respond to this review" },
        { status: 403 }
      );
    }

    // Update the review with host response
    const { data: updatedReview, error } = await supabase
      .from("property_reviews")
      .update({
        host_response: response.trim(),
        host_response_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, review: updatedReview });
  } catch (error: any) {
    console.error("Error responding to review:", error);
    return NextResponse.json(
      { error: error.message || "Failed to respond to review" },
      { status: 500 }
    );
  }
}

