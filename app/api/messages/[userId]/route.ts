import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: otherUserId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all messages between current user and other user
    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:sender_id(id, name, avatar_url),
        recipient:recipient_id(id, name, avatar_url),
        properties(id, name)
      `)
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Mark messages as read
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("recipient_id", user.id)
      .eq("sender_id", otherUserId)
      .eq("read", false);

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}



