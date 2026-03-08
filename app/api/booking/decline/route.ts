import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { sendBookingCancelledGuest } from "@/lib/email/send";
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
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing booking ID" },
        { status: 400 }
      );
    }

    // Get booking details
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
        { error: "Only the host can decline bookings" },
        { status: 403 }
      );
    }

    if (booking.status !== "requested") {
      return NextResponse.json(
        { error: "Booking cannot be declined in its current state" },
        { status: 400 }
      );
    }

    // Cancel the payment intent
    if (booking.stripe_payment_intent_id) {
      await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id);
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "declined" })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    // Send cancellation email to guest
    try {
      const { data: guestData } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", booking.guest_id)
        .single();

      const { data: hostData } = await supabase
        .from("users")
        .select("name")
        .eq("id", booking.properties.host_id)
        .single();

      const { data: propertyData } = await supabase
        .from("properties")
        .select("name")
        .eq("id", booking.property_id)
        .single();

      if (guestData && hostData && propertyData) {
        await sendBookingCancelledGuest({
          to: guestData.email,
          guestName: guestData.name || 'Guest',
          propertyName: propertyData.name,
          hostName: hostData.name || 'Host',
          checkIn: format(new Date(booking.start_date), 'EEEE, MMMM d, yyyy'),
          checkOut: format(new Date(booking.end_date), 'EEEE, MMMM d, yyyy'),
          refundAmountPennies: booking.total_charge_pennies,
          bookingId: booking.id,
          cancelledBy: 'host',
          cancellationReason: 'The host has declined your booking request.',
        });
        console.log("✅ Cancellation email sent to guest");
      }
    } catch (emailError) {
      // Don't fail the decline if email fails
      console.error("Failed to send cancellation email:", emailError);
    }

    // Send in-app notification to guest
    createNotification({
      userId: booking.guest_id,
      type: "booking_declined",
      title: "Your booking request was declined",
      body: "The host has declined your booking request. Your payment hold has been released.",
      link: `/dashboard`,
      actorId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Booking declined",
    });
  } catch (error: any) {
    console.error("Decline booking error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to decline booking" },
      { status: 500 }
    );
  }
}


