import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { differenceInDays } from "date-fns";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Platform fee rates
// NOTE: These must match lib/fees.ts (the authoritative source)
const GUEST_FEE_RATE = 0.095; // 9.5% guest service fee (no cap)
const HOST_FEE_RATE = 0.025; // 2.5% host fee (no cap)

// Split payment threshold
const SPLIT_PAYMENT_THRESHOLD_DAYS = 60;
const BALANCE_DUE_DAYS_BEFORE = 14;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      propertyId,
      checkIn,
      checkOut,
      guests,
      horses,
      selectedHorseIds,
    } = body;

    // Validate input
    if (!propertyId || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get property details
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select(`
        *,
        host:users!properties_host_id_fkey (id, name, email, stripe_account_id)
      `)
      .eq("id", propertyId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Calculate dates and nights
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const nights = differenceInDays(endDate, startDate);
    const daysUntilCheckin = differenceInDays(startDate, new Date());

    if (nights < 1) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    // Check minimum nights
    if (property.min_nights && nights < property.min_nights) {
      return NextResponse.json({ 
        error: `Minimum stay is ${property.min_nights} nights` 
      }, { status: 400 });
    }

    // Calculate pricing
    const nightlyTotal = property.nightly_price_pennies * nights;
    const horseTotal = (property.per_horse_fee_pennies || 0) * (horses || 0) * nights;
    const accommodationTotal = nightlyTotal + horseTotal;
    
    // Get total cleaning fee (use split if available, otherwise legacy)
    const houseCleaningFee = property.house_cleaning_fee_pennies || 0;
    const stableCleaningFee = property.stable_cleaning_fee_pennies || 0;
    const cleaningFee = (houseCleaningFee + stableCleaningFee) || property.cleaning_fee_pennies || 0;
    
    const subtotal = accommodationTotal + cleaningFee;
    
    // Calculate guest fee (9.5%, no cap)
    const guestFee = Math.round(subtotal * GUEST_FEE_RATE);
    
    // Calculate host fee (3%)
    const hostFee = Math.round(subtotal * HOST_FEE_RATE);
    
    // Host payout (subtotal minus host fee)
    const hostPayout = subtotal - hostFee;
    
    // Total guest pays
    const totalAmount = subtotal + guestFee;

    // Determine if split payment is needed
    const needsSplitPayment = daysUntilCheckin > SPLIT_PAYMENT_THRESHOLD_DAYS;
    
    let depositAmount = 0;
    let balanceAmount = 0;
    let balanceDueDate: Date | null = null;

    if (needsSplitPayment) {
      // 50% deposit now, 50% balance 14 days before check-in
      depositAmount = Math.round(totalAmount * 0.5);
      balanceAmount = totalAmount - depositAmount;
      balanceDueDate = new Date(startDate);
      balanceDueDate.setDate(balanceDueDate.getDate() - BALANCE_DUE_DAYS_BEFORE);
    }

    // Calculate application fee for this payment
    // Application fee = guest fee + host fee (proportional for split payments)
    const applicationFee = needsSplitPayment 
      ? Math.round((guestFee + hostFee) * 0.5)
      : guestFee + hostFee;

    // Create Stripe Payment Intent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: needsSplitPayment ? depositAmount : totalAmount,
      currency: "gbp",
      automatic_payment_methods: {
        enabled: true,
      },
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: property.host.stripe_account_id,
      },
      metadata: {
        booking_type: needsSplitPayment ? "split_deposit" : "full",
        property_id: propertyId,
        guest_id: user.id,
        check_in: checkIn,
        check_out: checkOut,
        nights: nights.toString(),
        guests: guests?.toString() || "1",
        horses: horses?.toString() || "0",
        total_amount_pennies: totalAmount.toString(),
        deposit_amount_pennies: depositAmount.toString(),
        balance_amount_pennies: balanceAmount.toString(),
        guest_fee_pennies: guestFee.toString(),
        host_fee_pennies: hostFee.toString(),
        host_payout_pennies: hostPayout.toString(),
      },
      // For split payments, we need to save the payment method for the balance
      setup_future_usage: needsSplitPayment ? "off_session" : undefined,
    };

    // Only add transfer_data if host has Stripe account
    if (!property.host.stripe_account_id) {
      // Remove transfer_data if no host account
      delete paymentIntentParams.transfer_data;
      delete paymentIntentParams.application_fee_amount;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Create booking record (pending status)
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        property_id: propertyId,
        guest_id: user.id,
        start_date: checkIn,
        end_date: checkOut,
        num_guests: guests || 1,
        num_horses: horses || 0,
        horse_ids: selectedHorseIds || [],
        total_pennies: totalAmount,
        status: "pending",
        payment_status: "pending",
        payout_status: "pending",
        stripe_payment_intent_id: paymentIntent.id,
        is_split_payment: needsSplitPayment,
        deposit_amount_pennies: needsSplitPayment ? depositAmount : null,
        balance_amount_pennies: needsSplitPayment ? balanceAmount : null,
        balance_due_date: balanceDueDate ? balanceDueDate.toISOString().split("T")[0] : null,
        guest_fee_pennies: guestFee,
        host_fee_pennies: hostFee,
        host_payout_pennies: hostPayout,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      // Cancel the payment intent if booking creation fails
      await stripe.paymentIntents.cancel(paymentIntent.id);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    // If split payment, schedule the balance payment
    if (needsSplitPayment && balanceDueDate) {
      await supabase.from("scheduled_balance_payments").insert({
        booking_id: booking.id,
        guest_id: user.id,
        amount_pennies: balanceAmount,
        scheduled_for: balanceDueDate.toISOString().split("T")[0],
        status: "scheduled",
      });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      bookingId: booking.id,
      pricing: {
        nightlyTotal,
        horseTotal,
        cleaningFee,
        subtotal,
        guestFee,
        total: totalAmount,
        hostFee,
        hostPayout,
      },
      splitPayment: needsSplitPayment ? {
        deposit: depositAmount,
        balance: balanceAmount,
        balanceDueDate: balanceDueDate?.toISOString().split("T")[0],
      } : null,
    });
  } catch (error: any) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment" },
      { status: 500 }
    );
  }
}

