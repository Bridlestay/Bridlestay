import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a host
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "host") {
      return NextResponse.json(
        { error: "Only hosts can connect Stripe accounts" },
        { status: 403 }
      );
    }

    // Get or create host profile
    let { data: hostProfile } = await supabase
      .from("host_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!hostProfile) {
      const { data: newProfile, error: createError } = await supabase
        .from("host_profiles")
        .insert({ user_id: user.id })
        .select()
        .single();

      if (createError) throw createError;
      hostProfile = newProfile;
    }

    // If already has Stripe Connect ID, create login link
    if (hostProfile.stripe_connect_id) {
      const loginLink = await stripe.accounts.createLoginLink(
        hostProfile.stripe_connect_id
      );
      return NextResponse.json({ url: loginLink.url });
    }

    // Create new Stripe Connect account
    const account = await stripe.accounts.create({
      type: "standard",
      country: "GB",
      email: user.email,
    });

    // Save Stripe Connect ID
    await supabase
      .from("host_profiles")
      .update({ stripe_connect_id: account.id })
      .eq("user_id", user.id);

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?connected=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error("Stripe Connect error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to connect Stripe account" },
      { status: 500 }
    );
  }
}


