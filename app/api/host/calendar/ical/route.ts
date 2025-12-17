import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import ical from "ical-generator";

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

    // Get all bookings (confirmed and pending) for next 12 months
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        *,
        properties!inner (id, name, host_id, city, county),
        users:guest_id (name)
      `)
      .eq("properties.host_id", user.id)
      .in("status", ["confirmed", "pending", "requested"])
      .gte("check_in", new Date().toISOString())
      .lte("check_out", oneYearFromNow.toISOString())
      .order("check_in", { ascending: true });

    if (error) throw error;

    // Create iCal calendar
    const calendar = ical({
      name: 'Bridlestay Bookings',
      description: 'Your confirmed bookings from Bridlestay',
      timezone: 'Europe/London',
      ttl: 3600, // Refresh every hour
    });

    // Add each booking as an event
    bookings?.forEach((booking) => {
      const property = booking.properties;
      const guest = booking.users;
      const status = booking.status.toUpperCase();
      
      calendar.createEvent({
        start: new Date(booking.check_in),
        end: new Date(booking.check_out),
        summary: `[${status}] ${property.name} - ${guest?.name || 'Guest'}`,
        description: [
          `Booking for ${property.name}`,
          `Status: ${booking.status}`,
          `Guest: ${guest?.name || 'N/A'}`,
          `Guests: ${booking.num_guests || 0}`,
          `Horses: ${booking.num_horses || 0}`,
          `Location: ${property.city}, ${property.county}`,
          `Total: £${((booking.total_price_pennies || 0) / 100).toFixed(2)}`,
          ``,
          `View booking: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`,
        ].join('\n'),
        location: `${property.city}, ${property.county}`,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`,
        organizer: {
          name: 'Bridlestay',
          email: 'bookings@bridlestay.com'
        },
        attendees: guest?.name ? [{
          name: guest.name,
          email: 'guest@example.com',
          rsvp: booking.status === 'confirmed' ? 'ACCEPTED' : 'NEEDS-ACTION',
          status: booking.status === 'confirmed' ? 'ACCEPTED' : 'TENTATIVE'
        }] : []
      });
    });

    // Return iCal file
    const icalString = calendar.toString();
    
    return new NextResponse(icalString, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="bridlestay-bookings.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error("Error generating iCal feed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate calendar feed" },
      { status: 500 }
    );
  }
}

