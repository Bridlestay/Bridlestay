import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { moderateMessage, getBlockedMessageText } from "@/lib/moderation";
import { sendNewMessageNotification } from "@/lib/email/send";
import { checkRateLimit, RATE_LIMITS, getIdentifier, rateLimitError } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting - 30 messages per minute
    const rateLimitResult = checkRateLimit(
      getIdentifier(request, user.id),
      RATE_LIMITS.messages
    );
    if (!rateLimitResult.success) {
      return rateLimitError(rateLimitResult);
    }

    const { recipientId, propertyId, subject, message } = await request.json();

    if (!recipientId || !message) {
      return NextResponse.json(
        { error: "Recipient and message are required" },
        { status: 400 }
      );
    }

    // ===== AUTO-MODERATION CHECK =====
    const moderationResult = moderateMessage(message);
    
    // If message should be blocked, reject it
    if (moderationResult.blocked) {
      return NextResponse.json(
        { 
          error: getBlockedMessageText(moderationResult.reasons),
          blocked: true,
          reasons: moderationResult.reasons
        },
        { status: 403 }
      );
    }

    // Insert message
    const { data: newMessage, error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        property_id: propertyId || null,
        subject: subject || null,
        message,
        flagged: moderationResult.flagged,
        blocked: false,
      })
      .select()
      .single();

    if (error) throw error;

    // If flagged (but not blocked), create flag record for admin review
    if (moderationResult.flagged && newMessage) {
      console.log("🚨 Message flagged, attempting to create flag records...");
      
      // Use service role client to bypass RLS for system-level moderation inserts
      const serviceClient = createServiceClient();
      
      for (const reason of moderationResult.reasons) {
        console.log("Inserting flag:", {
          message_id: newMessage.id,
          flag_reason: reason.type,
          severity: reason.severity,
          matched_patterns: reason.matchedPatterns,
        });
        
        const { data: flagData, error: flagError } = await serviceClient
          .from("flagged_messages")
          .insert({
            message_id: newMessage.id,
            flag_reason: reason.type,
            severity: reason.severity,
            matched_patterns: reason.matchedPatterns,
          })
          .select();
        
        if (flagError) {
          console.error("❌ Error creating flag record:", {
            error: flagError,
            code: flagError.code,
            message: flagError.message,
            details: flagError.details,
            hint: flagError.hint,
          });
        } else {
          console.log("✅ Flagged message created successfully:", flagData);
        }
      }
    } else {
      console.log("Message not flagged or newMessage is null");
    }

    // Send email notification to recipient
    try {
      const { data: recipientData } = await supabase
        .from("users")
        .select("name, email, email_notifications_enabled")
        .eq("id", recipientId)
        .single();

      const { data: senderData } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();

      let propertyName;
      if (propertyId) {
        const { data: propertyData } = await supabase
          .from("properties")
          .select("name")
          .eq("id", propertyId)
          .single();
        propertyName = propertyData?.name;
      }

      // Only send email if recipient has notifications enabled (default to true if not set)
      if (recipientData && senderData && (recipientData.email_notifications_enabled !== false)) {
        await sendNewMessageNotification({
          to: recipientData.email,
          recipientName: recipientData.name || 'there',
          senderName: senderData.name || 'A padoq user',
          propertyName,
          messagePreview: message,
          messageId: newMessage.id,
        });
        console.log(`✅ Message notification email sent to ${recipientData.email}`);
      }
    } catch (emailError) {
      // Don't fail the message send if email fails
      console.error("Failed to send message notification email:", emailError);
    }

    // Send in-app notification to recipient
    await createNotification({
      userId: recipientId,
      type: "message",
      title: `${user.user_metadata?.name || "Someone"} sent you a message`,
      body: message.length > 100 ? message.slice(0, 100) + "..." : message,
      link: "/messages",
      actorId: user.id,
    });

    return NextResponse.json({
      message: newMessage,
      flagged: moderationResult.flagged
    });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
