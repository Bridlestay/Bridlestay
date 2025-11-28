import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Disable Next.js body parsing for webhooks
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Get booking by payment intent ID
        const piId = String(paymentIntent.id);
        const bookingsResult = await supabase
          .from("bookings")
          .select(
            `
            *,
            properties:property_id (
              host_id
            )
          `
          );
        
        const bookings = bookingsResult.data?.filter((b: any) => 
          b.stripe_payment_intent_id === piId
        );
        const booking: any = bookings?.[0];

        if (!booking) {
          console.error("Booking not found for payment intent:", paymentIntent.id);
          break;
        }

        // Get host profile
        const { data: hostProfile } = await supabase
          .from("host_profiles")
          .select("*")
          .eq("user_id", booking.properties.host_id)
          .single();

        const host: any = hostProfile;
        if (!host?.stripe_connect_id) {
          console.error("Host Stripe Connect ID not found");
          break;
        }

        // Create transfer to host
        // Transfer amount = base price - host fee - VAT on host fee
        const transferAmount = booking.host_payout_pennies;

        try {
          await stripe.transfers.create({
            amount: transferAmount,
            currency: "gbp",
            destination: host.stripe_connect_id,
            transfer_group: booking.id,
            metadata: {
              bookingId: booking.id,
              propertyId: booking.property_id,
            },
          });

          console.log(
            `Transfer created for booking ${booking.id}: ${transferAmount} pennies`
          );
        } catch (transferError: any) {
          console.error("Transfer creation failed:", transferError.message);
          // TODO: Handle transfer failures (retry logic, notifications, etc.)
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Update booking status
        const piId = paymentIntent.id as string;
        await (supabase as any)
          .from("bookings")
          .update({ status: "declined" })
          .eq("stripe_payment_intent_id", piId);

        console.log("Payment failed for PI:", paymentIntent.id);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        // Update host profile payout status
        const payoutEnabled = account.charges_enabled && account.payouts_enabled;

        await (supabase as any)
          .from("host_profiles")
          .update({ payout_enabled: payoutEnabled })
          .eq("stripe_connect_id", account.id);

        console.log(`Account ${account.id} payout status:`, payoutEnabled);
        break;
      }

      // TODO: Handle charge.dispute.created for dispute management

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

