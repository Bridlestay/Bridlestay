"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Home,
  Calendar,
  TrendingUp,
  DollarSign,
  AlertCircle,
  MapPin,
  Award,
  UserCheck,
  CheckCircle,
  XCircle,
  Flag,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Moon,
  Horse,
  Percent,
} from "lucide-react";
import { formatGBP } from "@/lib/fees";
import { ActivityFeed } from "@/components/admin/activity-feed";

interface AnalyticsData {
  summary: {
    totalUsers: number;
    guestCount: number;
    hostCount: number;
    adminCount: number;
    totalBookings: number;
    acceptedBookings: number;
    pendingBookings: number;
    totalRevenuePennies: number;
    pendingUserCount: number;
    pendingPropertyCount: number;
    activeUsersCount: number;
    acceptanceRate: string;
    averageBookingValue: number;
    cancellationRate: string;
    cancelledBookings: number;
    propertiesWithZeroBookings: number;
    flaggedMessagesPending: number;
    // New averages
    avgNightsPerBooking: number;
    avgHorsesPerBooking: number;
    avgGuestsPerBooking: number;
    avgNightlyPricePennies: number;
    avgPerHorseFeePennies: number;
  };
  popularCounties: Array<{ county: string; count: number }>;
  topProperties: Array<{
    id: string;
    name: string;
    location: string;
    bookings: number;
  }>;
  monthlyGrowth: Array<{
    month: string;
    users: number;
    bookings: number;
    revenue: number;
    properties: number;
  }>;
  monthComparison: {
    bookings: { thisMonth: number; lastMonth: number; change: string };
    users: { thisMonth: number; lastMonth: number; change: string };
    properties: { thisMonth: number; lastMonth: number; change: string };
    revenue: { thisMonth: number; lastMonth: number; change: string };
  };
  recentActivity: {
    bookings: Array<{
      id: string;
      type: string;
      guestName: string;
      propertyName: string;
      status: string;
      amount: number;
      createdAt: string;
    }>;
    users: Array<{
      id: string;
      type: string;
      name: string;
      email: string;
      role: string;
      verified: boolean;
      createdAt: string;
    }>;
    properties: Array<{
      id: string;
      type: string;
      name: string;
      location: string;
      hostName: string;
      verified: boolean;
      createdAt: string;
    }>;
  };
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch("/api/admin/analytics");
        if (response.ok) {
          const analyticsData = await response.json();
          setData(analyticsData);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Failed to load analytics</p>
        </CardContent>
      </Card>
    );
  }

  const { summary, popularCounties, topProperties, monthlyGrowth, monthComparison, recentActivity } = data;

  const getChangeIcon = (change: string) => {
    const changeNum = parseFloat(change);
    if (changeNum > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (changeNum < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeColor = (change: string) => {
    const changeNum = parseFloat(change);
    if (changeNum > 0) return "text-green-600";
    if (changeNum < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="insights">Booking Insights</TabsTrigger>
        <TabsTrigger value="growth">Growth & Trends</TabsTrigger>
        <TabsTrigger value="activity">Recent Activity</TabsTrigger>
      </TabsList>

      {/* ========== OVERVIEW TAB ========== */}
      <TabsContent value="overview" className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {summary.guestCount} guests • {summary.hostCount} hosts • {summary.adminCount} admins
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                {summary.acceptedBookings} accepted • {summary.pendingBookings} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatGBP(summary.totalRevenuePennies)}
              </div>
              <p className="text-xs text-muted-foreground">
                From accepted bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Property Verifications</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.pendingPropertyCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Properties awaiting review
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Popular Counties & Top Properties */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Most Popular Counties
              </CardTitle>
              <CardDescription>Properties by location</CardDescription>
            </CardHeader>
            <CardContent>
              {popularCounties.length > 0 ? (
                <div className="space-y-3">
                  {popularCounties.map((county, index) => (
                    <div key={county.county} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <span className="font-medium">{county.county}</span>
                      </div>
                      <Badge variant="secondary">{county.count} properties</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No properties yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Properties
              </CardTitle>
              <CardDescription>Most booked properties</CardDescription>
            </CardHeader>
            <CardContent>
              {topProperties.length > 0 ? (
                <div className="space-y-3">
                  {topProperties.map((property, index) => (
                    <div key={property.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{property.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {property.location}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0 ml-2">
                        {property.bookings} bookings
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No bookings yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ========== PERFORMANCE TAB ========== */}
      <TabsContent value="performance" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users (30d)</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.activeUsersCount}</div>
              <p className="text-xs text-muted-foreground">
                Made bookings in last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.acceptanceRate}%</div>
              <p className="text-xs text-muted-foreground">
                Bookings accepted by hosts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Booking Value</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatGBP(summary.averageBookingValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per booking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.cancellationRate}%</div>
              <p className="text-xs text-muted-foreground">
                {summary.cancelledBookings} cancelled
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties with 0 Bookings</CardTitle>
              <Home className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.propertiesWithZeroBookings}</div>
              <p className="text-xs text-muted-foreground">
                May need attention or marketing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flagged Messages Pending</CardTitle>
              <Flag className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.flaggedMessagesPending}</div>
              <p className="text-xs text-muted-foreground">
                Require moderation review
              </p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ========== BOOKING INSIGHTS TAB ========== */}
      <TabsContent value="insights" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Nightly Price</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatGBP(Math.round(summary.avgNightlyPricePennies))}
              </div>
              <p className="text-xs text-muted-foreground">
                Per night across all bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Nights per Booking</CardTitle>
              <Moon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.avgNightsPerBooking.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average stay duration
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Guests per Booking</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.avgGuestsPerBooking.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                People per booking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Horses per Booking</CardTitle>
              <Horse className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.avgHorsesPerBooking.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                Horses per booking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Per-Horse Fee</CardTitle>
              <DollarSign className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatGBP(Math.round(summary.avgPerHorseFeePennies))}
              </div>
              <p className="text-xs text-muted-foreground">
                Per horse per night
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Insights Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Patterns Summary</CardTitle>
            <CardDescription>Key insights from booking data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex-shrink-0 mt-0.5">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Average Stay Duration</p>
                  <p className="text-muted-foreground">
                    Guests typically book for <strong>{summary.avgNightsPerBooking.toFixed(1)} nights</strong>, 
                    with an average of <strong>{summary.avgGuestsPerBooking.toFixed(1)} guests</strong> per booking.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex-shrink-0 mt-0.5">
                  <Horse className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Equestrian Activity</p>
                  <p className="text-muted-foreground">
                    On average, bookings include <strong>{summary.avgHorsesPerBooking.toFixed(1)} horses</strong>, 
                    with an average per-horse fee of <strong>{formatGBP(Math.round(summary.avgPerHorseFeePennies))}</strong> per night.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex-shrink-0 mt-0.5">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Pricing Insights</p>
                  <p className="text-muted-foreground">
                    The average nightly rate is <strong>{formatGBP(Math.round(summary.avgNightlyPricePennies))}</strong>, 
                    with total booking value averaging <strong>{formatGBP(summary.averageBookingValue)}</strong>.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ========== GROWTH TAB ========== */}
      <TabsContent value="growth" className="space-y-6">
        {/* Month-over-Month Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Month-over-Month Comparison
            </CardTitle>
            <CardDescription>This month vs last month performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Bookings</span>
                  <div className="flex items-center gap-1">
                    {getChangeIcon(monthComparison.bookings.change)}
                    <span className={`text-sm font-semibold ${getChangeColor(monthComparison.bookings.change)}`}>
                      {monthComparison.bookings.change}%
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-bold">{monthComparison.bookings.thisMonth}</div>
                <p className="text-xs text-muted-foreground">
                  vs {monthComparison.bookings.lastMonth} last month
                </p>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Users</span>
                  <div className="flex items-center gap-1">
                    {getChangeIcon(monthComparison.users.change)}
                    <span className={`text-sm font-semibold ${getChangeColor(monthComparison.users.change)}`}>
                      {monthComparison.users.change}%
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-bold">{monthComparison.users.thisMonth}</div>
                <p className="text-xs text-muted-foreground">
                  vs {monthComparison.users.lastMonth} last month
                </p>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Properties</span>
                  <div className="flex items-center gap-1">
                    {getChangeIcon(monthComparison.properties.change)}
                    <span className={`text-sm font-semibold ${getChangeColor(monthComparison.properties.change)}`}>
                      {monthComparison.properties.change}%
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-bold">{monthComparison.properties.thisMonth}</div>
                <p className="text-xs text-muted-foreground">
                  vs {monthComparison.properties.lastMonth} last month
                </p>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Revenue</span>
                  <div className="flex items-center gap-1">
                    {getChangeIcon(monthComparison.revenue.change)}
                    <span className={`text-sm font-semibold ${getChangeColor(monthComparison.revenue.change)}`}>
                      {monthComparison.revenue.change}%
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-bold">
                  {formatGBP(monthComparison.revenue.thisMonth)}
                </div>
                <p className="text-xs text-muted-foreground">
                  vs {formatGBP(monthComparison.revenue.lastMonth)} last month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Growth Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly User & Property Growth</CardTitle>
              <CardDescription>New sign-ups and listings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="New Users"
                  />
                  <Line
                    type="monotone"
                    dataKey="properties"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="New Properties"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Bookings & Revenue</CardTitle>
              <CardDescription>Booking activity and income over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    label={{ value: "Bookings", angle: -90, position: "insideLeft" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    label={{ value: "Revenue (£)", angle: 90, position: "insideRight" }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="bookings"
                    fill="#3b82f6"
                    name="Bookings"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="revenue"
                    fill="#f59e0b"
                    name="Revenue (£)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ========== ACTIVITY TAB ========== */}
      <TabsContent value="activity" className="space-y-6">
        <ActivityFeed />
      </TabsContent>
    </Tabs>
  );
}

