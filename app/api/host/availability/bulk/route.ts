import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

// Create bulk availability blocks
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
    const { propertyId, dates, reason } = body;

    if (!propertyId || !dates || !Array.isArray(dates)) {
      return NextResponse.json(
        { error: "Property ID and dates array required" },
        { status: 400 }
      );
    }

    // Verify property ownership
    const { data: property } = await supabase
      .from("properties")
      .select("id, host_id")
      .eq("id", propertyId)
      .eq("host_id", user.id)
      .single();

    if (!property) {
      return NextResponse.json(
        { error: "Property not found or unauthorized" },
        { status: 404 }
      );
    }

    // Create availability blocks for each date
    const blocks = dates.map((date: string) => ({
      property_id: propertyId,
      start_date: date,
      end_date: date,
      reason: reason || 'unavailable',
    }));

    const { data, error } = await supabase
      .from("availability_blocks")
      .insert(blocks)
      .select();

    if (error) throw error;

    return NextResponse.json({ blocks: data, count: data?.length || 0 });
  } catch (error: any) {
    console.error("Error creating bulk availability blocks:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create blocks" },
      { status: 500 }
    );
  }
}

// Delete bulk availability blocks
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!propertyId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Property ID, start date, and end date required" },
        { status: 400 }
      );
    }

    // Verify property ownership
    const { data: property } = await supabase
      .from("properties")
      .select("id, host_id")
      .eq("id", propertyId)
      .eq("host_id", user.id)
      .single();

    if (!property) {
      return NextResponse.json(
        { error: "Property not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete blocks in date range
    const { error } = await supabase
      .from("availability_blocks")
      .delete()
      .eq("property_id", propertyId)
      .gte("start_date", startDate)
      .lte("end_date", endDate);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting bulk availability blocks:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete blocks" },
      { status: 500 }
    );
  }
}



