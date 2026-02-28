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

    // Fetch route_reviews — try with review_text first, fall back to body only
    let reviewRows: any[] = [];
    const { data: reviewsWithText, error: reviewsError } = await supabase
      .from("route_reviews")
      .select("user_id, review_text, body, rating")
      .eq("route_id", routeId);

    if (reviewsError) {
      // review_text column may not exist yet — fall back to body only
      const { data: reviewsFallback } = await supabase
        .from("route_reviews")
        .select("user_id, body, rating")
        .eq("route_id", routeId);
      reviewRows = reviewsFallback || [];
    } else {
      reviewRows = reviewsWithText || [];
    }

    // Build lookups: user_id → review text, user_id → rating
    const reviewBodyMap = new Map<string, string>();
    const reviewRatingMap = new Map<string, number>();
    for (const r of reviewRows) {
      const text = r.review_text || r.body || "";
      if (text) {
        reviewBodyMap.set(r.user_id, text);
      }
      if (r.rating) {
        reviewRatingMap.set(r.user_id, r.rating);
      }
    }

    // Fetch user photos from route_user_photos (community uploads)
    let userPhotoRows: any[] = [];
    try {
      const { data } = await supabase
        .from("route_user_photos")
        .select("id, user_id, url, caption, uploaded_at")
        .eq("route_id", routeId)
        .order("uploaded_at", { ascending: false });
      userPhotoRows = data || [];
    } catch {
      // Table may not exist
    }

    // Also fetch route_photos uploaded by users (covers owner review photos)
    let routePhotoRows: any[] = [];
    try {
      const { data } = await supabase
        .from("route_photos")
        .select("id, uploaded_by_user_id, url, caption, created_at")
        .eq("route_id", routeId);
      routePhotoRows = data || [];
    } catch {
      // ignore
    }

    // Parse the JSON notes field to extract tags, short_note, and long_note
    const parsed = (completions || []).map((c: any) => {
      let tags: string[] = [];
      let shortNote = "";
      let longNote = "";
      try {
        if (c.notes) {
          const notesObj = JSON.parse(c.notes);
          tags = notesObj.tags || [];
          shortNote = notesObj.short_note || "";
          longNote = notesObj.long_note || "";
        }
      } catch {
        // notes might be plain text
        shortNote = c.notes || "";
      }

      // Collect photos for this user from both tables, normalize timestamps
      const photos = [
        ...userPhotoRows
          .filter((p) => p.user_id === c.user_id)
          .map((p) => ({ ...p, created_at: p.uploaded_at })),
        ...routePhotoRows.filter(
          (p) => p.uploaded_by_user_id === c.user_id
        ),
      ].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return {
        id: c.id,
        user: c.user,
        user_id: c.user_id,
        completed_at: c.completed_at,
        rating: c.rating || reviewRatingMap.get(c.user_id) || 0,
        tags,
        short_note: shortNote,
        long_note: longNote,
        review_body: reviewBodyMap.get(c.user_id) || "",
        photos,
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
