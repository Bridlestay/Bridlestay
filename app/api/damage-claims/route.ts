import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateClaimSchema = z.object({
  bookingId: z.string().uuid(),
  claimType: z.enum(["damage", "excessive_cleaning", "both"]),
  description: z.string().min(10, "Please provide a detailed description"),
  amountPennies: z.number().int().min(100, "Minimum claim amount is £1"),
  evidenceUrls: z.array(z.string().url()).min(1, "At least one photo is required"),
});

// POST - Create a new damage claim
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateClaimSchema.parse(body);

    // Get booking details and verify host
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        property:properties (id, host_id, name)
      `)
      .eq("id", validated.bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify the user is the host
    if (booking.property.host_id !== user.id) {
      return NextResponse.json(
        { error: "Only the property host can submit damage claims" }, 
        { status: 403 }
      );
    }

    // Check booking status - must be completed
    if (booking.status !== "completed" && booking.status !== "checked_out") {
      return NextResponse.json(
        { error: "Claims can only be submitted after checkout" }, 
        { status: 400 }
      );
    }

    // Check 48-hour window
    const checkoutDate = new Date(booking.end_date);
    const now = new Date();
    const hoursSinceCheckout = (now.getTime() - checkoutDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCheckout > 48) {
      return NextResponse.json(
        { error: "Damage claims must be submitted within 48 hours of checkout" }, 
        { status: 400 }
      );
    }

    // Check if claim already exists for this booking
    const { data: existingClaim } = await supabase
      .from("property_damage_claims")
      .select("id")
      .eq("booking_id", validated.bookingId)
      .single();

    if (existingClaim) {
      return NextResponse.json(
        { error: "A claim has already been submitted for this booking" }, 
        { status: 400 }
      );
    }

    // Calculate claim deadline
    const claimDeadline = new Date(checkoutDate);
    claimDeadline.setHours(claimDeadline.getHours() + 48);

    // Create the claim
    const { data: claim, error: claimError } = await supabase
      .from("property_damage_claims")
      .insert({
        property_id: booking.property_id,
        booking_id: validated.bookingId,
        host_id: user.id,
        guest_id: booking.guest_id,
        claim_type: validated.claimType,
        description: validated.description,
        amount_pennies: validated.amountPennies,
        evidence_urls: validated.evidenceUrls,
        status: "pending",
        claim_deadline: claimDeadline.toISOString(),
      })
      .select()
      .single();

    if (claimError) {
      console.error("Error creating claim:", claimError);
      return NextResponse.json(
        { error: "Failed to create claim" }, 
        { status: 500 }
      );
    }

    // TODO: Send notification to guest about the claim

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error: any) {
    console.error("Error in damage claims POST:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get claims for current user (as host or guest)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "both"; // host, guest, or both
    const status = searchParams.get("status"); // filter by status

    let query = supabase
      .from("property_damage_claims")
      .select(`
        *,
        property:properties (id, name),
        booking:bookings (id, start_date, end_date),
        host:users!property_damage_claims_host_id_fkey (id, name, avatar_url),
        guest:users!property_damage_claims_guest_id_fkey (id, name, avatar_url)
      `)
      .order("created_at", { ascending: false });

    // Filter by role
    if (role === "host") {
      query = query.eq("host_id", user.id);
    } else if (role === "guest") {
      query = query.eq("guest_id", user.id);
    } else {
      query = query.or(`host_id.eq.${user.id},guest_id.eq.${user.id}`);
    }

    // Filter by status
    if (status) {
      query = query.eq("status", status);
    }

    const { data: claims, error } = await query;

    if (error) {
      console.error("Error fetching claims:", error);
      return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
    }

    return NextResponse.json({ claims: claims || [] });
  } catch (error: any) {
    console.error("Error in damage claims GET:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

