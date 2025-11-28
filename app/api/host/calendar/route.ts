import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get date range from query params (default to current month)
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start') || startOfMonth(new Date()).toISOString();
    const end = searchParams.get('end') || endOfMonth(new Date()).toISOString();

    // Get all bookings for host's properties in date range
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        *,
        properties!inner (id, name, host_id),
        users:guest_id (id, name, email, avatar_url)
      `)
      .eq("properties.host_id", user.id)
      .gte("check_in", start)
      .lte("check_out", end)
      .order("check_in", { ascending: true });

    if (error) throw error;

    // Get property availability blocks
    const { data: availability } = await supabase
      .from("property_availability")
      .select(`
        *,
        properties!inner (id, name, host_id)
      `)
      .eq("properties.host_id", user.id)
      .gte("start_date", start)
      .lte("end_date", end);

    // Calculate revenue and stats
    const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];
    const pendingBookings = bookings?.filter(b => b.status === 'pending') || [];
    
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.total_price_pennies || 0), 0);
    const pendingRevenue = pendingBookings.reduce((sum, b) => sum + (b.total_price_pennies || 0), 0);

    return NextResponse.json({
      bookings: bookings || [],
      availability: availability || [],
      stats: {
        totalBookings: bookings?.length || 0,
        confirmedBookings: confirmedBookings.length,
        pendingBookings: pendingBookings.length,
        totalRevenue,
        pendingRevenue,
      }
    });
  } catch (error: any) {
    console.error("Error fetching calendar data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}



