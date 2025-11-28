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

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all flagged messages with related data (exclude deleted reviews)
    const { data: flaggedMessages, error } = await supabase
      .from("flagged_messages")
      .select(`
        *,
        messages (
          id,
          message,
          created_at,
          deleted,
          deleted_at,
          sender:sender_id (id, name, email),
          recipient:recipient_id (id, name, email),
          properties (id, name)
        )
      `)
      .eq("deleted", false)
      .order("created_at", { ascending: false });

    console.log("Flagged messages query result:", { flaggedMessages, error });

    if (error) {
      console.error("Error fetching flagged messages:", error);
      throw error;
    }

    return NextResponse.json({ flaggedMessages: flaggedMessages || [] });
  } catch (error: any) {
    console.error("Error fetching flagged messages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch flagged messages" },
      { status: 500 }
    );
  }
}

