import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { sendBookingConfirmation } from "@/lib/email/send";

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
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing booking ID" },
        { status: 400 }
      );
    }

    // Get booking details with property
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        properties:property_id (host_id)
      `
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if user is the host
    if (booking.properties.host_id !== user.id) {
      return NextResponse.json(
        { error: "Only the host can accept bookings" },
        { status: 403 }
      );
    }

    if (booking.status !== "requested") {
      return NextResponse.json(
        { error: "Booking cannot be accepted in its current state" },
        { status: 400 }
      );
    }

    // TODO: For v2, schedule capture on check-in date via cron/queue
    // For MVP, capture immediately
    if (booking.stripe_payment_intent_id) {
      await stripe.paymentIntents.capture(booking.stripe_payment_intent_id);
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "accepted" })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    // Create availability block
    const { error: blockError } = await supabase
      .from("availability_blocks")
      .insert({
        property_id: booking.property_id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        reason: "booked",
      });

    if (blockError) throw blockError;

    // Send booking confirmation email to guest
    try {
      const { data: guestData } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", booking.guest_id)
        .single();

      const { data: hostData } = await supabase
        .from("users")
        .select("name, email, phone")
        .eq("id", booking.properties.host_id)
        .single();

      const { data: propertyData } = await supabase
        .from("properties")
        .select("name, city, county")
        .eq("id", booking.property_id)
        .single();

      if (guestData && hostData && propertyData) {
        await sendBookingConfirmation({
          to: guestData.email,
          guestName: guestData.name || 'Guest',
          propertyName: propertyData.name,
          hostName: hostData.name || 'Host',
          checkIn: format(new Date(booking.start_date), 'EEEE, MMMM d, yyyy'),
          checkOut: format(new Date(booking.end_date), 'EEEE, MMMM d, yyyy'),
          guests: booking.guests,
          horses: booking.horses,
          totalAmountPennies: booking.total_charge_pennies,
          bookingId: booking.id,
          propertyAddress: `${propertyData.city}, ${propertyData.county}`,
          hostEmail: hostData.email,
          hostPhone: hostData.phone || undefined,
        });
        console.log("✅ Booking confirmation email sent to guest");
      }
    } catch (emailError) {
      // Don't fail the booking acceptance if email fails
      console.error("Failed to send booking confirmation email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Booking accepted and payment captured",
    });
  } catch (error: any) {
    console.error("Accept booking error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept booking" },
      { status: 500 }
    );
  }
}


