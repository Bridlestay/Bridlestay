import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getWelcomeMessage } from "@/lib/system-messages";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);

    // Check if this is a new user (first login)
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
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}

