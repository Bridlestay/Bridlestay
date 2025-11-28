import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    // Calculate date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Fetch analytics data in parallel
    const [
      usersData,
      bookingsData,
      revenueData,
      pendingVerificationsData,
      propertiesByCountyData,
      topPropertiesData,
      monthlyGrowthData,
      activeUsersData,
      thisMonthBookingsData,
      lastMonthBookingsData,
      thisMonthUsersData,
      lastMonthUsersData,
      thisMonthPropertiesData,
      lastMonthPropertiesData,
      allPropertiesData,
      flaggedMessagesData,
      recentBookingsData,
      recentUsersData,
      recentPropertiesData,
    ] = await Promise.all([
      // Total users by role
      supabase.from("users").select("role", { count: "exact", head: false }),

      // Total bookings by status (with detailed data for averages)
      supabase.from("bookings").select("status, total_pennies, nights, horses, base_price_pennies, guests", { count: "exact", head: false }),

      // Total revenue (accepted bookings only)
      supabase
        .from("bookings")
        .select("total_pennies")
        .eq("status", "accepted"),

      // Pending verifications
      Promise.all([
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("admin_verified", false),
        supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .eq("admin_verified", false)
          .eq("published", true),
      ]),

      // Properties by county
      supabase
        .from("properties")
        .select("county")
        .eq("published", true),

      // Top properties by bookings
      supabase
        .from("bookings")
        .select("property_id, properties(id, name, county, city)")
        .not("properties", "is", null),

      // Monthly growth (last 12 months)
      Promise.all([
        supabase
          .from("users")
          .select("created_at")
          .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("bookings")
          .select("created_at, total_pennies")
          .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("properties")
          .select("created_at")
          .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),
      ]),

      // Active users (last 30 days) - users who created bookings or logged in
      supabase
        .from("bookings")
        .select("guest_id")
        .gte("created_at", thirtyDaysAgo.toISOString()),

      // This month bookings
      supabase
        .from("bookings")
        .select("status, total_pennies")
        .gte("created_at", startOfThisMonth.toISOString()),

      // Last month bookings
      supabase
        .from("bookings")
        .select("status, total_pennies")
        .gte("created_at", startOfLastMonth.toISOString())
        .lte("created_at", endOfLastMonth.toISOString()),

      // This month users
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfThisMonth.toISOString()),

      // Last month users
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfLastMonth.toISOString())
        .lte("created_at", endOfLastMonth.toISOString()),

      // This month properties
      supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfThisMonth.toISOString()),

      // Last month properties
      supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfLastMonth.toISOString())
        .lte("created_at", endOfLastMonth.toISOString()),

      // All properties with booking count
      supabase
        .from("properties")
        .select("id, name, host_id, created_at")
        .eq("published", true),

      // Flagged messages pending review (exclude deleted)
      supabase
        .from("flagged_messages")
        .select("*", { count: "exact", head: true })
        .eq("reviewed", false)
        .eq("deleted", false),

      // Recent bookings (last 20)
      supabase
        .from("bookings")
        .select("id, created_at, status, total_pennies, guest_id, property_id, users!guest_id(name), properties(name)")
        .order("created_at", { ascending: false })
        .limit(20),

      // Recent users (last 20)
      supabase
        .from("users")
        .select("id, name, email, role, created_at, admin_verified")
        .order("created_at", { ascending: false })
        .limit(20),

      // Recent properties (last 20)
      supabase
        .from("properties")
        .select("id, name, county, city, created_at, admin_verified, users!host_id(name)")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // Process users data
    const users = usersData.data || [];
    const totalUsers = users.length;
    const guestCount = users.filter((u) => u.role === "guest").length;
    const hostCount = users.filter((u) => u.role === "host").length;
    const adminCount = users.filter((u) => u.role === "admin").length;

    // Process bookings data
    const bookings = bookingsData.data || [];
    const totalBookings = bookings.length;
    const acceptedBookings = bookings.filter((b) => b.status === "accepted").length;
    const pendingBookings = bookings.filter((b) => b.status === "requested").length;

    // Calculate total revenue
    const totalRevenuePennies = (revenueData.data || []).reduce(
      (sum, booking) => sum + (booking.total_pennies || 0),
      0
    );

    // Pending verifications
    const [pendingUsers, pendingProperties] = pendingVerificationsData;
    const pendingUserCount = pendingUsers.count || 0;
    const pendingPropertyCount = pendingProperties.count || 0;

    // Properties by county
    const countyCounts: Record<string, number> = {};
    (propertiesByCountyData.data || []).forEach((prop) => {
      const county = prop.county || "Unknown";
      countyCounts[county] = (countyCounts[county] || 0) + 1;
    });
    const popularCounties = Object.entries(countyCounts)
      .map(([county, count]) => ({ county, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top properties by bookings
    const propertyBookingCounts: Record<string, { property: any; count: number }> = {};
    (topPropertiesData.data || []).forEach((booking: any) => {
      if (booking.properties) {
        const prop = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
        if (prop) {
          const propId = prop.id;
          if (!propertyBookingCounts[propId]) {
            propertyBookingCounts[propId] = {
              property: prop,
              count: 0,
            };
          }
          propertyBookingCounts[propId].count += 1;
        }
      }
    });
    const topProperties = Object.values(propertyBookingCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => ({
        id: item.property.id,
        name: item.property.name,
        location: `${item.property.city}, ${item.property.county}`,
        bookings: item.count,
      }));

    // Monthly growth
    const [usersGrowth, bookingsGrowth, propertiesGrowth] = monthlyGrowthData;

    // Group by month
    const monthlyData: Record<
      string,
      { month: string; users: number; bookings: number; revenue: number; properties: number }
    > = {};

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      monthlyData[monthKey] = {
        month: monthLabel,
        users: 0,
        bookings: 0,
        revenue: 0,
        properties: 0,
      };
    }

    // Add users
    (usersGrowth.data || []).forEach((user) => {
      const date = new Date(user.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].users += 1;
      }
    });

    // Add bookings and revenue
    (bookingsGrowth.data || []).forEach((booking) => {
      const date = new Date(booking.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].bookings += 1;
        monthlyData[monthKey].revenue += (booking.total_pennies || 0) / 100; // Convert to pounds
      }
    });

    // Add properties
    (propertiesGrowth.data || []).forEach((property) => {
      const date = new Date(property.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].properties += 1;
      }
    });

    const monthlyGrowth = Object.values(monthlyData);

    // Calculate active users (unique users who made bookings in last 30 days)
    const activeUserIds = new Set((activeUsersData.data || []).map((b: any) => b.guest_id));
    const activeUsersCount = activeUserIds.size;

    // Calculate booking acceptance rate
    const acceptanceRate = totalBookings > 0 
      ? ((acceptedBookings / totalBookings) * 100).toFixed(1)
      : "0.0";

    // Calculate average booking value
    const averageBookingValue = acceptedBookings > 0
      ? Math.round(totalRevenuePennies / acceptedBookings)
      : 0;

    // Calculate cancellation rate
    const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;
    const cancellationRate = totalBookings > 0
      ? ((cancelledBookings / totalBookings) * 100).toFixed(1)
      : "0.0";

    // Find properties with 0 bookings
    const allProperties = allPropertiesData.data || [];
    const propertyBookingMap = new Map();
    (topPropertiesData.data || []).forEach((booking: any) => {
      if (booking.property_id) {
        propertyBookingMap.set(booking.property_id, true);
      }
    });
    const propertiesWithZeroBookings = allProperties.filter(
      (prop: any) => !propertyBookingMap.has(prop.id)
    ).length;

    // Flagged messages pending review
    const flaggedMessagesPending = flaggedMessagesData.count || 0;

    // This month vs last month comparison
    const thisMonthBookings = thisMonthBookingsData.data || [];
    const lastMonthBookings = lastMonthBookingsData.data || [];
    const thisMonthUsers = thisMonthUsersData.count || 0;
    const lastMonthUsers = lastMonthUsersData.count || 0;
    const thisMonthProperties = thisMonthPropertiesData.count || 0;
    const lastMonthProperties = lastMonthPropertiesData.count || 0;

    const thisMonthRevenue = thisMonthBookings
      .filter((b: any) => b.status === "accepted")
      .reduce((sum: number, b: any) => sum + (b.total_pennies || 0), 0);
    const lastMonthRevenue = lastMonthBookings
      .filter((b: any) => b.status === "accepted")
      .reduce((sum: number, b: any) => sum + (b.total_pennies || 0), 0);

    const monthComparison = {
      bookings: {
        thisMonth: thisMonthBookings.length,
        lastMonth: lastMonthBookings.length,
        change: lastMonthBookings.length > 0
          ? (((thisMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length) * 100).toFixed(1)
          : thisMonthBookings.length > 0 ? "100.0" : "0.0",
      },
      users: {
        thisMonth: thisMonthUsers,
        lastMonth: lastMonthUsers,
        change: lastMonthUsers > 0
          ? (((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100).toFixed(1)
          : thisMonthUsers > 0 ? "100.0" : "0.0",
      },
      properties: {
        thisMonth: thisMonthProperties,
        lastMonth: lastMonthProperties,
        change: lastMonthProperties > 0
          ? (((thisMonthProperties - lastMonthProperties) / lastMonthProperties) * 100).toFixed(1)
          : thisMonthProperties > 0 ? "100.0" : "0.0",
      },
      revenue: {
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        change: lastMonthRevenue > 0
          ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
          : thisMonthRevenue > 0 ? "100.0" : "0.0",
      },
    };

    // Calculate booking averages (only from confirmed/completed bookings)
    const completedBookings = bookings.filter((b) => 
      b.status === "confirmed" || b.status === "completed" || b.status === "accepted"
    );
    
    const avgNightsPerBooking = completedBookings.length > 0
      ? completedBookings.reduce((sum, b) => sum + (b.nights || 0), 0) / completedBookings.length
      : 0;
    
    const avgHorsesPerBooking = completedBookings.length > 0
      ? completedBookings.reduce((sum, b) => sum + (b.horses || 0), 0) / completedBookings.length
      : 0;
    
    const avgGuestsPerBooking = completedBookings.length > 0
      ? completedBookings.reduce((sum, b) => sum + (b.guests || 1), 0) / completedBookings.length
      : 0;
    
    // Calculate average nightly price (base_price_pennies / nights)
    const bookingsWithNights = completedBookings.filter((b) => b.nights && b.nights > 0);
    const avgNightlyPricePennies = bookingsWithNights.length > 0
      ? bookingsWithNights.reduce((sum, b) => sum + ((b.base_price_pennies || 0) / b.nights), 0) / bookingsWithNights.length
      : 0;
    
    // Calculate average per-horse fee (only from bookings with horses)
    const bookingsWithHorses = completedBookings.filter((b) => b.horses && b.horses > 0 && b.nights && b.nights > 0);
    const avgPerHorseFeePennies = bookingsWithHorses.length > 0
      ? bookingsWithHorses.reduce((sum, b) => {
          // Estimate per-horse fee: (total - base) / (horses * nights)
          const basePrice = b.base_price_pennies || 0;
          const totalPrice = b.total_pennies || 0;
          const extraCharge = totalPrice - basePrice;
          const horseNights = b.horses * b.nights;
          return sum + (horseNights > 0 ? extraCharge / horseNights : 0);
        }, 0) / bookingsWithHorses.length
      : 0;

    // Recent activity
    const recentActivity = {
      bookings: (recentBookingsData.data || []).map((b: any) => ({
        id: b.id,
        type: "booking",
        guestName: b.users?.name || "Unknown",
        propertyName: b.properties?.name || "Unknown",
        status: b.status,
        amount: b.total_pennies,
        createdAt: b.created_at,
      })),
      users: (recentUsersData.data || []).map((u: any) => ({
        id: u.id,
        type: "user",
        name: u.name,
        email: u.email,
        role: u.role,
        verified: u.admin_verified,
        createdAt: u.created_at,
      })),
      properties: (recentPropertiesData.data || []).map((p: any) => ({
        id: p.id,
        type: "property",
        name: p.name,
        location: `${p.city}, ${p.county}`,
        hostName: p.users?.name || "Unknown",
        verified: p.admin_verified,
        createdAt: p.created_at,
      })),
    };

    return NextResponse.json({
      summary: {
        totalUsers,
        guestCount,
        hostCount,
        adminCount,
        totalBookings,
        acceptedBookings,
        pendingBookings,
        totalRevenuePennies,
        pendingUserCount,
        pendingPropertyCount,
        activeUsersCount,
        acceptanceRate,
        averageBookingValue,
        cancellationRate,
        cancelledBookings,
        propertiesWithZeroBookings,
        flaggedMessagesPending,
        // New averages
        avgNightsPerBooking,
        avgHorsesPerBooking,
        avgGuestsPerBooking,
        avgNightlyPricePennies,
        avgPerHorseFeePennies,
      },
      popularCounties,
      topProperties,
      monthlyGrowth,
      monthComparison,
      recentActivity,
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

