import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { WaypointSuggestionEmail } from "@/lib/email/templates/waypoint-suggestion";

const resend = new Resend(process.env.RESEND_API_KEY);

// POST - Send email notification to route owner about new waypoint suggestion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await params;
    const body = await request.json();
    const { suggestionId, routeTitle, waypointName, suggesterName } = body;

    if (!suggestionId || !routeTitle || !waypointName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch route owner details
    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select(`
        id,
        title,
        owner_user_id,
        users:owner_user_id(id, email, name)
      `)
      .eq("id", routeId)
      .single();

    if (routeError || !route || !route.users) {
      console.error("[SUGGESTION_NOTIFY] Route not found:", routeError);
      return NextResponse.json(
        { error: "Route or owner not found" },
        { status: 404 }
      );
    }

    const owner = route.users;

    if (!owner.email) {
      console.error("[SUGGESTION_NOTIFY] Owner has no email");
      return NextResponse.json(
        { error: "Owner has no email" },
        { status: 400 }
      );
    }

    // Fetch suggestion details
    const { data: suggestion } = await supabase
      .from("waypoint_suggestions")
      .select("tag, description")
      .eq("id", suggestionId)
      .single();

    const routeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://padoq.co.uk"}/routes?routeId=${routeId}`;

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Padoq <notifications@padoq.co.uk>",
      to: owner.email,
      subject: `New waypoint suggestion for "${routeTitle}"`,
      react: WaypointSuggestionEmail({
        routeOwnerName: owner.name || "Route Owner",
        routeTitle: routeTitle,
        waypointName: waypointName,
        suggesterName: suggesterName,
        waypointTag: suggestion?.tag || "note",
        waypointDescription: suggestion?.description || undefined,
        routeUrl: routeUrl,
      }),
    });

    if (emailError) {
      console.error("[SUGGESTION_NOTIFY] Email error:", emailError);
      return NextResponse.json(
        { error: "Failed to send email", details: emailError },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, emailId: emailData?.id });
  } catch (error: any) {
    console.error("[SUGGESTION_NOTIFY] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notification" },
      { status: 500 }
    );
  }
}
