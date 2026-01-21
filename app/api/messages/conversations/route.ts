import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all conversations (grouped by other person)
    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:sender_id(id, name, avatar_url),
        recipient:recipient_id(id, name, avatar_url),
        properties(id, name)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching messages:", error);
      throw error;
    }

    // Group messages by conversation
    // Separate system messages, admin messages, and user messages
    const systemPriorityMessages: any[] = [];
    const adminDirectMessages: any[] = [];
    const userMessages: any[] = [];

    messages?.forEach((msg: any) => {
      if ((msg.message_type === 'system' || msg.message_type === 'admin_action') && msg.system_priority) {
        systemPriorityMessages.push(msg);
      } else if (msg.message_type === 'admin_action' && !msg.system_priority) {
        adminDirectMessages.push(msg);
      } else {
        userMessages.push(msg);
      }
    });

    const conversationsMap = new Map();

    // 1. Add system priority messages at the top (padoq system messages)
    systemPriorityMessages.forEach((msg: any) => {
      conversationsMap.set(`system-${msg.id}`, {
        userId: user.id,
        userName: msg.message_type === 'admin_action' ? 'padoq Admin' : 'padoq',
        userAvatar: null,
        lastMessage: msg.subject || msg.message,
        lastMessageTime: msg.created_at,
        unread: !msg.read,
        propertyId: null,
        propertyName: null,
        isSystem: true,
        priority: 1,
      });
    });

    // 2. Add admin direct messages (appear below system messages, above user messages)
    adminDirectMessages.forEach((msg: any) => {
      const otherUserId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      const otherUser = msg.sender_id === user.id ? msg.recipient : msg.sender;
      
      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          userName: otherUser?.name || "Admin",
          userAvatar: otherUser?.avatar_url,
          lastMessage: msg.message,
          lastMessageTime: msg.created_at,
          unread: msg.recipient_id === user.id && !msg.read,
          propertyId: msg.property_id,
          propertyName: msg.properties?.name,
          isSystem: false,
          isAdminMessage: true,
          priority: 2,
        });
      } else {
        const existing = conversationsMap.get(otherUserId);
        if (new Date(msg.created_at) > new Date(existing.lastMessageTime)) {
          existing.lastMessage = msg.message;
          existing.lastMessageTime = msg.created_at;
        }
        if (msg.recipient_id === user.id && !msg.read) {
          existing.unread = true;
        }
        // Preserve property context if ANY message in the conversation has a property_id
        if (msg.property_id && !existing.propertyId) {
          existing.propertyId = msg.property_id;
          existing.propertyName = msg.properties?.name;
        }
      }
    });

    // 3. Add regular user conversations
    userMessages.forEach((msg: any) => {
      const otherUserId =
        msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      const otherUser =
        msg.sender_id === user.id ? msg.recipient : msg.sender;

      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          userName: otherUser?.name || "Unknown",
          userAvatar: otherUser?.avatar_url,
          lastMessage: msg.message,
          lastMessageTime: msg.created_at,
          unread: msg.recipient_id === user.id && !msg.read,
          propertyId: msg.property_id,
          propertyName: msg.properties?.name,
          isSystem: false,
          priority: 3,
        });
      } else {
        const existing = conversationsMap.get(otherUserId);
        if (new Date(msg.created_at) > new Date(existing.lastMessageTime)) {
          existing.lastMessage = msg.message;
          existing.lastMessageTime = msg.created_at;
        }
        if (msg.recipient_id === user.id && !msg.read) {
          existing.unread = true;
        }
        // Preserve property context if ANY message in the conversation has a property_id
        if (msg.property_id && !existing.propertyId) {
          existing.propertyId = msg.property_id;
          existing.propertyName = msg.properties?.name;
        }
      }
    });

    // Sort conversations by priority (1=system, 2=admin, 3=user) then by time
    const conversations = Array.from(conversationsMap.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
