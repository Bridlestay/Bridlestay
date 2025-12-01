import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_IDENTITY_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Handle identity verification events
  if (event.type === "identity.verification_session.verified") {
    const session = event.data.object as Stripe.Identity.VerificationSession;
    const userId = session.metadata.user_id;

    if (!userId) {
      console.error("No user_id in session metadata");
      return NextResponse.json({ received: true });
    }

    // Update verification record
    await supabase
      .from("user_verifications")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        metadata: {
          verified_data: session.verified_outputs,
        },
      })
      .eq("stripe_verification_session_id", session.id);

    // Update user record
    await supabase
      .from("users")
      .update({
        identity_verified: true,
        identity_verified_at: new Date().toISOString(),
        government_id_verified: true,
      })
      .eq("id", userId);

    console.log(`✅ User ${userId} identity verified`);

    // TODO: Send verification success email
  } else if (event.type === "identity.verification_session.requires_input") {
    const session = event.data.object as Stripe.Identity.VerificationSession;

    await supabase
      .from("user_verifications")
      .update({
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_verification_session_id", session.id);
  } else if (
    event.type === "identity.verification_session.canceled" ||
    event.type === "identity.verification_session.processing"
  ) {
    const session = event.data.object as Stripe.Identity.VerificationSession;

    await supabase
      .from("user_verifications")
      .update({
        status: event.type.includes("canceled") ? "failed" : "processing",
        failure_reason: session.last_error?.reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_verification_session_id", session.id);
  }

  return NextResponse.json({ received: true });
}

