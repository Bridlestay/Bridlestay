import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

// Get host earnings statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'all'; // all, month, year

    // Get host's properties
    const { data: properties } = await supabase
      .from("properties")
      .select("id")
      .eq("host_id", user.id);

    if (!properties || properties.length === 0) {
      return NextResponse.json({
        totalEarnings: 0,
        monthlyEarnings: 0,
        yearlyEarnings: 0,
        pendingPayouts: 0,
        bookingHistory: [],
        taxBreakdown: { totalRevenue: 0, hostFees: 0, vat: 0, netEarnings: 0 },
      });
    }

    const propertyIds = properties.map(p => p.id);

    // Get all confirmed bookings for host's properties
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        id,
        start_date,
        end_date,
        base_price_pennies,
        host_fee_pennies,
        host_fee_vat_pennies,
        total_charge_pennies,
        status,
        created_at,
        properties!inner(id, name),
        guest:guest_id(name)
      `)
      .in("property_id", propertyIds)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate earnings
    let totalEarnings = 0;
    let monthlyEarnings = 0;
    let yearlyEarnings = 0;
    let pendingPayouts = 0;
    let totalHostFees = 0;
    let totalHostVat = 0;

    const bookingHistory = (bookings || []).map((booking: any) => {
      const bookingDate = new Date(booking.created_at);
      const bookingMonth = bookingDate.getMonth();
      const bookingYear = bookingDate.getFullYear();
      
      // Host earnings = base_price - host_fee - host_fee_vat
      const hostEarnings = booking.base_price_pennies - booking.host_fee_pennies - booking.host_fee_vat_pennies;
      
      totalEarnings += hostEarnings;
      totalHostFees += booking.host_fee_pennies;
      totalHostVat += booking.host_fee_vat_pennies;

      if (bookingMonth === currentMonth && bookingYear === currentYear) {
        monthlyEarnings += hostEarnings;
      }

      if (bookingYear === currentYear) {
        yearlyEarnings += hostEarnings;
      }

      // Check if booking is in the future (pending payout)
      const endDate = new Date(booking.end_date);
      if (endDate > now) {
        pendingPayouts += hostEarnings;
      }

      return {
        id: booking.id,
        propertyName: booking.properties.name,
        guestName: booking.guest?.name || "Guest",
        startDate: booking.start_date,
        endDate: booking.end_date,
        basePrice: booking.base_price_pennies,
        hostFee: booking.host_fee_pennies,
        hostVat: booking.host_fee_vat_pennies,
        netEarnings: hostEarnings,
        status: booking.status,
        createdAt: booking.created_at,
      };
    });

    const taxBreakdown = {
      totalRevenue: bookings?.reduce((sum, b) => sum + b.base_price_pennies, 0) || 0,
      hostFees: totalHostFees,
      vat: totalHostVat,
      netEarnings: totalEarnings,
    };

    return NextResponse.json({
      totalEarnings,
      monthlyEarnings,
      yearlyEarnings,
      pendingPayouts,
      bookingHistory,
      taxBreakdown,
    });
  } catch (error: any) {
    console.error("Error fetching earnings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch earnings" },
      { status: 500 }
    );
  }
}



