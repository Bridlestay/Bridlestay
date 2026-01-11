import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const EnforcementSchema = z.object({
  userId: z.string().uuid(),
  actionType: z.enum([
    'warning', 'message_restriction', 'booking_restriction',
    'listing_restriction', 'temporary_suspension', 'permanent_ban'
  ]),
  reason: z.string().min(1).max(500),
  durationDays: z.number().optional(), // For temporary actions
  relatedContentIds: z.array(z.string().uuid()).optional(),
  relatedReportIds: z.array(z.string().uuid()).optional(),
});

// POST - Create enforcement action (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin
    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (currentUser?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = EnforcementSchema.parse(body);

    // Calculate end date for temporary actions
    let endsAt: string | null = null;
    if (validated.durationDays && validated.actionType !== 'permanent_ban') {
      endsAt = new Date(Date.now() + validated.durationDays * 24 * 60 * 60 * 1000).toISOString();
    }

    // Create enforcement action
    const { data: action, error: actionError } = await supabase
      .from("enforcement_actions")
      .insert({
        user_id: validated.userId,
        action_type: validated.actionType,
        reason: validated.reason,
        ends_at: endsAt,
        related_content_ids: validated.relatedContentIds || [],
        related_report_ids: validated.relatedReportIds || [],
        issued_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (actionError) {
      console.error("Error creating enforcement:", actionError);
      return NextResponse.json({ error: "Failed to create enforcement" }, { status: 500 });
    }

    // Update user based on action type
    let userUpdate: any = {};
    
    if (['temporary_suspension', 'permanent_ban'].includes(validated.actionType)) {
      userUpdate.is_restricted = true;
      userUpdate.restriction_reason = validated.reason;
      userUpdate.restriction_ends_at = endsAt;
    }
    
    if (validated.actionType === 'warning') {
      userUpdate.warnings_received = (await supabase
        .from("users")
        .select("warnings_received")
        .eq("id", validated.userId)
        .single()).data?.warnings_received + 1 || 1;
    }

    if (Object.keys(userUpdate).length > 0) {
      await supabase
        .from("users")
        .update(userUpdate)
        .eq("id", validated.userId);
    }

    // Recalculate trust score
    await supabase.rpc("update_user_trust_score", { p_user_id: validated.userId });

    return NextResponse.json({ 
      success: true,
      action,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Enforcement error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create enforcement" },
      { status: 500 }
    );
  }
}

// GET - List enforcement actions (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin
    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (currentUser?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const activeOnly = searchParams.get("active") === "true";

    let query = supabase
      .from("enforcement_actions")
      .select(`
        *,
        user:users!enforcement_actions_user_id_fkey (id, name, email, avatar_url),
        issuer:users!enforcement_actions_issued_by_fkey (id, name)
      `)
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data: actions, error } = await query.limit(100);

    if (error) {
      console.error("Error fetching enforcement actions:", error);
      return NextResponse.json({ error: "Failed to fetch actions" }, { status: 500 });
    }

    return NextResponse.json({ actions: actions || [] });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch actions" },
      { status: 500 }
    );
  }
}

// PATCH - Lift enforcement action (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin
    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (currentUser?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { actionId, reason } = await request.json();

    if (!actionId) {
      return NextResponse.json({ error: "Action ID required" }, { status: 400 });
    }

    // Get the action
    const { data: action, error: fetchError } = await supabase
      .from("enforcement_actions")
      .select("*")
      .eq("id", actionId)
      .single();

    if (fetchError || !action) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    // Lift the action
    const { error: updateError } = await supabase
      .from("enforcement_actions")
      .update({
        is_active: false,
        lifted_at: new Date().toISOString(),
        lifted_by: user.id,
        lift_reason: reason,
      })
      .eq("id", actionId);

    if (updateError) {
      console.error("Error lifting action:", updateError);
      return NextResponse.json({ error: "Failed to lift action" }, { status: 500 });
    }

    // Check if user has any other active restrictions
    const { count } = await supabase
      .from("enforcement_actions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", action.user_id)
      .eq("is_active", true)
      .in("action_type", ['temporary_suspension', 'permanent_ban']);

    // If no other active restrictions, unrestrict user
    if (!count || count === 0) {
      await supabase
        .from("users")
        .update({
          is_restricted: false,
          restriction_reason: null,
          restriction_ends_at: null,
        })
        .eq("id", action.user_id);
    }

    // Recalculate trust score
    await supabase.rpc("update_user_trust_score", { p_user_id: action.user_id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to lift action" },
      { status: 500 }
    );
  }
}

