import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get latest verification attempt
    const { data: verification, error } = await supabase
      .from("user_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("verification_type", "identity")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !verification) {
      return NextResponse.json({
        verified: false,
        status: "not_started",
      });
    }

    // If already verified in DB, return that
    if (verification.status === "verified") {
      return NextResponse.json({
        verified: true,
        status: "verified",
        verified_at: verification.verified_at,
      });
    }

    // Check Stripe for latest status
    if (verification.stripe_verification_session_id) {
      try {
        const session = await stripe.identity.verificationSessions.retrieve(
          verification.stripe_verification_session_id
        );

        // Update our database if Stripe shows it's verified
        if (session.status === "verified") {
          await supabase
            .from("user_verifications")
            .update({
              status: "verified",
              verified_at: new Date().toISOString(),
            })
            .eq("id", verification.id);

          await supabase
            .from("users")
            .update({
              identity_verified: true,
              identity_verified_at: new Date().toISOString(),
              government_id_verified: true,
            })
            .eq("id", user.id);

          return NextResponse.json({
            verified: true,
            status: "verified",
            verified_at: new Date().toISOString(),
          });
        }

        return NextResponse.json({
          verified: false,
          status: session.status,
          last_error: session.last_error?.reason || null,
        });
      } catch (stripeError: any) {
        console.error("Error fetching Stripe session:", stripeError);
      }
    }

    return NextResponse.json({
      verified: false,
      status: verification.status,
    });
  } catch (error: any) {
    console.error("Error checking verification status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check verification status" },
      { status: 500 }
    );
  }
}

