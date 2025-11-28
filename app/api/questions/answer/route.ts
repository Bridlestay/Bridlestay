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

    const { questionId, answer } = await request.json();

    if (!questionId || !answer) {
      return NextResponse.json(
        { error: "Question ID and answer are required" },
        { status: 400 }
      );
    }

    // Check if user owns the property
    const { data: question } = await supabase
      .from("property_questions")
      .select("*, properties(host_id)")
      .eq("id", questionId)
      .single();

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (question.properties.host_id !== user.id) {
      return NextResponse.json(
        { error: "Only the property owner can answer this question" },
        { status: 403 }
      );
    }

    // Moderate answer content
    const moderationResult = moderateMessage(answer);

    // If blocked, reject the answer
    if (moderationResult.blocked) {
      return NextResponse.json(
        { 
          error: getBlockedMessageText(moderationResult.reasons[0]),
          blocked: true 
        },
        { status: 400 }
      );
    }

    // Update question with answer
    const { data: updatedQuestion, error } = await supabase
      .from("property_questions")
      .update({
        answer,
        answered_at: new Date().toISOString(),
        flagged: question.flagged || moderationResult.flagged, // Keep existing flag or add new one
      })
      .eq("id", questionId)
      .select(`
        *,
        asker:asker_id(id, name, avatar_url)
      `)
      .single();

    if (error) throw error;

    // If flagged, create a flag record
    if (moderationResult.flagged && updatedQuestion) {
      console.log("⚠️ Answer flagged for moderation:", moderationResult);
      
      const serviceClient = createServiceClient();
      const { error: flagError } = await serviceClient
        .from("flagged_questions")
        .insert({
          question_id: updatedQuestion.id,
          flag_reason: moderationResult.reasons[0],
          severity: moderationResult.severity,
          matched_patterns: moderationResult.matched,
          content_type: 'answer',
        });

      if (flagError) {
        console.error("Error creating flag record:", flagError);
      } else {
        console.log("✅ Flagged answer record created successfully");
      }
    }

    // TODO: Notify asker about new answer
    // await notifyGuestAboutAnswer(question.asker_id, answer);

    return NextResponse.json({ 
      question: updatedQuestion,
      flagged: moderationResult.flagged 
    });
  } catch (error: any) {
    console.error("Error answering question:", error);
    return NextResponse.json(
      { error: error.message || "Failed to answer question" },
      { status: 500 }
    );
  }
}
