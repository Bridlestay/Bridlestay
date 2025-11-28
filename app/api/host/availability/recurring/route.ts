import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

// Get recurring availability rules
export async function GET(request: NextRequest) {
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

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID required" },
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

    const { data: rules, error } = await supabase
      .from("recurring_availability_blocks")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ rules: rules || [] });
  } catch (error: any) {
    console.error("Error fetching recurring rules:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

// Create recurring availability rule
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
    const {
      propertyId,
      recurrenceType,
      dayOfWeek,
      dayOfMonth,
      startDate,
      endDate,
      reason,
    } = body;

    if (!propertyId || !recurrenceType || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    const { data: rule, error } = await supabase
      .from("recurring_availability_blocks")
      .insert({
        property_id: propertyId,
        recurrence_type: recurrenceType,
        day_of_week: dayOfWeek,
        day_of_month: dayOfMonth,
        start_date: startDate,
        end_date: endDate || null,
        reason: reason || 'unavailable',
        active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error("Error creating recurring rule:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create rule" },
      { status: 500 }
    );
  }
}

// Delete recurring availability rule
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
    const ruleId = searchParams.get('ruleId');

    if (!ruleId) {
      return NextResponse.json(
        { error: "Rule ID required" },
        { status: 400 }
      );
    }

    // Verify ownership through property
    const { data: rule } = await supabase
      .from("recurring_availability_blocks")
      .select("property_id, properties!inner(host_id)")
      .eq("id", ruleId)
      .single();

    const ruleHostId: any = Array.isArray(rule?.properties) ? rule.properties[0]?.host_id : rule?.properties?.host_id;
    if (!rule || ruleHostId !== user.id) {
      return NextResponse.json(
        { error: "Rule not found or unauthorized" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("recurring_availability_blocks")
      .delete()
      .eq("id", ruleId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting recurring rule:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete rule" },
      { status: 500 }
    );
  }
}

