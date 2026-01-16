import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Admin Activity Feed API
 * Returns a comprehensive feed of all platform activity for admin monitoring
 * 
 * Activity types:
 * - booking_requested, booking_accepted, booking_declined, booking_cancelled, booking_completed
 * - user_registered
 * - property_created, property_verified, property_removed
 * - review_posted
 * - route_created
 * - claim_filed
 * - message_flagged
 */

interface ActivityItem {
  id: string;
  type: string;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  property?: {
    id: string;
    name: string;
    removed: boolean;
  };
  metadata: Record<string, any>;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get limit from query params (default 50)
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Fetch all activity types in parallel
    const [
      bookingsData,
      usersData,
      propertiesData,
      reviewsData,
      routesData,
      claimsData,
      flaggedData,
    ] = await Promise.all([
      // Recent bookings with guest and property info
      supabase
        .from("bookings")
        .select(`
          id, 
          status, 
          created_at, 
          updated_at,
          total_pennies,
          nights,
          guests,
          horses,
          check_in,
          check_out,
          guest:users!guest_id(id, name, avatar_url),
          property:properties!property_id(id, name, removed, host:users!host_id(id, name, avatar_url))
        `)
        .order("updated_at", { ascending: false })
        .limit(limit),

      // Recent users
      supabase
        .from("users")
        .select("id, name, email, avatar_url, role, created_at")
        .order("created_at", { ascending: false })
        .limit(limit),

      // Recent properties with host info
      supabase
        .from("properties")
        .select(`
          id, 
          name, 
          city, 
          county, 
          created_at, 
          admin_verified,
          verified_at,
          removed,
          removed_at,
          published,
          host:users!host_id(id, name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(limit),

      // Recent reviews
      supabase
        .from("property_reviews")
        .select(`
          id,
          rating,
          created_at,
          property:properties!property_id(id, name, removed),
          reviewer:users!reviewer_id(id, name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(limit),

      // Recent routes
      supabase
        .from("routes")
        .select(`
          id,
          name,
          distance_km,
          created_at,
          creator:users!created_by(id, name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(limit),

      // Recent damage claims
      supabase
        .from("property_damage_claims")
        .select(`
          id,
          status,
          amount_pennies,
          created_at,
          booking:bookings!booking_id(
            id,
            guest:users!guest_id(id, name, avatar_url),
            property:properties!property_id(id, name, removed)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit),

      // Recent flagged messages
      supabase
        .from("flagged_messages")
        .select(`
          id,
          reason,
          created_at,
          reviewed,
          sender:users!sender_id(id, name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    const activities: ActivityItem[] = [];

    // Process bookings - create activity for each status change
    (bookingsData.data || []).forEach((booking: any) => {
      const guest = booking.guest;
      const property = booking.property;
      const host = property?.host;

      activities.push({
        id: `booking-${booking.id}-${booking.status}`,
        type: `booking_${booking.status}`,
        timestamp: booking.updated_at || booking.created_at,
        user: guest ? {
          id: guest.id,
          name: guest.name || "Unknown",
          avatar_url: guest.avatar_url,
        } : undefined,
        property: property ? {
          id: property.id,
          name: property.name,
          removed: property.removed || false,
        } : undefined,
        metadata: {
          amount: booking.total_pennies,
          nights: booking.nights,
          guests: booking.guests,
          horses: booking.horses,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          hostName: host?.name || "Unknown",
          hostId: host?.id,
          hostAvatar: host?.avatar_url,
        },
      });
    });

    // Process new users
    (usersData.data || []).forEach((u: any) => {
      activities.push({
        id: `user-${u.id}`,
        type: "user_registered",
        timestamp: u.created_at,
        user: {
          id: u.id,
          name: u.name || "Unknown",
          avatar_url: u.avatar_url,
        },
        metadata: {
          email: u.email,
          role: u.role,
        },
      });
    });

    // Process properties
    (propertiesData.data || []).forEach((p: any) => {
      const host = p.host;
      
      // Property created
      activities.push({
        id: `property-created-${p.id}`,
        type: "property_created",
        timestamp: p.created_at,
        user: host ? {
          id: host.id,
          name: host.name || "Unknown",
          avatar_url: host.avatar_url,
        } : undefined,
        property: {
          id: p.id,
          name: p.name,
          removed: p.removed || false,
        },
        metadata: {
          location: `${p.city}, ${p.county}`,
          published: p.published,
        },
      });

      // Property verified
      if (p.admin_verified && p.verified_at) {
        activities.push({
          id: `property-verified-${p.id}`,
          type: "property_verified",
          timestamp: p.verified_at,
          user: host ? {
            id: host.id,
            name: host.name || "Unknown",
            avatar_url: host.avatar_url,
          } : undefined,
          property: {
            id: p.id,
            name: p.name,
            removed: p.removed || false,
          },
          metadata: {
            location: `${p.city}, ${p.county}`,
          },
        });
      }

      // Property removed
      if (p.removed && p.removed_at) {
        activities.push({
          id: `property-removed-${p.id}`,
          type: "property_removed",
          timestamp: p.removed_at,
          user: host ? {
            id: host.id,
            name: host.name || "Unknown",
            avatar_url: host.avatar_url,
          } : undefined,
          property: {
            id: p.id,
            name: p.name,
            removed: true,
          },
          metadata: {
            location: `${p.city}, ${p.county}`,
          },
        });
      }
    });

    // Process reviews
    (reviewsData.data || []).forEach((r: any) => {
      const reviewer = r.reviewer;
      const property = r.property;

      activities.push({
        id: `review-${r.id}`,
        type: "review_posted",
        timestamp: r.created_at,
        user: reviewer ? {
          id: reviewer.id,
          name: reviewer.name || "Unknown",
          avatar_url: reviewer.avatar_url,
        } : undefined,
        property: property ? {
          id: property.id,
          name: property.name,
          removed: property.removed || false,
        } : undefined,
        metadata: {
          rating: r.rating,
        },
      });
    });

    // Process routes
    (routesData.data || []).forEach((route: any) => {
      const creator = route.creator;

      activities.push({
        id: `route-${route.id}`,
        type: "route_created",
        timestamp: route.created_at,
        user: creator ? {
          id: creator.id,
          name: creator.name || "Unknown",
          avatar_url: creator.avatar_url,
        } : undefined,
        metadata: {
          routeId: route.id,
          routeName: route.name,
          distance: route.distance_km,
        },
      });
    });

    // Process damage claims
    (claimsData.data || []).forEach((claim: any) => {
      const booking = claim.booking;
      const guest = booking?.guest;
      const property = booking?.property;

      activities.push({
        id: `claim-${claim.id}`,
        type: "claim_filed",
        timestamp: claim.created_at,
        user: guest ? {
          id: guest.id,
          name: guest.name || "Unknown",
          avatar_url: guest.avatar_url,
        } : undefined,
        property: property ? {
          id: property.id,
          name: property.name,
          removed: property.removed || false,
        } : undefined,
        metadata: {
          claimId: claim.id,
          status: claim.status,
          amount: claim.amount_pennies,
        },
      });
    });

    // Process flagged messages
    (flaggedData.data || []).forEach((flagged: any) => {
      const sender = flagged.sender;

      activities.push({
        id: `flagged-${flagged.id}`,
        type: "message_flagged",
        timestamp: flagged.created_at,
        user: sender ? {
          id: sender.id,
          name: sender.name || "Unknown",
          avatar_url: sender.avatar_url,
        } : undefined,
        metadata: {
          flagId: flagged.id,
          reason: flagged.reason,
          reviewed: flagged.reviewed,
        },
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Limit to requested number
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({ 
      activities: limitedActivities,
      totalFetched: activities.length,
    });
  } catch (error: any) {
    console.error("Activity feed error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch activity feed" },
      { status: 500 }
    );
  }
}

