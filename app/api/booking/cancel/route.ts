import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { differenceInDays } from "date-fns";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, reason } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    // Get booking with property and policy details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        property:properties (
          id, 
          name, 
          cancellation_policy,
          host_id
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check user is the guest OR the host
    const isGuest = booking.guest_id === user.id;
    const isHost = booking.property.host_id === user.id;

    if (!isGuest && !isHost) {
      return NextResponse.json({ error: "Not authorized to cancel this booking" }, { status: 403 });
    }

    // Check booking status
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "Booking is already cancelled" }, { status: 400 });
    }

    if (booking.status === "completed") {
      return NextResponse.json({ error: "Cannot cancel a completed booking" }, { status: 400 });
    }

    // Calculate days until check-in
    const startDate = new Date(booking.start_date);
    const daysUntilCheckin = differenceInDays(startDate, new Date());

    // Determine refund based on who cancelled and policy
    let refundPercent = 0;
    let refundAmount = 0;

    if (isHost) {
      // Host cancellation = full refund to guest
      refundPercent = 100;
    } else {
      // Guest cancellation = policy-based refund
      const { data: policy } = await supabase
        .from("cancellation_policy_rules")
        .select("rules")
        .eq("policy_name", booking.property.cancellation_policy || "standard")
        .single();

      if (policy?.rules) {
        const rules = policy.rules as Array<{ days_before: number; refund_percent: number }>;
        // Sort by days_before descending to find the applicable rule
        const sortedRules = [...rules].sort((a, b) => b.days_before - a.days_before);
        
        for (const rule of sortedRules) {
          if (daysUntilCheckin >= rule.days_before) {
            refundPercent = rule.refund_percent;
            break;
          }
        }
      }
    }

    // Calculate refund amount (on accommodation, not service fee)
    const accommodationAmount = booking.total_pennies - (booking.guest_fee_pennies || 0);
    refundAmount = Math.round(accommodationAmount * (refundPercent / 100));

    // Process refund via Stripe if there's something to refund
    let stripeRefundId = null;
    if (refundAmount > 0 && booking.stripe_payment_intent_id) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
          amount: refundAmount,
          reason: "requested_by_customer",
        });
        stripeRefundId = refund.id;
      } catch (stripeError: any) {
        console.error("Stripe refund error:", stripeError);
        // Continue with cancellation even if refund fails (manual resolution needed)
      }
    }

    // Cancel any scheduled balance payments
    if (booking.is_split_payment) {
      await supabase
        .from("scheduled_balance_payments")
        .update({ status: "cancelled" })
        .eq("booking_id", bookingId)
        .eq("status", "scheduled");
    }

    // Cancel any scheduled payouts
    await supabase
      .from("scheduled_payouts")
      .update({ status: "cancelled" })
      .eq("booking_id", bookingId)
      .eq("status", "scheduled");

    // Update booking status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        payment_status: refundAmount > 0 ? 
          (refundAmount === booking.total_pennies ? "refunded" : "partially_refunded") : 
          booking.payment_status,
        payout_status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: isHost ? "host" : "guest",
        cancellation_reason: reason || null,
        refund_amount_pennies: refundAmount,
        refund_processed_at: refundAmount > 0 ? new Date().toISOString() : null,
        stripe_refund_id: stripeRefundId,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }

    // TODO: Send cancellation notification emails to guest and host

    return NextResponse.json({
      success: true,
      cancellation: {
        cancelledBy: isHost ? "host" : "guest",
        daysBeforeCheckin: daysUntilCheckin,
        policy: booking.property.cancellation_policy,
        refundPercent,
        refundAmount,
        refundProcessed: !!stripeRefundId,
      },
    });
  } catch (error: any) {
    console.error("Cancellation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel booking" },
      { status: 500 }
    );
  }
}

// GET - Calculate refund preview without actually cancelling
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    // Get booking details
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        *,
        property:properties (id, name, cancellation_policy, host_id)
      `)
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify access
    if (booking.guest_id !== user.id && booking.property.host_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Calculate days until check-in
    const startDate = new Date(booking.start_date);
    const daysUntilCheckin = differenceInDays(startDate, new Date());

    // Get cancellation policy details
    const { data: policyData } = await supabase
      .from("cancellation_policy_rules")
      .select("*")
      .eq("policy_name", booking.property.cancellation_policy || "standard")
      .single();

    // Calculate refund percentage
    let refundPercent = 0;
    if (policyData?.rules) {
      const rules = policyData.rules as Array<{ days_before: number; refund_percent: number }>;
      const sortedRules = [...rules].sort((a, b) => b.days_before - a.days_before);
      
      for (const rule of sortedRules) {
        if (daysUntilCheckin >= rule.days_before) {
          refundPercent = rule.refund_percent;
          break;
        }
      }
    }

    const accommodationAmount = booking.total_pennies - (booking.guest_fee_pennies || 0);
    const refundAmount = Math.round(accommodationAmount * (refundPercent / 100));

    return NextResponse.json({
      booking: {
        id: booking.id,
        propertyName: booking.property.name,
        checkIn: booking.start_date,
        checkOut: booking.end_date,
        totalPaid: booking.total_pennies,
        status: booking.status,
      },
      cancellationPreview: {
        daysBeforeCheckin: daysUntilCheckin,
        policy: policyData ? {
          name: policyData.display_name,
          description: policyData.guest_friendly_summary,
        } : null,
        refundPercent,
        refundAmount,
        nonRefundableAmount: accommodationAmount - refundAmount,
        serviceFeeRefunded: false, // Service fees are not refunded
      },
    });
  } catch (error: any) {
    console.error("Refund preview error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate refund" },
      { status: 500 }
    );
  }
}
