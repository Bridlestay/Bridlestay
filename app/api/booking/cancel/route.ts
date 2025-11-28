import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { format, differenceInDays } from "date-fns";
import { sendBookingCancelledGuest, sendBookingCancelledHost } from "@/lib/email/send";

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
    const { bookingId, reason } = body;

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
        properties:property_id (host_id, name)
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

    // Check if user is the guest
    if (booking.guest_id !== user.id) {
      return NextResponse.json(
        { error: "Only the guest can cancel this booking" },
        { status: 403 }
      );
    }

    if (booking.status !== "requested" && booking.status !== "accepted") {
      return NextResponse.json(
        { error: "Booking cannot be cancelled in its current state" },
        { status: 400 }
      );
    }

    // Calculate refund based on cancellation policy
    const daysUntilCheckin = differenceInDays(
      new Date(booking.start_date),
      new Date()
    );

    let refundAmount = booking.total_charge_pennies;
    let refundPercentage = 100;

    // Apply cancellation policy
    if (daysUntilCheckin >= 7) {
      // Full refund (minus service fee)
      refundPercentage = 100;
      refundAmount = booking.base_price_pennies; // Exclude service fees
    } else if (daysUntilCheckin >= 3) {
      // 50% refund of nightly rate
      refundPercentage = 50;
      refundAmount = Math.floor(booking.base_price_pennies * 0.5);
    } else {
      // No refund
      refundPercentage = 0;
      refundAmount = 0;
    }

    // Cancel or refund the payment intent
    if (booking.stripe_payment_intent_id) {
      try {
        if (booking.status === "requested") {
          // Payment not captured yet, just cancel
          await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id);
        } else if (booking.status === "accepted" && refundAmount > 0) {
          // Payment captured, create refund
          const charge = await stripe.charges.list({
            payment_intent: booking.stripe_payment_intent_id,
            limit: 1,
          });

          if (charge.data.length > 0) {
            await stripe.refunds.create({
              charge: charge.data[0].id,
              amount: refundAmount,
            });
          }
        }
      } catch (stripeError) {
        console.error("Stripe refund error:", stripeError);
        // Continue with cancellation even if Stripe fails
      }
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ 
        status: "cancelled",
        cancellation_reason: reason || undefined,
        cancelled_at: new Date().toISOString(),
        refund_amount_pennies: refundAmount,
      })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    // Remove availability block if it exists
    if (booking.status === "accepted") {
      await supabase
        .from("availability_blocks")
        .delete()
        .eq("property_id", booking.property_id)
        .eq("start_date", booking.start_date)
        .eq("end_date", booking.end_date);
    }

    // Send cancellation emails
    try {
      const { data: guestData } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", booking.guest_id)
        .single();

      const { data: hostData } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", booking.properties.host_id)
        .single();

      if (guestData && hostData) {
        // Email to guest
        await sendBookingCancelledGuest({
          to: guestData.email,
          guestName: guestData.name || 'Guest',
          propertyName: booking.properties.name,
          hostName: hostData.name || 'Host',
          checkIn: format(new Date(booking.start_date), 'EEEE, MMMM d, yyyy'),
          checkOut: format(new Date(booking.end_date), 'EEEE, MMMM d, yyyy'),
          refundAmountPennies: refundAmount,
          bookingId: booking.id,
          cancelledBy: 'guest',
          cancellationReason: reason,
        });

        // Email to host
        await sendBookingCancelledHost({
          to: hostData.email,
          hostName: hostData.name || 'Host',
          guestName: guestData.name || 'Guest',
          propertyName: booking.properties.name,
          checkIn: format(new Date(booking.start_date), 'EEEE, MMMM d, yyyy'),
          checkOut: format(new Date(booking.end_date), 'EEEE, MMMM d, yyyy'),
          bookingId: booking.id,
          lostEarningsPennies: booking.base_price_pennies - booking.host_fee_pennies,
          cancellationReason: reason,
        });

        console.log("✅ Cancellation emails sent to both guest and host");
      }
    } catch (emailError) {
      // Don't fail the cancellation if email fails
      console.error("Failed to send cancellation emails:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Booking cancelled",
      refundAmount,
      refundPercentage,
    });
  } catch (error: any) {
    console.error("Cancel booking error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel booking" },
      { status: 500 }
    );
  }
}

