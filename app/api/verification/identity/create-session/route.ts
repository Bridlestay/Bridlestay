import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has a pending or verified session
    const { data: existingVerification } = await supabase
      .from("user_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("verification_type", "identity")
      .in("status", ["pending", "processing", "verified"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingVerification?.status === "verified") {
      return NextResponse.json(
        { error: "User is already verified" },
        { status: 400 }
      );
    }

    if (
      existingVerification?.status === "pending" ||
      existingVerification?.status === "processing"
    ) {
      // Return existing session
      return NextResponse.json({
        client_secret: existingVerification.stripe_verification_session_id,
      });
    }

    // Get user data for pre-filling
    const { data: userData } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .single();

    // Create new Stripe Identity verification session
    const verificationSession = await stripe.identity.verificationSessions.create(
      {
        type: "document",
        metadata: {
          user_id: user.id,
          user_email: userData?.email || "",
        },
        options: {
          document: {
            allowed_types: ["driving_license", "passport", "id_card"],
            require_live_capture: true,
            require_matching_selfie: true,
          },
        },
        return_url: `${process.env.NEXT_PUBLIC_URL}/verify/complete`,
      }
    );

    // Store verification session in database
    await supabase.from("user_verifications").insert({
      user_id: user.id,
      verification_type: "identity",
      status: "pending",
      verification_method: "stripe_identity",
      stripe_verification_session_id: verificationSession.id,
      metadata: {
        session_created_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      client_secret: verificationSession.client_secret,
      session_id: verificationSession.id,
    });
  } catch (error: any) {
    console.error("Error creating verification session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create verification session" },
      { status: 500 }
    );
  }
}

