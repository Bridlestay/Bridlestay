import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    const bookingId = params.id;

    // Fetch horses for this booking
    const { data: bookingHorses, error: bookingError } = await supabase
      .from("booking_horses")
      .select(`
        horse_id,
        special_notes,
        user_horses (*)
      `)
      .eq("booking_id", bookingId);

    if (bookingError) throw bookingError;

    // Extract horse data
    const horses = bookingHorses?.map((bh: any) => ({
      ...bh.user_horses,
      special_notes: bh.special_notes,
    })) || [];

    return NextResponse.json({ horses });
  } catch (error: any) {
    console.error("Error fetching booking horses:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch horses" },
      { status: 500 }
    );
  }
}

