import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSoftbanMessage } from "@/lib/system-messages";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminData } = await supabase
      .from("users")
      .select("role, name")
      .eq("id", user.id)
      .single();

    if (!adminData || adminData.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, reason, duration } = await request.json();

    if (!userId || !reason) {
      return NextResponse.json(
        { error: "User ID and reason are required" },
        { status: 400 }
      );
    }

    // Get target user info
    const { data: targetUser } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Softban the user
    const { error: softbanError } = await supabase
      .from("users")
      .update({
        softbanned: true,
        ban_reason: reason,
        banned_at: new Date().toISOString(),
        banned_by: user.id,
      })
      .eq("id", userId);

    if (softbanError) throw softbanError;

    // Log admin action
    await supabase.from("admin_actions").insert({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "softban_user",
      reason,
      metadata: {
        target_email: targetUser.email,
        target_name: targetUser.name,
        duration: duration || "indefinite",
      },
    });

    // Send system message to user
    const softbanMsg = getSoftbanMessage(
      userId,
      targetUser.name || "User",
      reason,
      adminData.name || "Admin",
      duration
    );

    await fetch(`${request.nextUrl.origin}/api/system/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(softbanMsg),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error softbanning user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to softban user" },
      { status: 500 }
    );
  }
}



