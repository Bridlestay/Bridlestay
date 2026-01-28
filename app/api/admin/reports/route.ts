import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Admin Reports API
 * 
 * Fetches content reports with user details for admin moderation.
 * Uses service role to bypass RLS for admin access.
 */

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  
  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = getAdminSupabase();

    // First get the reports
    const { data: reports, error: reportsError } = await adminSupabase
      .from("content_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (reportsError) {
      console.error("Error fetching reports:", reportsError);
      throw reportsError;
    }

    // Fetch reporter and content owner details separately for each report
    const enrichedReports = await Promise.all(
      (reports || []).map(async (report) => {
        let reporter = null;
        let contentOwner = null;

        // Fetch reporter
        if (report.reporter_id) {
          const { data } = await adminSupabase
            .from("users")
            .select("id, name, avatar_url, trust_score, email")
            .eq("id", report.reporter_id)
            .single();
          reporter = data;
        }

        // Fetch content owner
        if (report.content_owner_id) {
          const { data } = await adminSupabase
            .from("users")
            .select("id, name, avatar_url, email")
            .eq("id", report.content_owner_id)
            .single();
          contentOwner = data;
        }

        return {
          ...report,
          reporter,
          content_owner: contentOwner,
        };
      })
    );

    return NextResponse.json({ reports: enrichedReports });
  } catch (error: any) {
    console.error("Error in admin reports API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

