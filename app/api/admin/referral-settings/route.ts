import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Get current referral settings
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: settings, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("key", "user_referral_config")
      .single();

    if (error) {
      // If not found, return defaults
      if (error.code === "PGRST116") {
        return NextResponse.json({
          settings: {
            benefit_type: "guest_fee_discount",
            benefit_value: 10,
            benefit_duration_months: 3,
            benefit_uses_limit: 5,
            referrer_benefit_type: "fixed_credit",
            referrer_benefit_value: 500,
            promotion_message: null,
            promotion_active: false,
          },
        });
      }
      throw error;
    }

    return NextResponse.json({ settings: settings.value, updated_at: settings.updated_at });
  } catch (error: any) {
    console.error("Error fetching referral settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// Update referral settings
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      benefit_type,
      benefit_value,
      benefit_duration_months,
      benefit_uses_limit,
      referrer_benefit_type,
      referrer_benefit_value,
      promotion_message,
      promotion_active,
    } = body;

    // Validate
    if (!benefit_type || benefit_value === undefined) {
      return NextResponse.json(
        { error: "Benefit type and value are required" },
        { status: 400 }
      );
    }

    const newValue = {
      benefit_type,
      benefit_value: Number(benefit_value),
      benefit_duration_months: benefit_duration_months ? Number(benefit_duration_months) : null,
      benefit_uses_limit: benefit_uses_limit ? Number(benefit_uses_limit) : null,
      referrer_benefit_type: referrer_benefit_type || "fixed_credit",
      referrer_benefit_value: referrer_benefit_value ? Number(referrer_benefit_value) : 500,
      promotion_message: promotion_message || null,
      promotion_active: Boolean(promotion_active),
    };

    const { data: settings, error } = await supabase
      .from("site_settings")
      .upsert({
        key: "user_referral_config",
        value: newValue,
        updated_by: user.id,
        description: "Configuration for user-generated referral codes. Controls what benefits new codes provide.",
      }, { onConflict: "key" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      settings: settings.value,
      message: "Referral settings updated successfully" 
    });
  } catch (error: any) {
    console.error("Error updating referral settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}

