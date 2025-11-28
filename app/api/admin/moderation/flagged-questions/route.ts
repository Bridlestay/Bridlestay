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

    // Get all flagged questions with related data
    const { data: flaggedQuestions, error } = await supabase
      .from("flagged_questions")
      .select(`
        *,
        property_questions (
          id,
          question,
          answer,
          created_at,
          answered_at,
          asker:asker_id (id, name, email),
          properties (id, name, host:host_id (id, name, email))
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching flagged questions:", error);
      throw error;
    }

    return NextResponse.json({ flaggedQuestions: flaggedQuestions || [] });
  } catch (error: any) {
    console.error("Error fetching flagged questions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch flagged questions" },
      { status: 500 }
    );
  }
}



