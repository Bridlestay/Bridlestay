import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS, getIdentifier, rateLimitError } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limiting - 60 searches per minute (by IP since search doesn't require auth)
    const rateLimitResult = checkRateLimit(
      getIdentifier(request),
      RATE_LIMITS.search
    );
    if (!rateLimitResult.success) {
      return rateLimitError(rateLimitResult);
    }

    const body = await request.json();
    const {
      location,
      county,
      startDate,
      endDate,
      guests,
      horses,
      priceMin,
      priceMax,
      arenaType,
      propertyType,
      minStables,
      bridlewayAccess,
      wifi,
      parking,
      paddock,
      washBay,
      sortBy,
      bounds, // Map bounds for geo-filtering
    } = body;

    const supabase = await createClient();

    let query = supabase
      .from("properties")
      .select(
        `
        *,
        property_photos (url, "order", is_cover),
        property_amenities (*),
        property_equine (*),
        availability_blocks (start_date, end_date, reason),
        bookings (start_date, end_date, status)
      `
      )
      .eq("published", true);

    // Apply sorting
    switch (sortBy) {
      case "price_asc":
        query = query.order("nightly_price_pennies", { ascending: true });
        break;
      case "price_desc":
        query = query.order("nightly_price_pennies", { ascending: false });
        break;
      case "rating_desc":
        query = query.order("average_rating", { ascending: false, nullsFirst: false });
        break;
      case "reviews_desc":
        query = query.order("review_count", { ascending: false, nullsFirst: false });
        break;
      case "created_at_desc":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    // Filter by location/county
    if (location) {
      query = query.or(
        `county.ilike.%${location}%,city.ilike.%${location}%,name.ilike.%${location}%`
      );
    }

    if (county) {
      query = query.eq("county", county);
    }

    // Filter by capacity
    if (guests) {
      query = query.gte("max_guests", parseInt(guests));
    }

    // Filter by price range
    if (priceMin !== undefined) {
      query = query.gte("nightly_price_pennies", priceMin * 100);
    }
    if (priceMax !== undefined) {
      query = query.lte("nightly_price_pennies", priceMax * 100);
    }

    // Filter by property type
    if (propertyType && propertyType !== "all") {
      query = query.eq("property_type", propertyType);
    }

    const { data: properties, error } = await query;

    if (error) {
      console.error("Database query error:", error);
      throw error;
    }

    console.log(`Found ${properties?.length || 0} published properties before filtering`);

    // Filter out properties that are unavailable during the requested dates
    let filteredProperties = properties || [];

    if (startDate && endDate) {
      const requestStart = new Date(startDate);
      const requestEnd = new Date(endDate);

      filteredProperties = filteredProperties.filter((property) => {
        // Check availability blocks
        const blocks = property.availability_blocks || [];
        const hasBlockOverlap = blocks.some((block: any) => {
          const blockStart = new Date(block.start_date);
          const blockEnd = new Date(block.end_date);

          return (
            (requestStart >= blockStart && requestStart <= blockEnd) ||
            (requestEnd >= blockStart && requestEnd <= blockEnd) ||
            (requestStart <= blockStart && requestEnd >= blockEnd)
          );
        });

        if (hasBlockOverlap) return false;

        // Check existing bookings (confirmed or pending)
        const bookings = property.bookings || [];
        const hasBookingOverlap = bookings.some((booking: any) => {
          // Only check confirmed and pending bookings
          if (!['confirmed', 'pending'].includes(booking.status)) return false;

          const bookingStart = new Date(booking.start_date);
          const bookingEnd = new Date(booking.end_date);

          return (
            (requestStart >= bookingStart && requestStart < bookingEnd) ||
            (requestEnd > bookingStart && requestEnd <= bookingEnd) ||
            (requestStart <= bookingStart && requestEnd >= bookingEnd)
          );
        });

        return !hasBookingOverlap;
      });
    }

    // Filter by horses - REQUIRED for all bookings
    if (horses) {
      const horsesInt = parseInt(horses);
      filteredProperties = filteredProperties.filter((property) => {
        const equineData = Array.isArray(property.property_equine)
          ? property.property_equine[0]
          : property.property_equine;
        const maxHorses = equineData?.max_horses || 0;
        return maxHorses >= horsesInt;
      });
    }

    // Filter by arena type
    if (arenaType && arenaType !== "any") {
      filteredProperties = filteredProperties.filter((property) => {
        const equineData = Array.isArray(property.property_equine)
          ? property.property_equine[0]
          : property.property_equine;

        if (arenaType === "indoor") {
          return equineData?.arena_indoor === true;
        }
        if (arenaType === "outdoor") {
          return equineData?.arena_outdoor === true;
        }
        if (arenaType === "both") {
          return equineData?.arena_indoor === true && equineData?.arena_outdoor === true;
        }
        return true;
      });
    }

    // Filter by minimum stables
    if (minStables && minStables > 0) {
      filteredProperties = filteredProperties.filter((property) => {
        const equineData = Array.isArray(property.property_equine)
          ? property.property_equine[0]
          : property.property_equine;
        const stableCount = equineData?.stable_count || 0;
        return stableCount >= minStables;
      });
    }

    // Filter by bridleway access
    if (bridlewayAccess === true) {
      filteredProperties = filteredProperties.filter((property) => {
        const equineData = Array.isArray(property.property_equine)
          ? property.property_equine[0]
          : property.property_equine;
        return equineData?.direct_bridleway_access === true;
      });
    }

    // Filter by amenities
    if (wifi === true) {
      filteredProperties = filteredProperties.filter((property) => {
        const amenities = Array.isArray(property.property_amenities)
          ? property.property_amenities[0]
          : property.property_amenities;
        return amenities?.wifi === true;
      });
    }

    if (parking === true) {
      filteredProperties = filteredProperties.filter((property) => {
        const amenities = Array.isArray(property.property_amenities)
          ? property.property_amenities[0]
          : property.property_amenities;
        return amenities?.parking === true;
      });
    }

    // Filter by horse facilities
    if (paddock === true) {
      filteredProperties = filteredProperties.filter((property) => {
        const equineData = Array.isArray(property.property_equine)
          ? property.property_equine[0]
          : property.property_equine;
        return equineData?.paddock_turnout === true;
      });
    }

    if (washBay === true) {
      filteredProperties = filteredProperties.filter((property) => {
        const equineData = Array.isArray(property.property_equine)
          ? property.property_equine[0]
          : property.property_equine;
        return equineData?.wash_bay === true;
      });
    }

    // Filter by map bounds (geo-filtering) - using correct column names lat/lng
    if (bounds && bounds.north && bounds.south && bounds.east && bounds.west) {
      filteredProperties = filteredProperties.filter((property) => {
        // Skip properties without coordinates
        if (!property.lat || !property.lng) return false;
        
        const lat = parseFloat(property.lat);
        const lng = parseFloat(property.lng);
        
        return (
          lat <= bounds.north &&
          lat >= bounds.south &&
          lng <= bounds.east &&
          lng >= bounds.west
        );
      });
    }

    return NextResponse.json({
      properties: filteredProperties,
      count: filteredProperties.length,
    });
  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}

