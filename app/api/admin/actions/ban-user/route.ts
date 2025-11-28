import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBanMessage } from "@/lib/system-messages";

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

    const { userId, reason } = await request.json();

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

    // Ban the user
    const { error: banError } = await supabase
      .from("users")
      .update({
        banned: true,
        ban_reason: reason,
        banned_at: new Date().toISOString(),
        banned_by: user.id,
      })
      .eq("id", userId);

    if (banError) throw banError;

    // Log admin action
    await supabase.from("admin_actions").insert({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "ban_user",
      reason,
      metadata: {
        target_email: targetUser.email,
        target_name: targetUser.name,
      },
    });

    // Send system message to user
    const banMsg = getBanMessage(
      userId,
      targetUser.name || "User",
      reason,
      adminData.name || "Admin"
    );

    await fetch(`${request.nextUrl.origin}/api/system/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(banMsg),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error banning user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to ban user" },
      { status: 500 }
    );
  }
}



