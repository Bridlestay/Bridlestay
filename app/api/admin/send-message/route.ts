import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Send a message from admin to a user
 * These messages appear at the top of the user's inbox (below system priority messages)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify admin authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const { recipientId, subject, message } = await request.json();

    if (!recipientId || !message) {
      return NextResponse.json(
        { error: "Recipient ID and message are required" },
        { status: 400 }
      );
    }

    // Use service client to send admin message
    const serviceClient = createServiceClient();

    // Create admin message
    // message_type: 'admin_action' but system_priority: false
    // This makes it appear below BridleStay system messages (which have system_priority: true)
    // but above regular user messages
    const { data: adminMessage, error } = await serviceClient
      .from("messages")
      .insert({
        sender_id: user.id, // Admin's user ID as sender
        recipient_id: recipientId,
        subject: subject || "Message from Admin",
        message,
        message_type: "admin_action",
        system_priority: false, // Below system messages, but above regular messages
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating admin message:", error);
      throw error;
    }

    console.log("✅ Admin message sent:", adminMessage.id);

    return NextResponse.json({ success: true, message: adminMessage });
  } catch (error: any) {
    console.error("Error sending admin message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send admin message" },
      { status: 500 }
    );
  }
}

