import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

    const { feedbackId, adminResponse, status } = await request.json();

    if (!feedbackId || !status) {
      return NextResponse.json(
        { error: "Feedback ID and status are required" },
        { status: 400 }
      );
    }

    // Update feedback
    const { error } = await supabase
      .from("user_feedback")
      .update({
        status,
        admin_response: adminResponse || null,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", feedbackId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error responding to feedback:", error);
    return NextResponse.json(
      { error: error.message || "Failed to respond to feedback" },
      { status: 500 }
    );
  }
}

