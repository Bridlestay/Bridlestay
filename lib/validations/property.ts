import { z } from "zod";

// Step 1: Basics
export const PropertyBasicsSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(200, "Description must be at least 200 characters"),
  property_type: z.enum([
    // Accommodation types
    "bnb", "cottage", "farm_stay", "manor", "glamping",
    // Camping/Outdoor types
    "campsite", "caravan_park", "shepherds_hut", "yurt", "tipi", "bell_tent", "pod", "treehouse",
    // Equine-specific types
    "livery_yard", "equestrian_centre", "riding_school",
    // Other
    "other"
  ]).default("cottage"),
  address_line: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  county: z.string().min(2, "County is required"),
  postcode: z.string().regex(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, "Invalid UK postcode"),
  country: z.literal("UK"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  max_guests: z.number().int().min(1).max(20),
  bedrooms: z.number().int().min(0).max(20),
  beds: z.number().int().min(0).max(50),
  bathrooms: z.number().min(0).max(20),
  checkin_time: z.string(),
  checkout_time: z.string(),
  house_rules: z.string().optional(),
  instant_book: z.boolean().default(false),
});

// Step 2: Human Amenities
export const PropertyAmenitiesSchema = z.object({
  // Essentials
  wifi: z.boolean().default(false),
  heating: z.boolean().default(false),
  air_con: z.boolean().default(false),
  hot_water: z.boolean().default(false),
  workspace: z.boolean().default(false),
  // Kitchen
  kitchen: z.boolean().default(false),
  oven: z.boolean().default(false),
  hob: z.boolean().default(false),
  microwave: z.boolean().default(false),
  fridge: z.boolean().default(false),
  freezer: z.boolean().default(false),
  dishwasher: z.boolean().default(false),
  coffee_maker: z.boolean().default(false),
  kettle: z.boolean().default(false),
  cookware: z.boolean().default(false),
  // Laundry
  washer: z.boolean().default(false),
  dryer: z.boolean().default(false),
  drying_rack: z.boolean().default(false),
  ironing_board: z.boolean().default(false),
  // Bathroom
  shower: z.boolean().default(false),
  bathtub: z.boolean().default(false),
  hairdryer: z.boolean().default(false),
  toiletries: z.boolean().default(false),
  // Safety
  smoke_alarm: z.boolean().default(false),
  carbon_monoxide_alarm: z.boolean().default(false),
  first_aid_kit: z.boolean().default(false),
  fire_extinguisher: z.boolean().default(false),
  // Access & Parking
  step_free_access: z.boolean().default(false),
  private_entrance: z.boolean().default(false),
  on_site_parking: z.boolean().default(false),
  ev_charger: z.boolean().default(false),
  // Family/Pet
  cot: z.boolean().default(false),
  high_chair: z.boolean().default(false),
  pets_allowed: z.boolean().default(false),
  pet_rules: z.string().optional(),
  // Entertainment
  tv: z.boolean().default(false),
  streaming: z.boolean().default(false),
  outdoor_seating: z.boolean().default(false),
  bbq: z.boolean().default(false),
});

