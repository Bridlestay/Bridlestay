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
      .select("role, name")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { reviewId, reviewType } = await request.json();

    if (!reviewId || !reviewType) {
      return NextResponse.json(
        { error: "Review ID and type are required" },
        { status: 400 }
      );
    }

    // Soft delete the review (mark as deleted but keep in database)
    const table = reviewType === "message" ? "flagged_messages" : "flagged_questions";
    
    const { error } = await supabase
      .from(table)
      .update({
        deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (error) throw error;

    // Log the action
    await supabase.from("admin_actions").insert({
      admin_id: user.id,
      action_type: "delete_moderation",
      reason: `Deleted ${reviewType} review`,
      metadata: {
        review_id: reviewId,
        review_type: reviewType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete review" },
      { status: 500 }
    );
  }
}



