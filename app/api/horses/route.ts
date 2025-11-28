import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - Fetch user's horses
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: horses, error } = await supabase
      .from("user_horses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ horses });
  } catch (error: any) {
    console.error("Error fetching horses:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch horses" },
      { status: 500 }
    );
  }
}

// POST - Create a new horse
export async function POST(request: Request) {
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
      .insert({
        user_id: user.id,
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
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ horse }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating horse:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create horse" },
      { status: 500 }
    );
  }
}

