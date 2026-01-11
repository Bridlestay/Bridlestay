import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const ResolveIssueSchema = z.object({
  resolutionType: z.enum([
    "no_action",
    "partial_refund",
    "unused_nights_refund",
    "full_refund",
    "payout_cancelled",
  ]),
  resolutionNotes: z.string().optional(),
  refundAmountPennies: z.number().int().min(0).optional(),
});

// GET - Get issue details
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

    const { data: issue, error } = await supabase
      .from("booking_issues")
      .select(`
        *,
        booking:bookings (
          id, 
          start_date, 
          end_date, 
          total_pennies, 
          guest_fee_pennies,
          host_payout_pennies,
          stripe_payment_intent_id,
          payout_status,
          property:properties (id, name, host_id),
          guest:users!bookings_guest_id_fkey (id, name, email, avatar_url)
        ),
        reporter:users!booking_issues_reporter_id_fkey (id, name, avatar_url),
        resolver:users!booking_issues_resolved_by_fkey (id, name)
      `)
      .eq("id", id)
      .single();

    if (error || !issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    // Check access - must be involved party or admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = userData?.role === "admin";
    const isReporter = issue.reporter_id === user.id;
    const isGuest = issue.booking?.guest?.id === user.id;
    const isHost = issue.booking?.property?.host_id === user.id;

    if (!isAdmin && !isReporter && !isGuest && !isHost) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ issue, isAdmin });
  } catch (error: any) {
    console.error("Error fetching issue:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch issue" },
      { status: 500 }
    );
  }
}

// PATCH - Resolve issue (admin only)
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

    // Check admin role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const validated = ResolveIssueSchema.parse(body);

    // Get issue with booking details
    const { data: issue, error: issueError } = await supabase
      .from("booking_issues")
      .select(`
        *,
        booking:bookings (
          id,
          total_pennies,
          guest_fee_pennies,
          stripe_payment_intent_id,
          payout_status,
          start_date,
          end_date
        )
      `)
      .eq("id", id)
      .single();

    if (issueError || !issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    if (issue.status === "approved" || issue.status === "rejected") {
      return NextResponse.json({ error: "Issue already resolved" }, { status: 400 });
    }

    // Process based on resolution type
    let refundAmount = 0;
    let stripeRefundId = null;

    switch (validated.resolutionType) {
      case "no_action":
        // No refund, just resolve the issue
        break;

      case "partial_refund":
        if (!validated.refundAmountPennies) {
          return NextResponse.json({ error: "Refund amount required for partial refund" }, { status: 400 });
        }
        refundAmount = validated.refundAmountPennies;
        break;

      case "unused_nights_refund":
        // Calculate unused nights refund
        const startDate = new Date(issue.booking.start_date);
        const endDate = new Date(issue.booking.end_date);
        const now = new Date();
        const totalNights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const usedNights = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const unusedNights = Math.max(0, totalNights - usedNights);
        const perNightValue = (issue.booking.total_pennies - (issue.booking.guest_fee_pennies || 0)) / totalNights;
        refundAmount = Math.round(perNightValue * unusedNights);
        break;

      case "full_refund":
        refundAmount = issue.booking.total_pennies - (issue.booking.guest_fee_pennies || 0);
        break;

      case "payout_cancelled":
        // Cancel host payout without guest refund
        refundAmount = 0;
        break;
    }

    // Process Stripe refund if needed
    if (refundAmount > 0 && issue.booking.stripe_payment_intent_id) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: issue.booking.stripe_payment_intent_id,
          amount: refundAmount,
          reason: "requested_by_customer",
        });
        stripeRefundId = refund.id;
      } catch (stripeError: any) {
        console.error("Stripe refund error:", stripeError);
        // Continue with resolution but note the refund failed
      }
    }

    // Update issue
    const { data: updatedIssue, error: updateError } = await supabase
      .from("booking_issues")
      .update({
        status: validated.resolutionType === "no_action" ? "rejected" : "approved",
        resolution_type: validated.resolutionType,
        resolution_notes: validated.resolutionNotes,
        refund_amount_pennies: refundAmount,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating issue:", updateError);
      return NextResponse.json({ error: "Failed to resolve issue" }, { status: 500 });
    }

    // Update booking status if needed
    const bookingUpdates: any = {
      resolution_window_status: "resolved",
    };

    if (refundAmount > 0) {
      bookingUpdates.refund_amount_pennies = refundAmount;
      bookingUpdates.refund_processed_at = new Date().toISOString();
      bookingUpdates.stripe_refund_id = stripeRefundId;
      bookingUpdates.payment_status = refundAmount === issue.booking.total_pennies 
        ? "refunded" 
        : "partially_refunded";
    }

    if (validated.resolutionType === "payout_cancelled" || validated.resolutionType === "full_refund") {
      bookingUpdates.payout_status = "cancelled";
      
      // Cancel any scheduled payouts
      await supabase
        .from("scheduled_payouts")
        .update({ status: "cancelled" })
        .eq("booking_id", issue.booking_id)
        .eq("status", "scheduled");
    }

    await supabase
      .from("bookings")
      .update(bookingUpdates)
      .eq("id", issue.booking_id);

    // TODO: Send notification to guest and host about resolution

    return NextResponse.json({
      issue: updatedIssue,
      refundProcessed: refundAmount > 0,
      refundAmount,
    });
  } catch (error: any) {
    console.error("Issue resolution error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to resolve issue" },
      { status: 500 }
    );
  }
}

