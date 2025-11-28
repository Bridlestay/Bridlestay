import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { PropertyWizard } from "@/components/host/property-wizard";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "host") {
    redirect("/");
  }

  // Fetch the property with all related data
  const { data: property, error } = await supabase
    .from("properties")
    .select(`
      *,
      property_amenities (*),
      property_equine (*),
      property_photos (url, "order", is_cover)
    `)
    .eq("id", id)
    .eq("host_id", user.id)
    .single();

  if (error || !property) {
    redirect("/host/listings");
  }

  // Transform the data to match the wizard format
  const amenitiesData = Array.isArray(property.property_amenities) 
    ? property.property_amenities[0] 
    : property.property_amenities;
    
  const equineData = Array.isArray(property.property_equine)
    ? property.property_equine[0]
    : property.property_equine;

  const initialData = {
    // Basics
    name: property.name || "",
    description: property.description || "",
    property_type: property.property_type || "cottage",
    address_line: property.address_line || "",
    city: property.city || "",
    county: property.county || "",
    postcode: property.postcode || "",
    country: property.country || "UK",
    latitude: property.latitude || 52.2053,
    longitude: property.longitude || -2.2216,
    max_guests: property.max_guests || 2,
    bedrooms: property.bedrooms || 0,
    beds: property.beds || 0,
    bathrooms: property.bathrooms || 0,
    checkin_time: property.checkin_time || "15:00",
    checkout_time: property.checkout_time || "11:00",
    house_rules: property.house_rules || "",
    instant_book: property.instant_book || false,
    
    // Amenities - ensure all fields are present
    amenities: amenitiesData ? {
      ...amenitiesData,
      property_id: undefined, // Remove DB fields
      created_at: undefined,
      updated_at: undefined,
    } : {},
    
    // Equine - ensure all fields are present
    equine: equineData ? {
      ...equineData,
      property_id: undefined, // Remove DB fields
      created_at: undefined,
      updated_at: undefined,
    } : { max_horses: 1, stable_count: 0 },
    
    // Photos
    photos: property.property_photos || [],
    
    // Pricing
    nightly_price_pennies: property.nightly_price_pennies || 5000,
    per_horse_fee_pennies: property.per_horse_fee_pennies || 0,
    cleaning_fee_pennies: property.cleaning_fee_pennies || 0,
    min_nights: property.min_nights || 1,
    max_nights: property.max_nights || 28,
    cancellation_policy: property.cancellation_policy || "moderate",
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30">
        <PropertyWizard 
          userId={user.id} 
          propertyId={id}
          initialData={initialData}
        />
      </main>
    </>
  );
}

