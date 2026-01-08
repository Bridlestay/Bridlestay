import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS, getIdentifier, rateLimitError } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { factorId, code } = await request.json();

    if (!factorId || !code) {
      return NextResponse.json(
        { error: "Factor ID and code are required" },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting - 10 attempts per 15 minutes (auth is strict)
    const rateLimitResult = checkRateLimit(
      getIdentifier(request, user.id),
      RATE_LIMITS.auth
    );
    if (!rateLimitResult.success) {
      return rateLimitError(rateLimitResult);
    }

    // Create a challenge for the factor
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId,
      });

    if (challengeError) {
      console.error("MFA challenge error:", challengeError);
      return NextResponse.json(
        { error: challengeError.message },
        { status: 400 }
      );
    }

    // Verify the challenge with the provided code
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (error) {
      console.error("MFA verify error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication has been enabled",
    });
  } catch (error: any) {
    console.error("MFA verify error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify MFA code" },
      { status: 500 }
    );
  }
}

