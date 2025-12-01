import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CompletePropertySchema } from "@/lib/validations/property";
import { moderateContent, validateUsername } from "@/lib/moderation";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Received body:", body);
    const { userId, propertyId, amenities, equine, photos, ...propertyData } = body;

    // Verify user is host only
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "host") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Moderate property name and description
    if (propertyData.name) {
      const nameValidation = validateUsername(propertyData.name);
      if (!nameValidation.valid) {
        return NextResponse.json(
          { error: `Property name rejected: ${nameValidation.reason}` },
          { status: 400 }
        );
      }

      const nameModeration = moderateContent(propertyData.name);
      if (nameModeration.blocked) {
        return NextResponse.json(
          { error: "Property name contains inappropriate content" },
          { status: 400 }
        );
      }
    }

    if (propertyData.description) {
      const descModeration = moderateContent(propertyData.description);
      if (descModeration.blocked) {
        return NextResponse.json(
          { error: "Property description contains inappropriate or prohibited content (payment information, contact details, or offensive language)" },
          { status: 400 }
        );
      }
    }

    if (propertyData.house_rules) {
      const rulesModeration = moderateContent(propertyData.house_rules);
      if (rulesModeration.blocked) {
        return NextResponse.json(
          { error: "House rules contain inappropriate content" },
          { status: 400 }
        );
      }
    }

    // Create or update property
    let finalPropertyId = propertyId;

    if (propertyId) {
      // Update existing property
      const { error: propertyError } = await supabase
        .from("properties")
        .update({
          name: propertyData.name,
          description: propertyData.description,
          property_type: propertyData.property_type,
          address_line: propertyData.address_line,
          city: propertyData.city,
          county: propertyData.county,
          postcode: propertyData.postcode,
          country: propertyData.country,
          latitude: propertyData.latitude,
          longitude: propertyData.longitude,
          max_guests: propertyData.max_guests,
          bedrooms: propertyData.bedrooms,
          beds: propertyData.beds,
          bathrooms: propertyData.bathrooms,
          checkin_time: propertyData.checkin_time,
          checkout_time: propertyData.checkout_time,
          house_rules: propertyData.house_rules,
          instant_book: propertyData.instant_book,
          nightly_price_pennies: propertyData.nightly_price_pennies,
          per_horse_fee_pennies: propertyData.per_horse_fee_pennies,
          cleaning_fee_pennies: propertyData.cleaning_fee_pennies,
          min_nights: propertyData.min_nights,
          max_nights: propertyData.max_nights,
          cancellation_policy: propertyData.cancellation_policy,
        })
        .eq("id", propertyId)
        .eq("host_id", user.id);

      if (propertyError) throw propertyError;
    } else {
      // Create new property - use defaults for partial data
      const { data: newProperty, error: propertyError } = await supabase
        .from("properties")
        .insert({
          host_id: user.id,
          name: propertyData.name || "Untitled Property",
          description: propertyData.description || "",
          property_type: propertyData.property_type || "cottage",
          address_line: propertyData.address_line || "",
          city: propertyData.city || "",
          county: propertyData.county || "Worcestershire",
          postcode: propertyData.postcode || "",
          country: propertyData.country || "UK",
          latitude: propertyData.latitude || 52.2053,
          longitude: propertyData.longitude || -2.2216,
          max_guests: propertyData.max_guests || 2,
          bedrooms: propertyData.bedrooms || 0,
          beds: propertyData.beds || 0,
          bathrooms: propertyData.bathrooms || 0,
          checkin_time: propertyData.checkin_time || "15:00",
          checkout_time: propertyData.checkout_time || "11:00",
          house_rules: propertyData.house_rules || "",
          instant_book: propertyData.instant_book || false,
          nightly_price_pennies: propertyData.nightly_price_pennies || 5000,
          per_horse_fee_pennies: propertyData.per_horse_fee_pennies || 0,
          cleaning_fee_pennies: propertyData.cleaning_fee_pennies || 0,
          min_nights: propertyData.min_nights || 1,
          max_nights: propertyData.max_nights || 28,
          cancellation_policy: propertyData.cancellation_policy || "moderate",
          published: false,
        })
        .select()
        .single();

      if (propertyError) {
        console.error("Property insert error:", propertyError);
        throw propertyError;
      }
      finalPropertyId = newProperty.id;
      console.log("Created property:", finalPropertyId);
    }

    // Upsert amenities
    if (amenities) {
      const { error: amenitiesError } = await supabase
        .from("property_amenities")
        .upsert({
          property_id: finalPropertyId,
          ...amenities,
        });

      if (amenitiesError) {
        console.error("Amenities upsert error:", amenitiesError);
        throw amenitiesError;
      }
      console.log("Amenities saved");
    }

    // Upsert equine facilities
    if (equine) {
      const { error: equineError } = await supabase
        .from("property_equine")
        .upsert({
          property_id: finalPropertyId,
          ...equine,
        });

      if (equineError) {
        console.error("Equine upsert error:", equineError);
        throw equineError;
      }
      console.log("Equine facilities saved");
    }

    // Handle photos
    if (photos && photos.length > 0) {
      console.log("Processing photos:", photos.length);
      
      // Delete existing photos for this property
      const { error: deleteError } = await supabase
        .from("property_photos")
        .delete()
        .eq("property_id", finalPropertyId);

      if (deleteError) {
        console.error("Delete photos error:", deleteError);
      }

      // Insert new photos
      const photoInserts = photos.map((photo: any, index: number) => ({
        property_id: finalPropertyId,
        url: photo.url,
        order: index,
        is_cover: photo.is_cover || index === 0,
      }));

      console.log("Inserting photos:", photoInserts);

      const { error: photosError } = await supabase
        .from("property_photos")
        .insert(photoInserts);

      if (photosError) {
        console.error("Photos insert error:", photosError);
        throw photosError;
      }
      console.log("Photos saved successfully");
    }

    console.log("Successfully saved listing:", finalPropertyId);
    return NextResponse.json({
      success: true,
      propertyId: finalPropertyId,
    });
  } catch (error: any) {
    console.error("Error saving listing:", error);
    console.error("Error details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save listing", details: error },
      { status: 500 }
    );
  }
}

