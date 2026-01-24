import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data: reviews, error } = await supabase
      .from("property_reviews")
      .select(`
        *,
        users:reviewer_id (id, name, avatar_url)
      `)
      .eq("property_id", params.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reviews: reviews || [] });
  } catch (error: any) {
    console.error("Error fetching property reviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

