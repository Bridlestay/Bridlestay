import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get property to check host
    const { data: property } = await supabase
      .from("properties")
      .select("host_id")
      .eq("id", propertyId)
      .single();

    // Get all questions for the property
    const { data: allQuestions, error } = await supabase
      .from("property_questions")
      .select(`
        *,
        asker:asker_id(id, name, avatar_url)
      `)
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filter questions based on user role and answer status
    let questions = allQuestions || [];
    
    if (user) {
      const isHost = user.id === property?.host_id;
      
      // If not host, only show:
      // 1. Answered questions (everyone can see)
      // 2. User's own questions (even if unanswered)
      if (!isHost) {
        questions = questions.filter(
          (q: any) => q.answer !== null || q.asker_id === user.id
        );
      }
      // Hosts can see all questions
    } else {
      // Anonymous users only see answered questions
      questions = questions.filter((q: any) => q.answer !== null);
    }

    const response = NextResponse.json({ questions });
    
    // Add cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error: any) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch questions" },
      { status: 500 }
    );
  }
}
