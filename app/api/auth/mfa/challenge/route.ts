import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Create a challenge for MFA verification during login
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { factorId } = await request.json();

    if (!factorId) {
      return NextResponse.json(
        { error: "Factor ID is required" },
        { status: 400 }
      );
    }

    // Create a challenge
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (error) {
      console.error("MFA challenge error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      challengeId: data.id,
    });
  } catch (error: any) {
    console.error("MFA challenge error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create MFA challenge" },
      { status: 500 }
    );
  }
}

// Verify a challenge with the provided TOTP code
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { factorId, challengeId, code } = await request.json();

    if (!factorId || !challengeId || !code) {
      return NextResponse.json(
        { error: "Factor ID, challenge ID, and code are required" },
        { status: 400 }
      );
    }

    // Verify the challenge
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (error) {
      console.error("MFA verify error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("MFA verify error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify MFA code" },
      { status: 500 }
    );
  }
}

