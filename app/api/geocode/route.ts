import { NextRequest, NextResponse } from "next/server";
import { geocodeUKPostcode, addPrivacyOffset } from "@/lib/geocode";

export async function POST(request: NextRequest) {
  try {
    const { postcode } = await request.json();
    
    if (!postcode) {
      return NextResponse.json({ error: "Postcode is required" }, { status: 400 });
    }
    
    // Validate UK postcode format
    const postcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
    if (!postcodeRegex.test(postcode)) {
      return NextResponse.json({ error: "Invalid UK postcode format" }, { status: 400 });
    }
    
    const result = await geocodeUKPostcode(postcode);
    
    if (!result) {
      return NextResponse.json({ error: "Could not geocode postcode" }, { status: 404 });
    }
    
    // Add privacy offset for property listings
    const withOffset = addPrivacyOffset(result.latitude, result.longitude);
    
    return NextResponse.json({
      latitude: withOffset.latitude,
      longitude: withOffset.longitude,
      // Also return exact coords for internal use (hosts see their actual location)
      exactLatitude: result.latitude,
      exactLongitude: result.longitude,
      region: result.region,
      admin_district: result.admin_district,
    });
  } catch (error) {
    console.error("Geocode error:", error);
    return NextResponse.json({ error: "Failed to geocode postcode" }, { status: 500 });
  }
}

