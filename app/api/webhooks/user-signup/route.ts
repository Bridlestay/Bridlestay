import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email/send";

// This endpoint can be triggered after user signup
// Option 1: Called from client-side after successful signup
// Option 2: Setup as Supabase webhook/trigger

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

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("name, email, welcome_email_sent")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if welcome email already sent
    if (userData.welcome_email_sent) {
      return NextResponse.json({
        success: true,
        message: "Welcome email already sent",
      });
    }

    // Send welcome email
    await sendWelcomeEmail({
      to: userData.email,
      userName: userData.name || 'there',
    });

    // Mark welcome email as sent
    await supabase
      .from("users")
      .update({ welcome_email_sent: new Date().toISOString() })
      .eq("id", user.id);

    console.log(`✅ Welcome email sent to ${userData.email}`);

    return NextResponse.json({
      success: true,
      message: "Welcome email sent",
    });
  } catch (error: any) {
    console.error("Welcome email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send welcome email" },
      { status: 500 }
    );
  }
}

