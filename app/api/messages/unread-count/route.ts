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

    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("read", false);

    if (error) throw error;

    return NextResponse.json({ count: count || 0 });
  } catch (error: any) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
