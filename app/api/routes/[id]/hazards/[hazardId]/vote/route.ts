import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST - Cast a "cleared" vote on a warning
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; hazardId: string }> }
) {
  try {
    const supabase = await createClient();
    const { hazardId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the hazard exists, is a warning, and is active
    const { data: hazard } = await supabase
      .from("route_hazards")
      .select("id, is_warning, status, clear_votes_count, clear_votes_needed")
      .eq("id", hazardId)
      .single();

    if (!hazard) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!hazard.is_warning) {
      return NextResponse.json({ error: "Not a warning" }, { status: 400 });
    }

    if (hazard.status !== "active") {
      return NextResponse.json({ error: "Warning already resolved" }, { status: 400 });
    }

    // Insert vote (trigger will handle count increment and auto-resolve)
    const { error } = await supabase
      .from("warning_clear_votes")
      .insert({ warning_id: hazardId, user_id: user.id });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Already voted" }, { status: 409 });
      }
      throw error;
    }

    // Re-fetch updated state (trigger may have resolved it)
    const { data: updated } = await supabase
      .from("route_hazards")
      .select("clear_votes_count, clear_votes_needed, status")
      .eq("id", hazardId)
      .single();

    return NextResponse.json({
      success: true,
      clear_votes_count: updated?.clear_votes_count || 0,
      clear_votes_needed: updated?.clear_votes_needed || 2,
      status: updated?.status || "active",
      user_voted: true,
    });
  } catch (error: any) {
    console.error("[WARNING_VOTE_POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
