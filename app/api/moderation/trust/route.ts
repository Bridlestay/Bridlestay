import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Get user's trust score and level
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || user.id;

    // Check if admin for viewing other users
    if (userId !== user.id) {
      const { data: currentUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (currentUser?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data: userData, error } = await supabase
      .from("users")
      .select(`
        trust_score,
        trust_level,
        has_social_login,
        social_login_provider,
        created_at,
        total_bookings_made,
        total_bookings_hosted,
        reviews_given,
        accurate_reports,
        false_reports,
        warnings_received,
        is_restricted,
        restriction_reason,
        restriction_ends_at
      `)
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching trust data:", error);
      return NextResponse.json({ error: "Failed to fetch trust data" }, { status: 500 });
    }

    // Calculate account age in days
    const accountAgeDays = userData?.created_at 
      ? Math.floor((Date.now() - new Date(userData.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return NextResponse.json({ 
      trust: { ...userData, account_age_days: accountAgeDays },
      breakdown: {
        baseScore: 30,
        ageBonus: Math.min(15, Math.floor(accountAgeDays / 30)),
        socialBonus: userData?.has_social_login ? 10 : 0,
        activityBonus: Math.min(15, ((userData?.total_bookings_made || 0) + (userData?.total_bookings_hosted || 0)) * 3),
        reviewBonus: Math.min(10, (userData?.reviews_given || 0) * 2),
        reportBonus: Math.min(10, (userData?.accurate_reports || 0) * 5),
        reportPenalty: -Math.min(20, (userData?.false_reports || 0) * 10),
        warningPenalty: -Math.min(30, (userData?.warnings_received || 0) * 10),
      }
    });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch trust data" },
      { status: 500 }
    );
  }
}

// POST - Recalculate trust score (admin only or self)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();
    const targetUserId = userId || user.id;

    // Check if admin for updating other users
    if (targetUserId !== user.id) {
      const { data: currentUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (currentUser?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Recalculate trust score
    const { data: newScore, error } = await supabase.rpc("update_user_trust_score", {
      p_user_id: targetUserId
    });

    if (error) {
      console.error("Error recalculating trust score:", error);
      return NextResponse.json({ error: "Failed to recalculate" }, { status: 500 });
    }

    // Get updated user data
    const { data: userData } = await supabase
      .from("users")
      .select("trust_score, trust_level")
      .eq("id", targetUserId)
      .single();

    return NextResponse.json({ 
      success: true,
      trust_score: userData?.trust_score,
      trust_level: userData?.trust_level,
    });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to recalculate" },
      { status: 500 }
    );
  }
}

