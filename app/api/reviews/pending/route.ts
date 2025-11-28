import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

// Get pending reviews for a user (bookings they haven't reviewed yet)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');

    const pendingReviews: any[] = [];

    // Get completed bookings where user was guest (property reviews)
    if (role === "guest" || role === "admin") {
      const { data: guestBookings } = await supabase
        .from("bookings")
        .select(`
          id,
          end_date,
          property_id,
          properties!inner(id, name)
        `)
        .eq("guest_id", user.id)
        .eq("status", "confirmed")
        .lt("end_date", new Date().toISOString())
        .order("end_date", { ascending: false });

      if (guestBookings) {
        for (const booking of guestBookings) {
          // Check if review exists
          const { data: existingReview } = await supabase
            .from("property_reviews")
            .select("id")
            .eq("booking_id", booking.id)
            .eq("reviewer_id", user.id)
            .single();

          if (!existingReview) {
            pendingReviews.push({
              id: booking.id,
              property_id: booking.property_id,
              property_name: booking.properties.name,
              check_out: booking.end_date,
              type: "property",
            });
          }
        }
      }
    }

    // Get completed bookings where user was host (user reviews)
    if (role === "host" || role === "admin") {
      const { data: hostBookings } = await supabase
        .from("bookings")
        .select(`
          id,
          end_date,
          guest_id,
          properties!inner(host_id, name),
          guest:guest_id(name)
        `)
        .eq("properties.host_id", user.id)
        .eq("status", "confirmed")
        .lt("end_date", new Date().toISOString())
        .order("end_date", { ascending: false });

      if (hostBookings) {
        for (const booking of hostBookings) {
          // Check if review exists
          const { data: existingReview } = await supabase
            .from("user_reviews")
            .select("id")
            .eq("booking_id", booking.id)
            .eq("reviewer_id", user.id)
            .single();

          if (!existingReview) {
            pendingReviews.push({
              id: booking.id,
              guest_id: booking.guest_id,
              guest_name: booking.guest?.name || "Guest",
              property_name: booking.properties.name,
              check_out: booking.end_date,
              type: "user",
            });
          }
        }
      }
    }

    // Limit to 5 most recent
    const limitedReviews = pendingReviews.slice(0, 5);

    return NextResponse.json({ pendingReviews: limitedReviews });
  } catch (error: any) {
    console.error("Error fetching pending reviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending reviews" },
      { status: 500 }
    );
  }
}

