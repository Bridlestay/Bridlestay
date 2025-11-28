import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Disable caching
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId } = await request.json();

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID required" },
        { status: 400 }
      );
    }

    // First, get the question to verify ownership
    const { data: question, error: fetchError } = await supabase
      .from("property_questions")
      .select("id, property_id")
      .eq("id", questionId)
      .single();

    if (fetchError || !question) {
      console.error("Error fetching question:", fetchError);
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Now get the property to check ownership
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("host_id")
      .eq("id", question.property_id)
      .single();

    if (propertyError || !property) {
      console.error("Error fetching property:", propertyError);
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.host_id !== user.id) {
      return NextResponse.json(
        { error: "Only the property owner can delete this question" },
        { status: 403 }
      );
    }

    // Delete the question
    const { data: deleteData, error: deleteError } = await supabase
      .from("property_questions")
      .delete()
      .eq("id", questionId)
      .select();

    console.log("Delete operation result:", { deleteData, deleteError });

    if (deleteError) {
      console.error("❌ Error deleting question:", deleteError);
      return NextResponse.json(
        { error: deleteError.message, code: deleteError.code },
        { status: 500 }
      );
    }

    if (!deleteData || deleteData.length === 0) {
      console.error("❌ No question was deleted - possible RLS issue");
      return NextResponse.json(
        { error: "Question could not be deleted - check permissions" },
        { status: 403 }
      );
    }

    console.log("✅ Question deleted successfully:", questionId, deleteData);

    return NextResponse.json({ success: true, deleted: deleteData });
  } catch (error: any) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete question" },
      { status: 500 }
    );
  }
}

