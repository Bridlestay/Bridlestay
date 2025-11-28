import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Send a system message (bypasses normal user-to-user restrictions)
 * Used for welcome messages, admin actions, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const { recipientId, subject, message, messageType, systemPriority } = await request.json();

    if (!recipientId || !message || !messageType) {
      return NextResponse.json(
        { error: "Recipient ID, message, and message type are required" },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS
    const serviceClient = createServiceClient();

    // Create system message
    const { data: systemMessage, error } = await serviceClient
      .from("messages")
      .insert({
        sender_id: recipientId, // System messages appear to come from the user themselves
        recipient_id: recipientId,
        subject: subject || "System Message",
        message,
        message_type: messageType,
        system_priority: systemPriority || false,
        read: false, // Always unread initially
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating system message:", error);
      throw error;
    }

    console.log("✅ System message sent:", systemMessage.id);

    return NextResponse.json({ success: true, message: systemMessage });
  } catch (error: any) {
    console.error("Error sending system message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send system message" },
      { status: 500 }
    );
  }
}