// Step 3: Equine Facilities
export const PropertyEquineSchema = z.object({
  // Capacity
  max_horses: z.number().int().min(1, "You must accommodate at least 1 horse").max(12),
  stable_count: z.number().int().min(0).max(20),
  // Stabling
  stable_length: z.number().optional().nullable(),
  stable_width: z.number().optional().nullable(),
  stable_unit: z.enum(["ft", "m"]).optional().nullable(),
  stall_type: z.enum(["loose_box", "tie_stall", "american_barn", "other"]).optional(),
  bedding_available: z.boolean().default(false),
  bedding_types: z.string().optional(),
  bedding_fee_pennies: z.number().int().min(0).optional(),
  forage_available: z.boolean().default(false),
  forage_types: z.string().optional(),
  forage_fee_pennies: z.number().int().min(0).optional(),
  feed_available: z.boolean().default(false),
  feed_brands: z.string().optional(),
  feed_fee_pennies: z.number().int().min(0).optional(),
  // Turnout & Paddocks
  paddock_available: z.boolean().default(false),
  paddock_size_acres: z.number().min(0).max(200).optional(),
  paddock_fencing: z.enum(["post_rail", "electric", "wire", "mixed"]).optional(),
  shelter_available: z.boolean().default(false),
  water_points: z.boolean().default(false),
  // Riding
  arena_indoor: z.boolean().default(false),
  arena_indoor_length: z.number().optional().nullable(),
  arena_indoor_width: z.number().optional().nullable(),
  arena_indoor_unit: z.enum(["ft", "m"]).optional().nullable(),
  arena_indoor_surface: z.enum(["sand", "silica", "fibre", "rubber", "grass", "mixed"]).optional().nullable(),
  arena_outdoor: z.boolean().default(false),
  arena_outdoor_length: z.number().optional().nullable(),
  arena_outdoor_width: z.number().optional().nullable(),
  arena_outdoor_unit: z.enum(["ft", "m"]).optional().nullable(),
  arena_outdoor_surface: z.enum(["sand", "silica", "fibre", "rubber", "grass", "mixed"]).optional().nullable(),
  jumps_available: z.boolean().default(false),
  poles_available: z.boolean().default(false),
  arena_hire_fee_pennies: z.number().int().min(0).optional(),
  floodlights: z.boolean().default(false),
  direct_bridleway_access: z.boolean().default(false),
  distance_to_bridleway_m: z.number().int().min(0).optional(),
  trailer_parking: z.boolean().default(false),
  lorry_parking: z.boolean().default(false),
  // Care & Biosecurity
  tie_up_area: z.boolean().default(false),
  wash_bay: z.boolean().default(false),
  hot_hose: z.boolean().default(false),
  solarium: z.boolean().default(false),
  tack_room: z.boolean().default(false),
  locked_tack_room: z.boolean().default(false),
  muck_heap_access: z.boolean().default(false),
  manure_disposal_notes: z.string().optional(),
  quarantine_stable: z.boolean().default(false),
  vet_on_call: z.string().optional(),
  farrier_on_call: z.string().optional(),
  safety_rules: z.string().optional(),
  route_info: z.string().optional(),
});

// Step 4: Pricing
export const PropertyPricingSchema = z.object({
  nightly_price_pennies: z.number().int().min(1000, "Minimum price is £10/night"),
  per_horse_fee_pennies: z.number().int().min(0).default(0),
  // Legacy combined cleaning fee (for backwards compatibility)
  cleaning_fee_pennies: z.number().int().min(0).default(0),
  // Split cleaning fees (new)
  house_cleaning_fee_pennies: z.number().int().min(0).default(0),
  stable_cleaning_fee_pennies: z.number().int().min(0).default(0),
  // Extra guest fee (optional)
  extra_guest_fee_pennies: z.number().int().min(0).default(0),
  base_guests_included: z.number().int().min(1).default(2),
  // Stay requirements
  min_nights: z.number().int().min(1).default(1),
  max_nights: z.number().int().min(1).max(365).default(28),
  cancellation_policy: z.enum(["flexible", "moderate", "strict"]).default("moderate"),
});

// Complete property schema
export const CompletePropertySchema = PropertyBasicsSchema
  .merge(PropertyPricingSchema)
  .extend({
    amenities: PropertyAmenitiesSchema,
    equine: PropertyEquineSchema,
  });

export type PropertyBasics = z.infer<typeof PropertyBasicsSchema>;
export type PropertyAmenities = z.infer<typeof PropertyAmenitiesSchema>;
export type PropertyEquine = z.infer<typeof PropertyEquineSchema>;
export type PropertyPricing = z.infer<typeof PropertyPricingSchema>;
export type CompleteProperty = z.infer<typeof CompletePropertySchema>;

