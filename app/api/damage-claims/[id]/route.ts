import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GuestResponseSchema = z.object({
  action: z.enum(["accept", "dispute"]),
  response: z.string().optional(),
});

const AdminDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().optional(),
  adjustedAmountPennies: z.number().int().min(0).optional(),
});

// GET - Get single claim details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: claim, error } = await supabase
      .from("property_damage_claims")
      .select(`
        *,
        property:properties (id, name, host_id),
        booking:bookings (id, start_date, end_date, total_pennies),
        host:users!property_damage_claims_host_id_fkey (id, name, avatar_url, email),
        guest:users!property_damage_claims_guest_id_fkey (id, name, avatar_url, email)
      `)
      .eq("id", id)
      .single();

    if (error || !claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Check access - must be host, guest, or admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = userData?.role === "admin";
    const isHost = claim.host_id === user.id;
    const isGuest = claim.guest_id === user.id;

    if (!isAdmin && !isHost && !isGuest) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ claim, isHost, isGuest, isAdmin });
  } catch (error: any) {
    console.error("Error fetching claim:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update claim (guest response or admin decision)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current claim
    const { data: claim, error: fetchError } = await supabase
      .from("property_damage_claims")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Check user role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = userData?.role === "admin";
    const isGuest = claim.guest_id === user.id;

    const body = await request.json();

    // Guest response
    if (isGuest && claim.status === "pending") {
      const validated = GuestResponseSchema.parse(body);
      
      const updates: any = {
        guest_response: validated.response || null,
        guest_response_at: new Date().toISOString(),
      };

      if (validated.action === "accept") {
        updates.status = "guest_accepted";
      } else {
        updates.status = "guest_disputed";
      }

      const { data: updatedClaim, error: updateError } = await supabase
        .from("property_damage_claims")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating claim:", updateError);
        return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
      }

      // If accepted, trigger payment collection
      if (validated.action === "accept") {
        // TODO: Trigger Stripe off-session payment
      }

      return NextResponse.json({ claim: updatedClaim });
    }

    // Admin decision
    if (isAdmin && (claim.status === "guest_disputed" || claim.status === "pending")) {
      const validated = AdminDecisionSchema.parse(body);
      
      const updates: any = {
        status: validated.decision,
        admin_notes: validated.notes || null,
        admin_reviewer_id: user.id,
        admin_decision_at: new Date().toISOString(),
      };

      if (validated.adjustedAmountPennies !== undefined) {
        updates.amount_pennies = validated.adjustedAmountPennies;
      }

      const { data: updatedClaim, error: updateError } = await supabase
        .from("property_damage_claims")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating claim:", updateError);
        return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
      }

      // If approved, trigger payment collection
      if (validated.decision === "approved") {
        // TODO: Trigger Stripe off-session payment
      }

      return NextResponse.json({ claim: updatedClaim });
    }

    return NextResponse.json(
      { error: "You cannot update this claim in its current state" },
      { status: 403 }
    );
  } catch (error: any) {
    console.error("Error updating claim:", error);
    
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

// DELETE - Cancel claim (host only, if still pending)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get claim
    const { data: claim, error: fetchError } = await supabase
      .from("property_damage_claims")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Only host can cancel, and only if pending
    if (claim.host_id !== user.id) {
      return NextResponse.json({ error: "Only the host can cancel a claim" }, { status: 403 });
    }

    if (claim.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending claims can be cancelled" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("property_damage_claims")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (updateError) {
      console.error("Error cancelling claim:", updateError);
      return NextResponse.json({ error: "Failed to cancel claim" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error cancelling claim:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

