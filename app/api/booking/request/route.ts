import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { calculatePriceBreakdown } from "@/lib/fees";
import { NextResponse } from "next/server";
import { differenceInDays, format } from "date-fns";
import { sendBookingRequestHost } from "@/lib/email/send";
import { checkRateLimit, RATE_LIMITS, getIdentifier, rateLimitError } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting - 20 requests per minute
    const rateLimitResult = checkRateLimit(
      getIdentifier(request, user.id),
      RATE_LIMITS.booking
    );
    if (!rateLimitResult.success) {
      return rateLimitError(rateLimitResult);
    }

    const body = await request.json();
    const { propertyId, startDate, endDate, guests, horses, horseIds } = body;

    if (!propertyId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const guestCount = guests || 1;
    const horseCount = horses || 0;
    const selectedHorseIds = horseIds || [];

    // Get property details with equine info for accurate horse capacity
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select(`
        *,
        property_equine (max_horses)
      `)
      .eq("id", propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Get max_horses from property_equine (the authoritative source)
    const equineData = Array.isArray(property.property_equine) 
      ? property.property_equine[0] 
      : property.property_equine;
    const maxHorses = equineData?.max_horses ?? property.max_horses ?? 0;
    
    // Debug logging
    console.log("[BOOKING] Property equine data:", property.property_equine);
    console.log("[BOOKING] Max horses calculation:", { equineData, maxHorses, propertyMaxHorses: property.max_horses });

    // Prevent hosts from booking their own properties
    if (property.host_id === user.id) {
      return NextResponse.json(
        { error: "You cannot book your own property" },
        { status: 403 }
      );
    }

    const requestStart = new Date(startDate);
    const requestEnd = new Date(endDate);

    // Check availability blocks (manual blocks by host)
    const { data: blocks } = await supabase
      .from("availability_blocks")
      .select("*")
      .eq("property_id", propertyId);

    const hasBlockOverlap = blocks?.some((block) => {
      const blockStart = new Date(block.start_date);
      const blockEnd = new Date(block.end_date);

      return (
        (requestStart >= blockStart && requestStart < blockEnd) ||
        (requestEnd > blockStart && requestEnd <= blockEnd) ||
        (requestStart <= blockStart && requestEnd >= blockEnd)
      );
    });

    if (hasBlockOverlap) {
      return NextResponse.json(
        { error: "Property is not available for these dates (blocked by host)" },
        { status: 400 }
      );
    }

    // Check existing bookings (confirmed or pending)
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_date, end_date, status")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "requested"]); // Don't allow overlapping with pending requests

    const hasBookingOverlap = existingBookings?.some((booking) => {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);

      return (
        (requestStart >= bookingStart && requestStart < bookingEnd) ||
        (requestEnd > bookingStart && requestEnd <= bookingEnd) ||
        (requestStart <= bookingStart && requestEnd >= bookingEnd)
      );
    });

    if (hasBookingOverlap) {
      return NextResponse.json(
        { error: "Property is not available for these dates (already booked)" },
        { status: 400 }
      );
    }

    // Calculate fees
    const nights = differenceInDays(requestEnd, requestStart);
    if (nights < 1) {
      return NextResponse.json(
        { error: "Minimum stay is 1 night" },
        { status: 400 }
      );
    }

    // Validate guest and horse capacity
    if (guestCount > property.max_guests) {
      return NextResponse.json(
        { error: `Property can only accommodate ${property.max_guests} guests` },
        { status: 400 }
      );
    }

    if (horseCount > maxHorses) {
      return NextResponse.json(
        { error: `Property can only accommodate ${maxHorses} horses` },
        { status: 400 }
      );
    }

    // Calculate total base price including all fees
    let nightlyTotal = property.nightly_price_pennies * nights;

    // Add per-horse fee if applicable
    if (property.per_horse_fee_pennies && horseCount > 0) {
      nightlyTotal += property.per_horse_fee_pennies * horseCount * nights;
    }

    // Check if this is the user's first booking
    const { count: previousBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("guest_id", user.id)
      .in("status", ["accepted", "completed"]);
    
    const isFirstTimeBooking = (previousBookings || 0) === 0;

    // Get best discount using the database function
    let discountPercent = 0;
    let discountType: string | null = null;
    let discountName: string | null = null;

    const { data: discountData } = await supabase
      .rpc("get_best_discount", {
        p_property_id: propertyId,
        p_checkin_date: startDate,
        p_nights: nights,
        p_is_first_time_booking: isFirstTimeBooking,
      });

    if (discountData && discountData.length > 0) {
      discountPercent = discountData[0].discount_percent || 0;
      discountType = discountData[0].discount_type;
      discountName = discountData[0].discount_name;
      console.log(`[BOOKING] Discount applied: ${discountName} (${discountPercent}%)`);
    }

    // Apply discount to nightly total (discounts apply to nightly rates, not cleaning fees)
    const discountAmount = Math.round(nightlyTotal * (discountPercent / 100));
    const discountedNightlyTotal = nightlyTotal - discountAmount;

    // Add cleaning fee (one-time, not discounted)
    let totalBasePennies = discountedNightlyTotal;
    if (property.cleaning_fee_pennies) {
      totalBasePennies += property.cleaning_fee_pennies;
    }

    const breakdown = calculatePriceBreakdown(totalBasePennies);

    // Create Stripe PaymentIntent with manual capture
    const paymentIntent = await stripe.paymentIntents.create({
      amount: breakdown.totalChargePennies,
      currency: "gbp",
      capture_method: "manual",
      metadata: {
        propertyId,
        guestId: user.id,
        startDate,
        endDate,
        nights: nights.toString(),
        guests: guestCount.toString(),
        horses: horseCount.toString(),
      },
    });

    // Create booking record
    const bookingData: Record<string, any> = {
      property_id: propertyId,
      guest_id: user.id,
      start_date: startDate,
      end_date: endDate,
      nights,
      guests: guestCount,
      horses: horseCount,
      base_price_pennies: breakdown.basePricePennies,
      guest_fee_pennies: breakdown.guestFeePennies,
      guest_fee_vat_pennies: breakdown.guestFeeVatPennies,
      host_fee_pennies: breakdown.hostFeePennies,
      host_fee_vat_pennies: breakdown.hostFeeVatPennies,
      total_charge_pennies: breakdown.totalChargePennies,
      status: "requested",
      stripe_payment_intent_id: paymentIntent.id,
      original_subtotal_pennies: nightlyTotal + (property.cleaning_fee_pennies || 0), // Before discount
      total_discount_pennies: discountAmount,
    };

    // Add discount info if applicable
    if (discountPercent > 0) {
      bookingData.discounts_applied = [{
        type: discountType,
        name: discountName,
        percent: discountPercent,
        amount_pennies: discountAmount,
      }];
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      // Cancel the payment intent if booking creation fails
      await stripe.paymentIntents.cancel(paymentIntent.id);
      throw bookingError;
    }

    // Link selected horses to booking
    if (selectedHorseIds.length > 0) {
      try {
        const horseBookingRecords = selectedHorseIds.map((horseId: string) => ({
          booking_id: booking.id,
          horse_id: horseId,
        }));

        const { error: horseError } = await supabase
          .from("booking_horses")
          .insert(horseBookingRecords);

        if (horseError) {
          console.error("Failed to link horses to booking:", horseError);
        } else {
          console.log(`✅ ${selectedHorseIds.length} horses linked to booking`);
        }
      } catch (horseError) {
        // Don't fail the booking if horse linking fails
        console.error("Error linking horses:", horseError);
      }
    }

    // Create initial message to host about the booking
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();

      const initialMessage = `Hi! I've just made a booking request for ${property.name} from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()} (${nights} ${nights === 1 ? 'night' : 'nights'}) for ${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}${horseCount > 0 ? ` and ${horseCount} ${horseCount === 1 ? 'horse' : 'horses'}` : ''}. Looking forward to hearing from you!`;

      await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          recipient_id: property.host_id,
          property_id: propertyId,
          subject: `Booking Request for ${property.name}`,
          message: initialMessage,
        });

      console.log("✅ Initial booking message sent to host");
    } catch (messageError) {
      // Don't fail the booking if message creation fails
      console.error("Failed to create initial message:", messageError);
    }

    // Send email notification to host
    try {
      const { data: guestData } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", user.id)
        .single();

      const { data: hostData } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", property.host_id)
        .single();

      if (guestData && hostData) {
        await sendBookingRequestHost({
          to: hostData.email,
          hostName: hostData.name || 'Host',
          guestName: guestData.name || 'Guest',
          propertyName: property.name,
          checkIn: format(new Date(startDate), 'EEEE, MMMM d, yyyy'),
          checkOut: format(new Date(endDate), 'EEEE, MMMM d, yyyy'),
          guests: guestCount,
          horses: horseCount,
          nightsCount: nights,
          hostEarningsPennies: breakdown.hostPayoutPennies,
          bookingId: booking.id,
          guestProfileUrl: `https://padoq.com/profile/${user.id}`,
        });
        console.log("✅ Booking request email sent to host");
      }
    } catch (emailError) {
      // Don't fail the booking if email sending fails
      console.error("Failed to send booking request email:", emailError);
    }

    // Send in-app notification to host
    const { data: guestUser } = await supabase
      .from("users")
      .select("name")
      .eq("id", user.id)
      .single();

    await createNotification({
      userId: property.host_id,
      type: "booking_request",
      title: `${guestUser?.name || "A guest"} requested to book ${property.name}`,
      body: `${nights} ${nights === 1 ? "night" : "nights"}, ${guestCount} ${guestCount === 1 ? "guest" : "guests"}${horseCount > 0 ? `, ${horseCount} ${horseCount === 1 ? "horse" : "horses"}` : ""}`,
      link: `/host/bookings`,
      actorId: user.id,
    });

    return NextResponse.json({
      booking,
      clientSecret: paymentIntent.client_secret,
      breakdown,
    });
  } catch (error: any) {
    console.error("Booking request error:", error);
    return NextResponse.json(
      { error: error.message || "Booking request failed" },
      { status: 500 }
    );
  }
}

