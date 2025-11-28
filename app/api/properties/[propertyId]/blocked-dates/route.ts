import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { propertyId: string } }
) {
  try {
    const supabase = await createClient();
    const { propertyId } = params;

    // Get availability blocks (manual blocks by host)
    const { data: blocks } = await supabase
      .from("availability_blocks")
      .select("start_date, end_date")
      .eq("property_id", propertyId);

    // Get confirmed bookings (auto-blocked dates)
    const { data: bookings } = await supabase
      .from("bookings")
      .select("start_date, end_date")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "requested"]); // Block both confirmed and pending requests

    // Combine all blocked date ranges
    const blockedRanges = [
      ...(blocks || []).map((b) => ({
        start: b.start_date,
        end: b.end_date,
      })),
      ...(bookings || []).map((b) => ({
        start: b.start_date,
        end: b.end_date,
      })),
    ];

    // Convert ranges to individual blocked dates
    const blockedDates = new Set<string>();
    blockedRanges.forEach((range) => {
      const start = new Date(range.start);
      const end = new Date(range.end);
      
      // Include all dates from start to end (inclusive)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        blockedDates.add(d.toISOString().split('T')[0]);
      }
    });

    return NextResponse.json({
      blockedDates: Array.from(blockedDates),
      blockedRanges,
    });
  } catch (error: any) {
    console.error("Error fetching blocked dates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch blocked dates" },
      { status: 500 }
    );
  }
}

