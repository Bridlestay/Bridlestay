import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Admin Enforcement Actions API
 * 
 * Provides granular enforcement capabilities:
 * - warning: Issue a formal warning (affects trust score)
 * - message_restriction: User cannot send messages
 * - booking_restriction: User cannot make bookings
 * - listing_restriction: User cannot publish/edit listings
 * - temporary_suspension: Full account suspension (temporary)
 * - permanent_ban: Permanent account ban
 * 
 * All actions are audit logged and stored in enforcement_actions table.
 */

const ENFORCEMENT_TYPES = [
  { value: 'warning', label: 'Issue Warning', severity: 'low', description: 'Formal warning that affects trust score' },
  { value: 'message_restriction', label: 'Message Restriction', severity: 'medium', description: 'User cannot send messages' },
  { value: 'booking_restriction', label: 'Booking Restriction', severity: 'medium', description: 'User cannot make bookings as a guest' },
  { value: 'listing_restriction', label: 'Listing Restriction', severity: 'medium', description: 'User cannot publish or edit property listings' },
  { value: 'temporary_suspension', label: 'Temporary Suspension', severity: 'high', description: 'Full account suspension for a set period' },
  { value: 'permanent_ban', label: 'Permanent Ban', severity: 'critical', description: 'Permanent account ban - user cannot access the platform' },
];

export async function GET() {
  // Return available enforcement types
  return NextResponse.json({ types: ENFORCEMENT_TYPES });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the requesting user is authenticated and is an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("users")
      .select("role, name")
      .eq("id", user.id)
      .single();

    if (adminUser?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, actionType, reason, durationDays, notes } = body;

    if (!targetUserId || !actionType || !reason) {
      return NextResponse.json({ 
        error: "Missing required fields: targetUserId, actionType, reason" 
      }, { status: 400 });
    }

    // Validate action type
    const validTypes = ENFORCEMENT_TYPES.map(t => t.value);
    if (!validTypes.includes(actionType)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    // Get target user details
    const { data: targetUser, error: targetError } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Prevent action against other admins
    if (targetUser.role === 'admin') {
      return NextResponse.json({ 
        error: "Cannot take enforcement action against an admin" 
      }, { status: 403 });
    }

    // Calculate end date for temporary actions
    let endsAt = null;
    if (actionType === 'temporary_suspension' && durationDays) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(durationDays));
      endsAt = endDate.toISOString();
    }

    // Create enforcement action
    const { data: enforcement, error: enforcementError } = await supabase
      .from("enforcement_actions")
      .insert({
        user_id: targetUserId,
        action_type: actionType,
        reason: reason + (notes ? `\n\nAdmin Notes: ${notes}` : ''),
        issued_by: user.id,
        ends_at: endsAt,
        is_active: true,
      })
      .select()
      .single();

    if (enforcementError) {
      console.error("Enforcement error:", enforcementError);
      return NextResponse.json({ error: enforcementError.message }, { status: 500 });
    }

    // Update user fields based on action type
    const userUpdates: Record<string, any> = {};
    
    switch (actionType) {
      case 'warning':
        // Warnings don't directly restrict, but affect trust score
        // Trust score will be updated via RPC
        break;
      case 'message_restriction':
        userUpdates.is_restricted = true;
        break;
      case 'booking_restriction':
        userUpdates.is_restricted = true;
        break;
      case 'listing_restriction':
        userUpdates.is_restricted = true;
        break;
      case 'temporary_suspension':
        userUpdates.is_restricted = true;
        userUpdates.suspended_until = endsAt;
        break;
      case 'permanent_ban':
        userUpdates.banned = true;
        userUpdates.is_restricted = true;
        break;
    }

    if (Object.keys(userUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from("users")
        .update(userUpdates)
        .eq("id", targetUserId);

      if (updateError) {
        console.error("User update error:", updateError);
        // Don't fail - enforcement record is created
      }
    }

    // Update trust score
    try {
      await supabase.rpc("update_user_trust_score", { p_user_id: targetUserId });
    } catch (trustError) {
      console.error("Trust score update error:", trustError);
    }

    // Log to admin audit log
    try {
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        admin_name: adminUser.name,
        action_type: `enforcement_${actionType}`,
        target_user_id: targetUserId,
        target_user_email: targetUser.email,
        details: {
          enforcementId: enforcement.id,
          actionType,
          reason,
          durationDays: durationDays || null,
          endsAt,
        },
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Audit log error:", logError);
    }

    const actionLabel = ENFORCEMENT_TYPES.find(t => t.value === actionType)?.label || actionType;

    return NextResponse.json({
      success: true,
      message: `${actionLabel} applied to ${targetUser.name || targetUser.email}`,
      enforcement: {
        id: enforcement.id,
        type: actionType,
        endsAt,
      },
    });
  } catch (error: any) {
    console.error("Enforcement action error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply enforcement action" },
      { status: 500 }
    );
  }
}

// Lift an enforcement action
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("users")
      .select("role, name")
      .eq("id", user.id)
      .single();

    if (adminUser?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const enforcementId = searchParams.get("id");
    const liftReason = searchParams.get("reason") || "Lifted by admin";

    if (!enforcementId) {
      return NextResponse.json({ error: "Missing enforcement ID" }, { status: 400 });
    }

    // Get the enforcement record
    const { data: enforcement, error: fetchError } = await supabase
      .from("enforcement_actions")
      .select("*, users!enforcement_actions_user_id_fkey(id, email, name)")
      .eq("id", enforcementId)
      .single();

    if (fetchError || !enforcement) {
      return NextResponse.json({ error: "Enforcement action not found" }, { status: 404 });
    }

    // Mark as lifted
    const { error: updateError } = await supabase
      .from("enforcement_actions")
      .update({
        is_active: false,
        lifted_at: new Date().toISOString(),
        lifted_by: user.id,
        lift_reason: liftReason,
      })
      .eq("id", enforcementId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Check if user has other active enforcement actions
    const { data: otherActions } = await supabase
      .from("enforcement_actions")
      .select("id, action_type")
      .eq("user_id", enforcement.user_id)
      .eq("is_active", true)
      .neq("id", enforcementId);

    // If no other active restrictions, lift user restrictions
    if (!otherActions || otherActions.length === 0) {
      await supabase
        .from("users")
        .update({
          is_restricted: false,
          banned: false,
          suspended_until: null,
        })
        .eq("id", enforcement.user_id);
    }

    // Update trust score
    try {
      await supabase.rpc("update_user_trust_score", { p_user_id: enforcement.user_id });
    } catch (trustError) {
      console.error("Trust score update error:", trustError);
    }

    // Audit log
    try {
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        admin_name: adminUser.name,
        action_type: "enforcement_lifted",
        target_user_id: enforcement.user_id,
        target_user_email: enforcement.users?.email,
        details: {
          enforcementId,
          actionType: enforcement.action_type,
          liftReason,
        },
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Audit log error:", logError);
    }

    return NextResponse.json({
      success: true,
      message: `Enforcement action lifted for ${enforcement.users?.name || enforcement.users?.email}`,
    });
  } catch (error: any) {
    console.error("Lift enforcement error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to lift enforcement action" },
      { status: 500 }
    );
  }
}

