import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Get all feedback with user data (exclude deleted)
    const { data: feedback, error } = await supabase
      .from("user_feedback")
      .select(`
        *,
        users:user_id (id, name, email, role, avatar_url)
      `)
      .eq("deleted", false)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ feedback: feedback || [] });
  } catch (error: any) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

