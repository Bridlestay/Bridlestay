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

    const {
      bookingId,
      reviewedUserId,
      overall_rating,
      communication_rating,
      cleanliness_rating,
      respect_rating,
      review_text,
      would_recommend,
    } = await request.json();

    if (!bookingId || !reviewedUserId || !overall_rating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if review period is still open and user is the host
    const { data: booking } = await supabase
      .from("bookings")
      .select(`
        end_date, 
        status, 
        guest_id,
        properties!inner(host_id)
      `)
      .eq("id", bookingId)
      .single();

    if (!booking || booking.properties.host_id !== user.id) {
      return NextResponse.json(
        { error: "Booking not found or unauthorized" },
        { status: 404 }
      );
    }

    if (booking.status !== "completed") {
      return NextResponse.json(
        { error: "Can only review completed bookings" },
        { status: 400 }
      );
    }

    const checkoutDate = new Date(booking.end_date);
    const now = new Date();
    const fourteenDaysAfterCheckout = new Date(
      checkoutDate.getTime() + 14 * 24 * 60 * 60 * 1000
    );

    if (checkoutDate > now) {
      return NextResponse.json(
        { error: "Cannot review before checkout" },
        { status: 400 }
      );
    }

    if (now > fourteenDaysAfterCheckout) {
      return NextResponse.json(
        { error: "Review period has expired (14 days after checkout)" },
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

    // Create review
    const { data: review, error } = await supabase
      .from("user_reviews")
      .insert({
        reviewed_user_id: reviewedUserId,
        booking_id: bookingId,
        reviewer_id: user.id,
        overall_rating,
        communication_rating,
        cleanliness_rating,
        respect_rating,
        review_text,
        would_recommend,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    console.error("Error submitting user review:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit review" },
      { status: 500 }
    );
  }
}

