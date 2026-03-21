import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, rating, body: reviewBody } = body;

    if (!bookingId || !rating || !reviewBody) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if user is the guest
    if (booking.guest_id !== user.id) {
      return NextResponse.json(
        { error: "Only the guest can review this booking" },
        { status: 403 }
      );
    }

    // Check if booking is completed
    if (booking.status !== "completed") {
      return NextResponse.json(
        { error: "Can only review completed bookings" },
        { status: 400 }
      );
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from("property_reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: "Review already exists for this booking" },
        { status: 400 }
      );
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from("property_reviews")
      .insert({
        booking_id: bookingId,
        property_id: booking.property_id,
        reviewer_id: user.id,
        overall_rating: rating,
        review_text: reviewBody,
      })
      .select()
      .single();

    if (reviewError) throw reviewError;

    // Notify host about the listing review
    const { data: property } = await supabase
      .from("properties")
      .select("host_id, name")
      .eq("id", booking.property_id)
      .single();

    if (property) {
      const { data: reviewer } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();

      await createNotification({
        userId: property.host_id,
        type: "listing_review",
        title: `${reviewer?.name || "A guest"} left a review for ${property.name}`,
        body: `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`,
        link: `/host/listings`,
        actorId: user.id,
      });
    }

    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    console.error("Create review error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create review" },
      { status: 500 }
    );
  }
}



