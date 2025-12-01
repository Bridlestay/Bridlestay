import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { moderateContent, getBlockedMessageText } from "@/lib/moderation";

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
      propertyId,
      overall_rating,
      cleanliness_rating,
      accuracy_rating,
      communication_rating,
      location_rating,
      value_rating,
      stable_quality_rating,
      turnout_quality_rating,
      review_text,
    } = await request.json();

    if (!bookingId || !propertyId || !overall_rating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if review period is still open (14 days after checkout)
    const { data: booking } = await supabase
      .from("bookings")
      .select("end_date, status, guest_id")
      .eq("id", bookingId)
      .single();

    if (!booking || booking.guest_id !== user.id) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "completed") {
      return NextResponse.json(
        { error: "Can only review completed bookings" },
        { status: 400 }
      );
    }

    const checkoutDate = new Date(booking.end_date);
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    if (checkoutDate > now) {
      return NextResponse.json(
        { error: "Cannot review before checkout" },
        { status: 400 }
      );
    }

    if (checkoutDate < fourteenDaysAgo) {
      return NextResponse.json(
        { error: "Review period has expired (14 days after checkout)" },
        { status: 400 }
      );
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from("property_reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("reviewer_id", user.id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this stay" },
        { status: 400 }
      );
    }

    // Moderate review text
    if (review_text) {
      const moderationResult = moderateContent(review_text);
      if (moderationResult.blocked) {
        return NextResponse.json(
          { 
            error: getBlockedMessageText(moderationResult.reasons),
            blocked: true 
          },
          { status: 400 }
        );
      }
    }

    // Create review
    const { data: review, error } = await supabase
      .from("property_reviews")
      .insert({
        property_id: propertyId,
        booking_id: bookingId,
        reviewer_id: user.id,
        overall_rating,
        cleanliness_rating,
        accuracy_rating,
        communication_rating,
        location_rating,
        value_rating,
        stable_quality_rating,
        turnout_quality_rating,
        review_text,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    console.error("Error submitting property review:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit review" },
      { status: 500 }
    );
  }
}

