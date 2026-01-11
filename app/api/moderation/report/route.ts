import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ReportSchema = z.object({
  contentType: z.enum(['review', 'message', 'property', 'route', 'comment', 'photo', 'profile', 'other']),
  contentId: z.string().uuid(),
  contentOwnerId: z.string().uuid().optional(),
  contentPreview: z.string().max(200).optional(),
  reportReason: z.enum([
    'spam', 'harassment', 'hate_speech', 'inappropriate_content',
    'off_platform_payment', 'fake_or_misleading', 'privacy_violation',
    'safety_concern', 'copyright', 'other'
  ]),
  reportDescription: z.string().max(100).optional(),
});

// POST - Submit a content report
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = ReportSchema.parse(body);

    // Get user's trust score
    const { data: userData } = await supabase
      .from("users")
      .select("trust_score")
      .eq("id", user.id)
      .single();

    // Check rate limiting
    const { data: canReport } = await supabase.rpc("can_user_report", { p_user_id: user.id });
    
    if (canReport === false) {
      return NextResponse.json({ 
        error: "You've reached the reporting limit. Please try again later." 
      }, { status: 429 });
    }

    // Check if user already reported this content
    const { data: existingReport } = await supabase
      .from("content_reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("content_type", validated.contentType)
      .eq("content_id", validated.contentId)
      .single();

    if (existingReport) {
      return NextResponse.json({ 
        error: "You have already reported this content" 
      }, { status: 400 });
    }

    // Create the report
    const { data: report, error: reportError } = await supabase
      .from("content_reports")
      .insert({
        reporter_id: user.id,
        reporter_trust_score: userData?.trust_score || 50,
        content_type: validated.contentType,
        content_id: validated.contentId,
        content_owner_id: validated.contentOwnerId,
        content_preview: validated.contentPreview,
        report_reason: validated.reportReason,
        report_description: validated.reportDescription,
        status: "pending",
      })
      .select()
      .single();

    if (reportError) {
      console.error("Error creating report:", reportError);
      return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }

    // Record the report for rate limiting
    await supabase.rpc("record_user_report", { p_user_id: user.id });

    // Check if this content now has multiple reports
    const { count } = await supabase
      .from("content_reports")
      .select("*", { count: "exact", head: true })
      .eq("content_type", validated.contentType)
      .eq("content_id", validated.contentId)
      .eq("status", "pending");

    // If multiple reports, add to flagged content or update existing
    if (count && count >= 2) {
      // Check if already in flagged content
      const { data: existingFlag } = await supabase
        .from("flagged_content")
        .select("id, report_count")
        .eq("content_type", validated.contentType)
        .eq("content_id", validated.contentId)
        .single();

      if (existingFlag) {
        // Update report count
        await supabase
          .from("flagged_content")
          .update({ 
            report_count: (existingFlag.report_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingFlag.id);
      } else {
        // Create new flagged content entry
        await supabase
          .from("flagged_content")
          .insert({
            content_type: validated.contentType,
            content_id: validated.contentId,
            content_owner_id: validated.contentOwnerId,
            content_text: validated.contentPreview,
            flag_source: "user_report",
            flag_reasons: [validated.reportReason],
            risk_score: 40, // Base score for multiple user reports
            report_count: count,
            status: "pending",
          });
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Thank you for your report. Our team will review it shortly.",
    }, { status: 201 });
  } catch (error: any) {
    console.error("Report error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to submit report" },
      { status: 500 }
    );
  }
}

// GET - Get user's own reports
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: reports, error } = await supabase
      .from("content_reports")
      .select("*")
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching reports:", error);
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

