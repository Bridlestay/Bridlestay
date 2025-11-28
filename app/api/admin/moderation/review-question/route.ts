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

    const { flaggedQuestionId, actionTaken, adminNotes } = await request.json();

    if (!flaggedQuestionId || !actionTaken) {
      return NextResponse.json(
        { error: "Flagged question ID and action taken are required" },
        { status: 400 }
      );
    }

    // Update the flagged question record
    const { error } = await supabase
      .from("flagged_questions")
      .update({
        reviewed: true,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        action_taken: actionTaken,
        admin_notes: adminNotes || null,
      })
      .eq("id", flaggedQuestionId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error reviewing flagged question:", error);
    return NextResponse.json(
      { error: error.message || "Failed to review flagged question" },
      { status: 500 }
    );
  }
}



