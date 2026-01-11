import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { differenceInHours } from "date-fns";

const RESOLUTION_WINDOW_HOURS = 48; // 48 hours after check-in

const CreateIssueSchema = z.object({
  bookingId: z.string().uuid(),
  issueType: z.enum([
    "misrepresentation",
    "cleanliness",
    "safety",
    "access_denied",
    "missing_amenities",
    "host_cancellation",
    "other",
  ]),
  description: z.string().min(20, "Please provide a detailed description"),
  evidenceUrls: z.array(z.string().url()).optional(),
});

// POST - Report an issue within the resolution window
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateIssueSchema.parse(body);

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        property:properties (id, name, host_id)
      `)
      .eq("id", validated.bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Determine reporter type
    const isGuest = booking.guest_id === user.id;
    const isHost = booking.property.host_id === user.id;

    if (!isGuest && !isHost) {
      return NextResponse.json({ error: "Not authorized for this booking" }, { status: 403 });
    }

    // Check if booking has started (check-in date has passed)
    const checkInDate = new Date(booking.start_date);
    const now = new Date();

    if (now < checkInDate) {
      return NextResponse.json({ 
        error: "Issues can only be reported after check-in has started" 
      }, { status: 400 });
    }

    // Check if within resolution window (48 hours from check-in)
    const hoursSinceCheckin = differenceInHours(now, checkInDate);
    const isWithinWindow = hoursSinceCheckin <= RESOLUTION_WINDOW_HOURS;

    if (!isWithinWindow) {
      return NextResponse.json({ 
        error: `The ${RESOLUTION_WINDOW_HOURS}-hour issue reporting window has expired. Issues must be reported within ${RESOLUTION_WINDOW_HOURS} hours of check-in.` 
      }, { status: 400 });
    }

    // Check if issue already exists for this booking
    const { data: existingIssue } = await supabase
      .from("booking_issues")
      .select("id, status")
      .eq("booking_id", validated.bookingId)
      .eq("reporter_id", user.id)
      .not("status", "in", '("rejected","resolved")')
      .single();

    if (existingIssue) {
      return NextResponse.json({ 
        error: "You have already reported an issue for this booking that is still being reviewed" 
      }, { status: 400 });
    }

    // Create the issue
    const { data: issue, error: issueError } = await supabase
      .from("booking_issues")
      .insert({
        booking_id: validated.bookingId,
        reporter_id: user.id,
        reporter_type: isGuest ? "guest" : "host",
        issue_type: validated.issueType,
        description: validated.description,
        evidence_urls: validated.evidenceUrls || [],
        status: "pending",
        reported_within_window: isWithinWindow,
      })
      .select()
      .single();

    if (issueError) {
      console.error("Error creating issue:", issueError);
      return NextResponse.json({ error: "Failed to report issue" }, { status: 500 });
    }

    // Update booking resolution window status
    await supabase
      .from("bookings")
      .update({
        resolution_window_status: "issue_reported",
        resolution_window_ends_at: new Date(checkInDate.getTime() + RESOLUTION_WINDOW_HOURS * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", validated.bookingId);

    // TODO: Send notification to platform admins
    // TODO: Send notification to the other party (host/guest)

    return NextResponse.json({ 
      issue,
      message: "Issue reported successfully. Our team will review it shortly.",
    }, { status: 201 });
  } catch (error: any) {
    console.error("Issue reporting error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to report issue" },
      { status: 500 }
    );
  }
}

// GET - Get issues for a booking
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    let query = supabase
      .from("booking_issues")
      .select(`
        *,
        booking:bookings (id, start_date, end_date, property_id),
        reporter:users!booking_issues_reporter_id_fkey (id, name, avatar_url)
      `)
      .order("created_at", { ascending: false });

    if (bookingId) {
      query = query.eq("booking_id", bookingId);
    }

    const { data: issues, error } = await query;

    if (error) {
      console.error("Error fetching issues:", error);
      return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
    }

    return NextResponse.json({ issues: issues || [] });
  } catch (error: any) {
    console.error("Issue fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch issues" },
      { status: 500 }
    );
  }
}

