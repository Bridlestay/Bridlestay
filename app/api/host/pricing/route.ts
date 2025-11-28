import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

// Get pricing rules for a property
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
      .from("pricing_rules")
      .select("*")
      .eq("property_id", propertyId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ rules: rules || [] });
  } catch (error: any) {
    console.error("Error fetching pricing rules:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

// Create pricing rule
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
    const { propertyId, ruleType, ...ruleData } = body;

    if (!propertyId || !ruleType) {
      return NextResponse.json(
        { error: "Property ID and rule type required" },
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
      .from("pricing_rules")
      .insert({
        property_id: propertyId,
        rule_type: ruleType,
        ...ruleData,
        active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error("Error creating pricing rule:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create rule" },
      { status: 500 }
    );
  }
}

// Update pricing rule
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ruleId, ...updates } = body;

    if (!ruleId) {
      return NextResponse.json(
        { error: "Rule ID required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: rule } = await supabase
      .from("pricing_rules")
      .select("property_id, properties!inner(host_id)")
      .eq("id", ruleId)
      .single();

    if (!rule || rule.properties.host_id !== user.id) {
      return NextResponse.json(
        { error: "Rule not found or unauthorized" },
        { status: 404 }
      );
    }

    const { data: updatedRule, error } = await supabase
      .from("pricing_rules")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", ruleId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ rule: updatedRule });
  } catch (error: any) {
    console.error("Error updating pricing rule:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update rule" },
      { status: 500 }
    );
  }
}

// Delete pricing rule
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

    // Verify ownership
    const { data: rule } = await supabase
      .from("pricing_rules")
      .select("property_id, properties!inner(host_id)")
      .eq("id", ruleId)
      .single();

    if (!rule || rule.properties.host_id !== user.id) {
      return NextResponse.json(
        { error: "Rule not found or unauthorized" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("pricing_rules")
      .delete()
      .eq("id", ruleId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting pricing rule:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete rule" },
      { status: 500 }
    );
  }
}



