import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { moderateMessage, getBlockedMessageText } from "@/lib/moderation";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId, question } = await request.json();

    if (!propertyId || !question) {
      return NextResponse.json(
        { error: "Property ID and question are required" },
        { status: 400 }
      );
    }

    // Moderate question content
    const moderationResult = moderateMessage(question);

    // If blocked, reject the question
    if (moderationResult.blocked) {
      return NextResponse.json(
        { 
          error: getBlockedMessageText(moderationResult.reasons[0]),
          blocked: true 
        },
        { status: 400 }
      );
    }

    // Insert question
    const { data: newQuestion, error } = await supabase
      .from("property_questions")
      .insert({
        property_id: propertyId,
        asker_id: user.id,
        question,
        flagged: moderationResult.flagged,
      })
      .select(`
        *,
        asker:asker_id(id, name, avatar_url)
      `)
      .single();

    if (error) throw error;

    // If flagged, create a flag record
    if (moderationResult.flagged && newQuestion) {
      console.log("⚠️ Question flagged for moderation:", moderationResult);
      
      const serviceClient = createServiceClient();
      const { error: flagError } = await serviceClient
        .from("flagged_questions")
        .insert({
          question_id: newQuestion.id,
          flag_reason: moderationResult.reasons[0],
          severity: moderationResult.severity,
          matched_patterns: moderationResult.matched,
          content_type: 'question',
        });

      if (flagError) {
        console.error("Error creating flag record:", flagError);
      } else {
        console.log("✅ Flagged question record created successfully");
      }
    }

    // TODO: Notify property owner about new question
    // await notifyHostAboutQuestion(propertyId, question);

    return NextResponse.json({ 
      question: newQuestion,
      flagged: moderationResult.flagged 
    });
  } catch (error: any) {
    console.error("Error asking question:", error);
    return NextResponse.json(
      { error: error.message || "Failed to ask question" },
      { status: 500 }
    );
  }
}
