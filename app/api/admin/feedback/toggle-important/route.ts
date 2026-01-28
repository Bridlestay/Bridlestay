import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { feedbackId, isImportant } = await request.json();

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_feedback")
      .update({ is_important: isImportant })
      .eq("id", feedbackId);

    if (error) {
      console.error("Error updating feedback:", error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error toggling important:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update feedback" },
      { status: 500 }
    );
  }
}

