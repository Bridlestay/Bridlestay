import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS, getIdentifier, rateLimitError } from "@/lib/rate-limit";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting - 5 requests per hour
    const rateLimitResult = checkRateLimit(
      getIdentifier(request, user.id),
      RATE_LIMITS.referral
    );
    if (!rateLimitResult.success) {
      return rateLimitError(rateLimitResult);
    }

    // Check if user already has a referral code (use service client to bypass RLS)
    const { data: existingCode } = await serviceClient
      .from("referral_codes")
      .select("*")
      .eq("owner_user_id", user.id)
      .eq("code_type", "user_referral")
      .eq("is_active", true)
      .single();

    if (existingCode) {
      return NextResponse.json({ code: existingCode });
    }

    // Generate a unique code - the database has a UNIQUE constraint on 'code'
    // so we check for collisions and retry if needed
    let code = generateCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const { data: existing } = await serviceClient
        .from("referral_codes")
        .select("id")
        .eq("code", code)
        .single();

      if (!existing) {
        break;
      }

      code = generateCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Failed to generate unique code" },
        { status: 500 }
      );
    }

    // Fetch current referral settings from site_settings
    const { data: settingsData } = await serviceClient
      .from("site_settings")
      .select("value")
      .eq("key", "user_referral_config")
      .single();

    // Use settings or fall back to defaults
    const settings = settingsData?.value || {
      benefit_type: "guest_fee_discount",
      benefit_value: 10,
      benefit_duration_months: 3,
      benefit_uses_limit: 5,
      referrer_benefit_type: "fixed_credit",
      referrer_benefit_value: 500,
    };

    // Create the referral code using service client (bypasses RLS)
    const { data: newCode, error } = await serviceClient
      .from("referral_codes")
      .insert({
        code,
        owner_user_id: user.id,
        code_type: "user_referral",
        benefit_type: settings.benefit_type,
        benefit_value: settings.benefit_value,
        benefit_duration_months: settings.benefit_duration_months,
        benefit_uses_limit: settings.benefit_uses_limit,
        referrer_benefit_type: settings.referrer_benefit_type,
        referrer_benefit_value: settings.referrer_benefit_value,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating referral code:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ code: newCode });
  } catch (error) {
    console.error("Error generating referral code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

