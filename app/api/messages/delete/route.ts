import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID required" },
        { status: 400 }
      );
    }

    // Verify the user is the sender
    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("id, sender_id")
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    if (message.sender_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own messages" },
        { status: 403 }
      );
    }

    // Soft delete the message
    const { error: deleteError } = await supabase
      .from("messages")
      .update({
        deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", messageId);

    if (deleteError) {
      console.error("Error deleting message:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete message" },
      { status: 500 }
    );
  }
}



