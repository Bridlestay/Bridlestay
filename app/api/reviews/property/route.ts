import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

// Submit a property review
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
      propertyId,
      bookingId,
      overallRating,
      cleanlinessRating,
      accuracyRating,
      communicationRating,
      locationRating,
      valueRating,
      stableQualityRating,
      turnoutQualityRating,
      reviewText,
    } = body;

    if (!propertyId || !bookingId || !overallRating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the booking exists and user was the guest
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, guest_id, status, end_date")
      .eq("id", bookingId)
      .eq("guest_id", user.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found or unauthorized" },
        { status: 404 }
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
      .from("property_reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("reviewer_id", user.id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this booking" },
        { status: 400 }
      );
    }

    // Create the review
    const { data: review, error: reviewError } = await supabase
      .from("property_reviews")
      .insert({
        property_id: propertyId,
        booking_id: bookingId,
        reviewer_id: user.id,
        overall_rating: overallRating,
        cleanliness_rating: cleanlinessRating,
        accuracy_rating: accuracyRating,
        communication_rating: communicationRating,
        location_rating: locationRating,
        value_rating: valueRating,
        stable_quality_rating: stableQualityRating,
        turnout_quality_rating: turnoutQualityRating,
        review_text: reviewText,
      })
      .select()
      .single();

    if (reviewError) throw reviewError;

    return NextResponse.json({ review });
  } catch (error: any) {
    console.error("Error creating property review:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create review" },
      { status: 500 }
    );
  }
}

// Get reviews for a property
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID required" },
        { status: 400 }
      );
    }

    const { data: reviews, error } = await supabase
      .from("property_reviews")
      .select(`
        *,
        reviewer:reviewer_id(id, name, avatar_url)
      `)
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reviews: reviews || [] });
  } catch (error: any) {
    console.error("Error fetching property reviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

