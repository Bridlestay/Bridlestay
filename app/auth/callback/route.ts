import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getWelcomeMessage } from "@/lib/system-messages";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const origin = requestUrl.origin;

  const supabase = await createClient();
  let sessionData: any = null;

  // Handle OAuth code exchange (regular sign-in)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Code exchange error:", error);
    } else {
      sessionData = data;
    }
  }

  // Handle magic link / OTP token verification
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    });
    if (error) {
      console.error("Token verification error:", error);
    } else {
      sessionData = data;
    }
  }

  // Check if this is a new user (first login) and send welcome message
  if (sessionData?.user) {
    const { data: userData } = await supabase
      .from("users")
      .select("created_at, name")
      .eq("id", sessionData.user.id)
      .single();

    // If user was created recently (within last minute), send welcome message
    if (userData) {
      const createdAt = new Date(userData.created_at);
      const now = new Date();
      const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / 1000 / 60;

      if (minutesSinceCreation < 1) {
        // Send welcome message
        const welcomeMsg = getWelcomeMessage(
          sessionData.user.id,
          userData.name || "there"
        );

        try {
          await fetch(`${origin}/api/system/send-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(welcomeMsg),
          });
          console.log("✅ Welcome message sent to new user");
        } catch (error) {
          console.error("Failed to send welcome message:", error);
        }
      }
    }
  }

  // Get redirect destination from query params or default to dashboard
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  return NextResponse.redirect(new URL(next, origin));
}

