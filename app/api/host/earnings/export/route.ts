import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a host
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'host') {
      return NextResponse.json({ error: 'Only hosts can export earnings' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Fetch all completed bookings for this host
    let query = supabase
      .from('bookings')
      .select(`
        id,
        check_in_date,
        check_out_date,
        total_price_pennies,
        guest_count,
        horse_count,
        status,
        created_at,
        property:property_id (
          title,
          address
        ),
        guest:guest_id (
          name,
          email
        )
      `)
      .eq('host_id', user.id)
      .eq('status', 'completed')
      .order('check_in_date', { ascending: false });

    if (startDate) {
      query = query.gte('check_in_date', startDate);
    }
    if (endDate) {
      query = query.lte('check_out_date', endDate);
    }

    const { data: bookings, error } = await query;

    if (error) throw error;

    // Calculate host earnings (after platform fee)
    const HOST_FEE_PERCENTAGE = 0.025; // 2.5%

    // Generate CSV
    const csvRows = [];
    
    // Header
    csvRows.push([
      'Booking ID',
      'Check In',
      'Check Out',
      'Property',
      'Guest Name',
      'Guest Email',
      'Guests',
      'Horses',
      'Total Price (£)',
      'Platform Fee (£)',
      'Your Earnings (£)',
      'Status',
      'Booked On'
    ].join(','));

    // Data rows
    for (const booking of bookings || []) {
      const totalPrice = (booking.total_price_pennies || 0) / 100;
      const platformFee = totalPrice * HOST_FEE_PERCENTAGE;
      const hostEarnings = totalPrice - platformFee;

      // Handle nested objects (Supabase returns them as objects, not arrays)
      const property = booking.property as any;
      const guest = booking.guest as any;

      csvRows.push([
        booking.id,
        booking.check_in_date,
        booking.check_out_date,
        `"${property?.title || 'Unknown'}"`,
        `"${guest?.name || 'Unknown'}"`,
        guest?.email || '',
        booking.guest_count || 0,
        booking.horse_count || 0,
        totalPrice.toFixed(2),
        platformFee.toFixed(2),
        hostEarnings.toFixed(2),
        booking.status,
        new Date(booking.created_at).toISOString().split('T')[0]
      ].join(','));
    }

    const csvContent = csvRows.join('\n');

    // Generate filename with date range
    const filename = startDate && endDate
      ? `earnings-${startDate}-to-${endDate}.csv`
      : `earnings-all-time.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting earnings:', error);
    return NextResponse.json(
      { error: 'Failed to export earnings' },
      { status: 500 }
    );
  }
}

