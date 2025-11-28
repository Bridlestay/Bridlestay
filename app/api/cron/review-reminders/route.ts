import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { format, subHours } from "date-fns";
import { sendReviewReminder } from "@/lib/email/send";

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// Run daily to send review reminders for bookings that ended 24 hours ago

export async function GET(request: Request) {
  try {
    // Optional: Add authorization header check for cron job security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Find bookings that ended approximately 24 hours ago
    // and haven't had review reminders sent yet
    const targetDate = subHours(new Date(), 24);
    const startWindow = subHours(targetDate, 2); // 2 hour window
    const endWindow = subHours(targetDate, -2);

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        start_date,
        end_date,
        guest_id,
        property_id,
        review_reminder_sent,
        properties:property_id (
          name,
          host_id
        )
      `
      )
      .eq("status", "completed")
      .gte("end_date", startWindow.toISOString())
      .lte("end_date", endWindow.toISOString())
      .is("review_reminder_sent", null);

    if (bookingsError) {
      console.error("Error fetching bookings for review reminders:", bookingsError);
      throw bookingsError;
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No bookings require review reminders",
        count: 0,
      });
    }

    console.log(`📧 Processing review reminders for ${bookings.length} bookings`);

    let sentCount = 0;
    let errorCount = 0;

    for (const booking of bookings) {
      try {
        // Get guest info
        const { data: guestData } = await supabase
          .from("users")
          .select("name, email")
          .eq("id", booking.guest_id)
          .single();

        // Get host info
        const { data: hostData } = await supabase
          .from("users")
          .select("name, email")
          .eq("id", booking.properties.host_id)
          .single();

        if (!guestData || !hostData) {
          console.error(`Missing user data for booking ${booking.id}`);
          errorCount++;
          continue;
        }

        // Send reminder to guest
        await sendReviewReminder({
          to: guestData.email,
          recipientName: guestData.name || 'Guest',
          recipientType: 'guest',
          otherPartyName: hostData.name || 'Host',
          propertyName: booking.properties.name,
          checkIn: format(new Date(booking.start_date), 'EEEE, MMMM d, yyyy'),
          checkOut: format(new Date(booking.end_date), 'EEEE, MMMM d, yyyy'),
          bookingId: booking.id,
        });

        // Send reminder to host
        await sendReviewReminder({
          to: hostData.email,
          recipientName: hostData.name || 'Host',
          recipientType: 'host',
          otherPartyName: guestData.name || 'Guest',
          propertyName: booking.properties.name,
          checkIn: format(new Date(booking.start_date), 'EEEE, MMMM d, yyyy'),
          checkOut: format(new Date(booking.end_date), 'EEEE, MMMM d, yyyy'),
          bookingId: booking.id,
        });

        // Mark reminder as sent
        await supabase
          .from("bookings")
          .update({ review_reminder_sent: new Date().toISOString() })
          .eq("id", booking.id);

        sentCount += 2; // Guest + Host
        console.log(`✅ Review reminders sent for booking ${booking.id}`);
      } catch (emailError) {
        console.error(`Failed to send review reminder for booking ${booking.id}:`, emailError);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Review reminders processed`,
      bookings: bookings.length,
      emailsSent: sentCount,
      errors: errorCount,
    });
  } catch (error: any) {
    console.error("Review reminder cron error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process review reminders" },
      { status: 500 }
    );
  }
}

