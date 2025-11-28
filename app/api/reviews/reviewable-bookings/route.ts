import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const reviewableBookings = [];

    // For guests: get completed bookings where they haven't reviewed the property yet
    const { data: guestBookings } = await supabase
      .from("bookings")
      .select(`
        *,
        properties!inner(
          id, 
          name, 
          city, 
          county, 
          host_id,
          property_photos(url, is_main, order_index)
        )
      `)
      .eq("guest_id", user.id)
      .eq("status", "completed")
      .gt("review_deadline", new Date().toISOString());

    if (guestBookings) {
      for (const booking of guestBookings) {
        // Check if property review already exists
        const { data: existingReview } = await supabase
          .from("property_reviews")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("reviewer_id", user.id)
          .single();

        if (!existingReview) {
          // Get main image
          const mainImage = booking.properties.property_photos?.find((p: any) => p.is_main)
            || booking.properties.property_photos?.[0];
          
          reviewableBookings.push({
            ...booking,
            reviewType: "property",
            property: {
              ...booking.properties,
              main_image_url: mainImage?.url || null,
            },
          });
        }
      }
    }

    // For hosts: get completed bookings where they haven't reviewed the guest yet
    if (userData?.role === "host") {
      const { data: hostBookings } = await supabase
        .from("bookings")
        .select(`
          *,
          properties!inner(id, name, host_id),
          guests:users!bookings_guest_id_fkey(id, name, avatar_url)
        `)
        .eq("properties.host_id", user.id)
        .eq("status", "completed")
        .gt("review_deadline", new Date().toISOString());

      if (hostBookings) {
        for (const booking of hostBookings) {
          // Check if user review already exists
          const { data: existingReview } = await supabase
            .from("user_reviews")
            .select("id")
            .eq("booking_id", booking.id)
            .eq("reviewer_id", user.id)
            .single();

          if (!existingReview) {
            reviewableBookings.push({
              ...booking,
              reviewType: "guest",
              guest: booking.guests,
            });
          }
        }
      }
    }

    // Sort by end_date descending (most recent first)
    reviewableBookings.sort((a, b) => {
      return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
    });

    return NextResponse.json({ bookings: reviewableBookings });
  } catch (error: any) {
    console.error("Error fetching reviewable bookings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviewable bookings" },
      { status: 500 }
    );
  }
}
