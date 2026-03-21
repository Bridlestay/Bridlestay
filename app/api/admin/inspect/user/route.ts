import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Fetch user basic info
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all related data in parallel
    const [
      bookingsAsGuestResult,
      propertiesResult,
      bookingsAsHostResult,
      reviewsWrittenResult,
      reviewsReceivedResult,
      messagesResult,
      favoritesResult,
      horsesResult,
      flaggedMessagesResult,
      warningsResult,
      enforcementResult,
      reportsFiledResult,
      reportsAgainstResult,
      questionsAskedResult,
      questionsAnsweredResult,
      hostProfileResult,
    ] = await Promise.all([
      // Bookings made as guest
      supabase
        .from("bookings")
        .select("*, properties(name)")
        .eq("guest_id", userId),

      // Properties owned (if host)
      supabase
        .from("properties")
        .select("id, name, city, county, published, admin_verified, removed, created_at, nightly_price_pennies")
        .eq("host_id", userId),

      // Bookings received as host (on their properties)
      supabase
        .from("bookings")
        .select("*, properties!inner(id, name, host_id)")
        .eq("properties.host_id", userId),

      // Reviews written by user
      supabase
        .from("property_reviews")
        .select("*, properties(name)")
        .eq("reviewer_id", userId),

      // Reviews received (on user's properties)
      supabase
        .from("property_reviews")
        .select("*, properties!inner(id, name, host_id), reviewer:reviewer_id(name)")
        .eq("properties.host_id", userId),

      // Messages (sent and received)
      supabase
        .from("messages")
        .select("id, sender_id, recipient_id, created_at, read, message_type")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),

      // Favorites
      supabase
        .from("favorites")
        .select("*, properties(name)")
        .eq("user_id", userId),

      // Horses
      supabase
        .from("user_horses")
        .select("*")
        .eq("user_id", userId),

      // Flagged messages involving this user
      supabase
        .from("flagged_messages")
        .select("*")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),

      // User warnings issued to this user
      supabase
        .from("user_warnings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),

      // Enforcement actions (bans, restrictions) against this user
      supabase
        .from("enforcement_actions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),

      // Content reports filed BY this user
      supabase
        .from("content_reports")
        .select("*")
        .eq("reporter_id", userId),

      // Content reports filed AGAINST this user
      supabase
        .from("content_reports")
        .select("*")
        .eq("content_owner_id", userId),

      // Questions asked
      supabase
        .from("questions")
        .select("*, properties(name)")
        .eq("user_id", userId),

      // Questions answered (as host)
      supabase
        .from("questions")
        .select("*, properties!inner(id, name, host_id)")
        .eq("properties.host_id", userId)
        .not("answer", "is", null),

      // Host profile
      supabase
        .from("host_profiles")
        .select("*")
        .eq("user_id", userId)
        .single(),
    ]);

    // Process bookings as guest
    const bookingsAsGuest = bookingsAsGuestResult.data || [];
    const guestStats = {
      total: bookingsAsGuest.length,
      byStatus: {
        requested: bookingsAsGuest.filter((b) => b.status === "requested").length,
        accepted: bookingsAsGuest.filter((b) => b.status === "accepted").length,
        declined: bookingsAsGuest.filter((b) => b.status === "declined").length,
        cancelled: bookingsAsGuest.filter((b) => b.status === "cancelled").length,
        completed: bookingsAsGuest.filter((b) => b.status === "completed").length,
      },
      totalSpent: bookingsAsGuest
        .filter((b) => b.status === "accepted" || b.status === "completed")
        .reduce((sum, b) => sum + (b.total_charge_pennies || 0), 0),
      totalNights: bookingsAsGuest
        .filter((b) => b.status === "accepted" || b.status === "completed")
        .reduce((sum, b) => sum + (b.nights || 0), 0),
      recentBookings: bookingsAsGuest.slice(0, 5),
    };

    // Process properties
    const properties = propertiesResult.data || [];
    const propertyStats = {
      total: properties.length,
      published: properties.filter((p) => p.published).length,
      verified: properties.filter((p) => p.admin_verified).length,
      removed: properties.filter((p) => p.removed).length,
      properties: properties,
    };

    // Process bookings as host
    const bookingsAsHost = bookingsAsHostResult.data || [];
    const hostStats = {
      totalBookings: bookingsAsHost.length,
      byStatus: {
        requested: bookingsAsHost.filter((b) => b.status === "requested").length,
        accepted: bookingsAsHost.filter((b) => b.status === "accepted").length,
        declined: bookingsAsHost.filter((b) => b.status === "declined").length,
        cancelled: bookingsAsHost.filter((b) => b.status === "cancelled").length,
        completed: bookingsAsHost.filter((b) => b.status === "completed").length,
      },
      totalRevenue: bookingsAsHost
        .filter((b) => b.status === "accepted" || b.status === "completed")
        .reduce((sum, b) => sum + (b.host_payout_pennies || 0), 0),
      acceptanceRate:
        bookingsAsHost.length > 0
          ? (
              (bookingsAsHost.filter((b) => b.status === "accepted" || b.status === "completed").length /
                bookingsAsHost.filter((b) => b.status !== "requested").length) *
              100
            ).toFixed(1)
          : "N/A",
    };

    // Process reviews
    const reviewsWritten = reviewsWrittenResult.data || [];
    const reviewsReceived = reviewsReceivedResult.data || [];
    const reviewStats = {
      written: {
        total: reviewsWritten.length,
        avgRating:
          reviewsWritten.length > 0
            ? (reviewsWritten.reduce((sum, r) => sum + r.rating, 0) / reviewsWritten.length).toFixed(1)
            : "N/A",
      },
      received: {
        total: reviewsReceived.length,
        avgRating:
          reviewsReceived.length > 0
            ? (reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / reviewsReceived.length).toFixed(1)
            : "N/A",
      },
    };

    // Process messages
    const messages = messagesResult.data || [];
    const messageStats = {
      sent: messages.filter((m) => m.sender_id === userId).length,
      received: messages.filter((m) => m.recipient_id === userId).length,
      unread: messages.filter((m) => m.recipient_id === userId && !m.read).length,
    };

    // Process flagged messages
    const flaggedMessages = flaggedMessagesResult.data || [];
    const flaggedStats = {
      total: flaggedMessages.length,
      asSender: flaggedMessages.filter((f) => f.sender_id === userId).length,
      asRecipient: flaggedMessages.filter((f) => f.recipient_id === userId).length,
    };

    // Process moderation data
    const warnings = warningsResult.data || [];
    const enforcementActions = enforcementResult.data || [];
    const reportsFiled = reportsFiledResult.data || [];
    const reportsAgainst = reportsAgainstResult.data || [];
    
    const moderationStats = {
      trustScore: userData.trust_score || 50,
      warnings: {
        total: warnings.length,
        unacknowledged: warnings.filter((w: any) => !w.acknowledged).length,
        recent: warnings.slice(0, 5),
      },
      enforcement: {
        total: enforcementActions.length,
        active: enforcementActions.filter((e: any) => 
          e.status === 'active' || 
          (e.expires_at && new Date(e.expires_at) > new Date())
        ).length,
        bans: enforcementActions.filter((e: any) => e.action_type === 'ban').length,
        suspensions: enforcementActions.filter((e: any) => e.action_type === 'suspension').length,
        recent: enforcementActions.slice(0, 5),
      },
      reports: {
        filed: reportsFiled.length,
        against: reportsAgainst.length,
        falseReports: reportsFiled.filter((r: any) => r.status === 'false_report').length,
      },
      isBanned: enforcementActions.some((e: any) => 
        e.action_type === 'ban' && 
        e.status === 'active' && 
        (!e.expires_at || new Date(e.expires_at) > new Date())
      ),
      isSuspended: enforcementActions.some((e: any) => 
        e.action_type === 'suspension' && 
        e.status === 'active' && 
        (!e.expires_at || new Date(e.expires_at) > new Date())
      ),
    };

    // Process other data
    const favorites = favoritesResult.data || [];
    const horses = horsesResult.data || [];
    const questionsAsked = questionsAskedResult.data || [];
    const questionsAnswered = questionsAnsweredResult.data || [];
    const hostProfile = hostProfileResult.data;

    return NextResponse.json({
      user: userData,
      guestStats,
      propertyStats,
      hostStats,
      reviewStats,
      messageStats,
      flaggedStats,
      moderationStats,
      favorites: {
        total: favorites.length,
        items: favorites,
      },
      horses: {
        total: horses.length,
        items: horses,
      },
      questions: {
        asked: questionsAsked.length,
        answered: questionsAnswered.length,
      },
      hostProfile,
    });
  } catch (error: any) {
    console.error("Error inspecting user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to inspect user" },
      { status: 500 }
    );
  }
}

