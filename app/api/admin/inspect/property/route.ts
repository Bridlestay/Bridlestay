import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!propertyId) {
      return NextResponse.json({ error: "Property ID required" }, { status: 400 });
    }

    // Fetch property with all details
    const { data: propertyData, error: propertyError } = await supabase
      .from("properties")
      .select(`
        *,
        host:host_id (id, name, email, avatar_url, admin_verified, role),
        property_photos (id, url, is_cover, category),
        property_amenities (*),
        property_equine (*)
      `)
      .eq("id", propertyId)
      .single();

    if (propertyError || !propertyData) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Fetch all related data in parallel
    const [
      bookingsResult,
      reviewsResult,
      questionsResult,
      favoritesResult,
      messagesResult,
      availabilityResult,
      pricingResult,
      sharesResult,
    ] = await Promise.all([
      // All bookings for this property
      supabase
        .from("bookings")
        .select("*, guest:guest_id(id, name, email)")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false }),

      // All reviews for this property
      supabase
        .from("property_reviews")
        .select("*, reviewer:reviewer_id(id, name, avatar_url)")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false }),

      // All questions for this property
      supabase
        .from("questions")
        .select("*, user:user_id(id, name)")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false }),

      // Favorites count
      supabase
        .from("favorites")
        .select("*, user:user_id(id, name)")
        .eq("property_id", propertyId),

      // Messages related to this property
      supabase
        .from("messages")
        .select("id, sender_id, recipient_id, created_at, property_id")
        .eq("property_id", propertyId),

      // Availability rules
      supabase
        .from("availability_rules")
        .select("*")
        .eq("property_id", propertyId),

      // Custom pricing
      supabase
        .from("custom_pricing")
        .select("*")
        .eq("property_id", propertyId),

      // Share tracking
      supabase
        .from("property_shares")
        .select("platform")
        .eq("property_id", propertyId),
    ]);

    // Process bookings
    const bookings = bookingsResult.data || [];
    const bookingStats = {
      total: bookings.length,
      byStatus: {
        requested: bookings.filter((b) => b.status === "requested").length,
        accepted: bookings.filter((b) => b.status === "accepted").length,
        declined: bookings.filter((b) => b.status === "declined").length,
        cancelled: bookings.filter((b) => b.status === "cancelled").length,
        completed: bookings.filter((b) => b.status === "completed").length,
      },
      totalRevenue: bookings
        .filter((b) => b.status === "accepted" || b.status === "completed")
        .reduce((sum, b) => sum + (b.host_payout_pennies || 0), 0),
      totalGuests: bookings
        .filter((b) => b.status === "accepted" || b.status === "completed")
        .reduce((sum, b) => sum + (b.guests || 1), 0),
      totalHorses: bookings
        .filter((b) => b.status === "accepted" || b.status === "completed")
        .reduce((sum, b) => sum + (b.horses || 0), 0),
      totalNights: bookings
        .filter((b) => b.status === "accepted" || b.status === "completed")
        .reduce((sum, b) => sum + (b.nights || 0), 0),
      avgNightsPerBooking:
        bookings.filter((b) => b.status === "accepted" || b.status === "completed").length > 0
          ? (
              bookings
                .filter((b) => b.status === "accepted" || b.status === "completed")
                .reduce((sum, b) => sum + (b.nights || 0), 0) /
              bookings.filter((b) => b.status === "accepted" || b.status === "completed").length
            ).toFixed(1)
          : "N/A",
      acceptanceRate:
        bookings.filter((b) => b.status !== "requested").length > 0
          ? (
              (bookings.filter((b) => b.status === "accepted" || b.status === "completed").length /
                bookings.filter((b) => b.status !== "requested").length) *
              100
            ).toFixed(1)
          : "N/A",
      recentBookings: bookings.slice(0, 10),
    };

    // Process reviews
    const reviews = reviewsResult.data || [];
    const reviewStats = {
      total: reviews.length,
      avgRating:
        reviews.length > 0
          ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          : "N/A",
      ratingBreakdown: {
        5: reviews.filter((r) => r.rating === 5).length,
        4: reviews.filter((r) => r.rating === 4).length,
        3: reviews.filter((r) => r.rating === 3).length,
        2: reviews.filter((r) => r.rating === 2).length,
        1: reviews.filter((r) => r.rating === 1).length,
      },
      recentReviews: reviews.slice(0, 5),
    };

    // Process questions
    const questions = questionsResult.data || [];
    const questionStats = {
      total: questions.length,
      answered: questions.filter((q) => q.answer).length,
      unanswered: questions.filter((q) => !q.answer).length,
      recentQuestions: questions.slice(0, 5),
    };

    // Process favorites
    const favorites = favoritesResult.data || [];

    // Process messages
    const messages = messagesResult.data || [];

    // Process availability and pricing
    const availability = availabilityResult.data || [];
    const customPricing = pricingResult.data || [];

    // Process shares
    const shares = sharesResult.data || [];
    const shareBreakdown: Record<string, number> = {};
    shares.forEach((share: any) => {
      shareBreakdown[share.platform] = (shareBreakdown[share.platform] || 0) + 1;
    });
    const shareStats = {
      total: shares.length,
      breakdown: shareBreakdown,
    };

    // Photo stats
    const photos = propertyData.property_photos || [];
    const photoStats = {
      total: photos.length,
      general: photos.filter((p: any) => !p.category).length,
      facility: photos.filter((p: any) => p.category).length,
      hasCover: photos.some((p: any) => p.is_cover),
    };

    // Amenities and equine data
    const amenities = Array.isArray(propertyData.property_amenities)
      ? propertyData.property_amenities[0]
      : propertyData.property_amenities;
    const equine = Array.isArray(propertyData.property_equine)
      ? propertyData.property_equine[0]
      : propertyData.property_equine;

    return NextResponse.json({
      property: {
        ...propertyData,
        property_photos: undefined,
        property_amenities: undefined,
        property_equine: undefined,
      },
      host: propertyData.host,
      bookingStats,
      reviewStats,
      questionStats,
      favorites: {
        total: favorites.length,
        users: favorites,
      },
      messages: {
        total: messages.length,
      },
      shares: shareStats,
      photoStats,
      amenities,
      equine,
      availability: {
        rules: availability.length,
        customPricing: customPricing.length,
      },
    });
  } catch (error: any) {
    console.error("Error inspecting property:", error);
    return NextResponse.json(
      { error: error.message || "Failed to inspect property" },
      { status: 500 }
    );
  }
}

