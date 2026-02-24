import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const { data: completions, error } = await supabase
      .from("route_completions")
      .select(
        `
        id,
        route_id,
        user_id,
        completed_at,
        notes,
        rating,
        user:users!route_completions_user_id_fkey(id, name, avatar_url)
      `
      )
      .eq("route_id", routeId)
      .order("completed_at", { ascending: false });

    if (error) throw error;

    // Also fetch route_reviews to get full review body text
    const { data: reviews } = await supabase
      .from("route_reviews")
      .select("user_id, review_text, body")
      .eq("route_id", routeId);

    // Build lookup: user_id → full review text
    const reviewBodyMap = new Map<string, string>();
    if (reviews) {
      for (const r of reviews as any[]) {
        const text = r.review_text || r.body || "";
        if (text) {
          reviewBodyMap.set(r.user_id, text);
        }
      }
    }

    // Parse the JSON notes field to extract tags and short_note
    const parsed = (completions || []).map((c: any) => {
      let tags: string[] = [];
      let shortNote = "";
      try {
        if (c.notes) {
          const notesObj = JSON.parse(c.notes);
          tags = notesObj.tags || [];
          shortNote = notesObj.short_note || "";
        }
      } catch {
        // notes might be plain text
        shortNote = c.notes || "";
      }
      return {
        id: c.id,
        user: c.user,
        user_id: c.user_id,
        completed_at: c.completed_at,
        rating: c.rating,
        tags,
        short_note: shortNote,
        review_body: reviewBodyMap.get(c.user_id) || "",
      };
    });

    return NextResponse.json({ completions: parsed });
  } catch (error: any) {
    console.error("[ROUTE_COMPLETIONS_GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch completions" },
      { status: 500 }
    );
  }
}
