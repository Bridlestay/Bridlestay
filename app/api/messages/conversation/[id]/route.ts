import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all messages in the conversation
    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:sender_id(id, name, avatar_url),
        recipient:recipient_id(id, name, avatar_url),
        property:property_id(id, name)
      `)
      .eq("conversation_id", conversationId)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Mark messages as read
    await supabase.rpc("mark_conversation_read", {
      p_conversation_id: conversationId,
      p_user_id: user.id,
    });

    return NextResponse.json({ messages: messages || [] });
  } catch (error: any) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

