import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

// Submit a user review (host reviews guest)
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
    const {
      reviewedUserId,
      bookingId,
      overallRating,
      communicationRating,
      cleanlinessRating,
      respectRating,
      wouldRecommend,
      reviewText,
    } = body;

    if (!reviewedUserId || !bookingId || !overallRating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the booking exists and user was the host
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        guest_id,
        status,
        end_date,
        properties!inner(host_id)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.properties.host_id !== user.id) {
      return NextResponse.json(
        { error: "Only the host can review the guest" },
        { status: 403 }
      );
    }

    if (booking.guest_id !== reviewedUserId) {
      return NextResponse.json(
        { error: "User ID does not match booking guest" },
        { status: 400 }
      );
    }

    if (booking.status !== "confirmed") {
      return NextResponse.json(
        { error: "Can only review confirmed bookings" },
        { status: 400 }
      );
    }

    if (new Date(booking.end_date) > new Date()) {
      return NextResponse.json(
        { error: "Can only review after checkout date" },
        { status: 400 }
      );
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from("user_reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("reviewer_id", user.id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this guest" },
        { status: 400 }
      );
    }

    // Create the review
    const { data: review, error: reviewError } = await supabase
      .from("user_reviews")
      .insert({
        reviewed_user_id: reviewedUserId,
        booking_id: bookingId,
        reviewer_id: user.id,
        overall_rating: overallRating,
        communication_rating: communicationRating,
        cleanliness_rating: cleanlinessRating,
        respect_rating: respectRating,
        would_recommend: wouldRecommend,
        review_text: reviewText,
      })
      .select()
      .single();

    if (reviewError) throw reviewError;

    return NextResponse.json({ review });
  } catch (error: any) {
    console.error("Error creating user review:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create review" },
      { status: 500 }
    );
  }
}

// Get reviews for a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    const { data: reviews, error } = await supabase
      .from("user_reviews")
      .select(`
        *,
        reviewer:reviewer_id(id, name, avatar_url)
      `)
      .eq("reviewed_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reviews: reviews || [] });
  } catch (error: any) {
    console.error("Error fetching user reviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

