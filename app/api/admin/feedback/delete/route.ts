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

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { feedbackId } = await request.json();

    if (!feedbackId) {
      return NextResponse.json(
        { error: "Feedback ID is required" },
        { status: 400 }
      );
    }

    // Soft delete the feedback (mark as deleted but keep in database)
    const { error } = await supabase
      .from("user_feedback")
      .update({
        deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", feedbackId);

    if (error) throw error;

    // Log the action
    await supabase.from("admin_actions").insert({
      admin_id: user.id,
      action_type: "delete_feedback",
      reason: "Deleted user feedback",
      metadata: {
        feedback_id: feedbackId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting feedback:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete feedback" },
      { status: 500 }
    );
  }
}

