import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch a specific horse
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: horse, error } = await supabase
      .from("user_horses")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) throw error;

    // Check if user owns this horse or is viewing through a booking
    if (horse.user_id !== user.id) {
      // Check if user is a host with a booking for this horse
      const { data: bookingHorses } = await supabase
        .from("booking_horses")
        .select(`
          booking_id,
          bookings!inner(
            property_id,
            properties!inner(host_id)
          )
        `)
        .eq("horse_id", params.id);

      const hasAccess = bookingHorses?.some(
        (bh: any) => bh.bookings?.properties?.host_id === user.id
      );

      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ horse });
  } catch (error: any) {
    console.error("Error fetching horse:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch horse" },
      { status: 500 }
    );
  }
}

// PUT - Update a horse
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Calculate age from date of birth if provided
    let age = body.age;
    if (body.date_of_birth && !age) {
      const birthDate = new Date(body.date_of_birth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    const { data: horse, error } = await supabase
      .from("user_horses")
      .update({
        name: body.name,
        photo_url: body.photo_url,
        breed: body.breed,
        date_of_birth: body.date_of_birth,
        age: age,
        gender: body.gender,
        color_markings: body.color_markings,
        height_hands: body.height_hands,
        weight_kg: body.weight_kg,
        dietary_requirements: body.dietary_requirements,
        medical_conditions: body.medical_conditions,
        current_medications: body.current_medications,
        vaccination_date: body.vaccination_date,
        passport_number: body.passport_number,
        temperament: body.temperament,
        behavior_notes: body.behavior_notes,
        turnout_preferences: body.turnout_preferences,
        experience_level: body.experience_level,
        disciplines: body.disciplines,
        vet_contact: body.vet_contact,
        farrier_contact: body.farrier_contact,
        quick_facts: body.quick_facts,
        public: body.public !== undefined ? body.public : true,
      })
      .eq("id", params.id)
      .eq("user_id", user.id) // Ensure user owns this horse
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ horse });
  } catch (error: any) {
    console.error("Error updating horse:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update horse" },
      { status: 500 }
    );
  }
}

// PATCH - Partial update a horse (e.g., toggle visibility)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Only update fields that are provided
    const updateData: any = {};
    if (body.public !== undefined) updateData.public = body.public;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.photo_url !== undefined) updateData.photo_url = body.photo_url;
    // Add more fields as needed for partial updates

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: horse, error } = await supabase
      .from("user_horses")
      .update(updateData)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ horse });
  } catch (error: any) {
    console.error("Error updating horse:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update horse" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a horse
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("user_horses")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id); // Ensure user owns this horse

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting horse:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete horse" },
      { status: 500 }
    );
  }
}

