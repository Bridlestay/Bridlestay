import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Check ride status for current user on this route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: completion } = await supabase
      .from("route_completions")
      .select("id, ride_count, last_ridden_at, completed_at, rating")
      .eq("route_id", routeId)
      .eq("user_id", user.id)
      .single();

    if (!completion) {
      return NextResponse.json({
        hasRidden: false,
        rideCount: 0,
        lastRiddenAt: null,
        canRideAgain: true,
        cooldownEndsAt: null,
        hasReview: false,
      });
    }

    const lastRidden = new Date(completion.last_ridden_at);
    const cooldownEnd = new Date(lastRidden.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const canRideAgain = now >= cooldownEnd;

    return NextResponse.json({
      hasRidden: true,
      rideCount: completion.ride_count || 1,
      lastRiddenAt: completion.last_ridden_at,
      canRideAgain,
      cooldownEndsAt: canRideAgain ? null : cooldownEnd.toISOString(),
      hasReview: !!completion.rating,
    });
  } catch (error: any) {
    console.error("[RIDE] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check ride status" },
      { status: 500 }
    );
  }
}

// POST - Log a ride tally (increment ride_count)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if route exists
    const { data: route } = await supabase
      .from("routes")
      .select("id, title")
      .eq("id", routeId)
      .single();

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Check existing completion
    const { data: existing } = await supabase
      .from("route_completions")
      .select("id, ride_count, last_ridden_at")
      .eq("route_id", routeId)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      // First ride — create completion record (no review yet)
      const { error: insertError } = await supabase
        .from("route_completions")
        .insert({
          route_id: routeId,
          user_id: user.id,
          ride_count: 1,
          last_ridden_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("[RIDE] Insert error:", insertError);
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        rideCount: 1,
        isFirstRide: true,
        message: "First ride logged!",
      });
    }

    // Existing completion — check 24h cooldown
    const lastRidden = new Date(existing.last_ridden_at);
    const cooldownEnd = new Date(lastRidden.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now < cooldownEnd) {
      return NextResponse.json(
        {
          error: "Cooldown active",
          cooldownEndsAt: cooldownEnd.toISOString(),
          rideCount: existing.ride_count,
        },
        { status: 429 }
      );
    }

    // Increment ride_count
    const newCount = (existing.ride_count || 1) + 1;
    const { error: updateError } = await supabase
      .from("route_completions")
      .update({
        ride_count: newCount,
        last_ridden_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("[RIDE] Update error:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      rideCount: newCount,
      isFirstRide: false,
      message: `Ride #${newCount} logged!`,
    });
  } catch (error: any) {
    console.error("[RIDE] POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log ride" },
      { status: 500 }
    );
  }
}
