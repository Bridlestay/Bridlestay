"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatGBP } from "@/lib/fees";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Home,
  Star,
  MapPin,
  AlertTriangle,
  MessageSquare,
  Flag,
  Ban,
  RefreshCw,
  Filter,
  Activity,
  Users,
  Bookmark,
  Route,
  DollarSign,
  ChevronDown,
  ExternalLink,
  Eye,
} from "lucide-react";

interface ActivityUser {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ActivityProperty {
  id: string;
  name: string;
  removed: boolean;
}

interface ActivityItem {
  id: string;
  type: string;
  timestamp: string;
  user?: ActivityUser;
  property?: ActivityProperty;
  metadata: Record<string, any>;
}

// Activity type configurations
const activityConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  label: string;
  description: (item: ActivityItem) => string;
}> = {
  booking_requested: {
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    label: "Booking Requested",
    description: (item) => `requested to book ${item.property?.name || "a property"}`,
  },
  booking_accepted: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Booking Accepted",
    description: (item) => `booking at ${item.property?.name || "a property"} was accepted`,
  },
  booking_declined: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Booking Declined",
    description: (item) => `booking at ${item.property?.name || "a property"} was declined`,
  },
  booking_cancelled: {
    icon: Ban,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    label: "Booking Cancelled",
    description: (item) => `cancelled booking at ${item.property?.name || "a property"}`,
  },
  booking_completed: {
    icon: CheckCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Stay Completed",
    description: (item) => `completed stay at ${item.property?.name || "a property"}`,
  },
  user_registered: {
    icon: UserPlus,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    label: "New User",
    description: (item) => `joined as a ${item.metadata.role}`,
  },
  property_created: {
    icon: Home,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    label: "Property Listed",
    description: (item) => `listed ${item.property?.name || "a new property"}`,
  },
  property_verified: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Property Verified",
    description: (item) => `${item.property?.name || "property"} was verified`,
  },
  property_removed: {
    icon: Ban,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Property Removed",
    description: (item) => `${item.property?.name || "property"} was removed`,
  },
  review_posted: {
    icon: Star,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    label: "Review Posted",
    description: (item) => `left a ${item.metadata.rating}★ review for ${item.property?.name || "a property"}`,
  },
  route_created: {
    icon: Route,
    color: "text-teal-600",
    bgColor: "bg-teal-100",
    label: "Route Created",
    description: (item) => `created route "${item.metadata.routeName}"`,
  },
  claim_filed: {
    icon: AlertTriangle,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    label: "Claim Filed",
    description: (item) => `damage claim filed for ${item.property?.name || "a property"}`,
  },
  message_flagged: {
    icon: Flag,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Message Flagged",
    description: (item) => `message was flagged: ${item.metadata.reason}`,
  },
};

// Filter categories
const filterCategories = [
  { id: "all", label: "All Activity", icon: Activity },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "users", label: "Users", icon: Users },
  { id: "properties", label: "Properties", icon: Home },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "routes", label: "Routes", icon: Route },
  { id: "moderation", label: "Moderation", icon: Flag },
];

function ActivityItemCard({ item }: { item: ActivityItem }) {
  const config = activityConfig[item.type] || {
    icon: Activity,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    label: item.type,
    description: () => "performed an action",
  };

  const Icon = config.icon;
  const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true });
  const fullDate = format(new Date(item.timestamp), "dd MMM yyyy 'at' HH:mm");

  return (
    <div className="flex gap-3 p-4 hover:bg-muted/30 transition-colors border-b last:border-b-0">
      {/* Activity Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
        <Icon className={`h-5 w-5 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Main line with user and action */}
        <div className="flex items-start gap-2 flex-wrap">
          {item.user && (
            <Link 
              href={`/profile/${item.user.id}`} 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={item.user.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10">
                  {item.user.name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm hover:underline">
                {item.user.name}
              </span>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {config.description(item)}
          </span>
        </div>

        {/* Property link if applicable */}
        {item.property && (
          <div className="mt-1 flex items-center gap-1">
            {item.property.removed ? (
              <span className="text-sm text-red-600 flex items-center gap-1">
                <Ban className="h-3 w-3" />
                <span className="line-through">{item.property.name}</span>
                <Badge variant="destructive" className="text-xs ml-1">Removed</Badge>
              </span>
            ) : (
              <Link 
                href={`/property/${item.property.id}`}
                target="_blank"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Home className="h-3 w-3" />
                {item.property.name}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}

        {/* Metadata display based on type */}
        {item.type.startsWith("booking") && item.metadata.amount && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="font-mono">
              {formatGBP(item.metadata.amount)}
            </Badge>
            {item.metadata.nights && (
              <Badge variant="outline">
                {item.metadata.nights} night{item.metadata.nights !== 1 ? "s" : ""}
              </Badge>
            )}
            {item.metadata.guests && (
              <Badge variant="outline">
                {item.metadata.guests} guest{item.metadata.guests !== 1 ? "s" : ""}
              </Badge>
            )}
            {item.metadata.horses > 0 && (
              <Badge variant="outline">
                {item.metadata.horses} horse{item.metadata.horses !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        )}

        {item.type === "route_created" && item.metadata.distance && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              {item.metadata.distance.toFixed(1)} km
            </Badge>
          </div>
        )}

        {item.type === "claim_filed" && (
          <div className="mt-2 flex gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {formatGBP(item.metadata.amount)}
            </Badge>
            <Badge 
              variant={item.metadata.status === "pending" ? "secondary" : "default"}
              className="text-xs"
            >
              {item.metadata.status}
            </Badge>
          </div>
        )}

        {item.type === "message_flagged" && !item.metadata.reviewed && (
          <Badge variant="destructive" className="mt-2 text-xs">
            Pending Review
          </Badge>
        )}

        {/* Timestamp */}
        <div className="mt-2 text-xs text-muted-foreground" title={fullDate}>
          {timeAgo}
        </div>
      </div>

      {/* Quick action for bookings with host */}
      {item.type.startsWith("booking") && item.metadata.hostId && (
        <div className="flex-shrink-0">
          <Link href={`/profile/${item.metadata.hostId}`}>
            <Avatar className="h-8 w-8 border-2 border-white shadow-sm" title={`Host: ${item.metadata.hostName}`}>
              <AvatarImage src={item.metadata.hostAvatar || undefined} />
              <AvatarFallback className="text-xs bg-secondary">
                {item.metadata.hostName?.[0]?.toUpperCase() || "H"}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      )}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex gap-3 p-4 border-b">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(50);

  const fetchActivities = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch(`/api/admin/activity-feed?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [limit]);

  // Filter activities based on selected category
  const filteredActivities = activities.filter((item) => {
    if (filter === "all") return true;
    if (filter === "bookings") return item.type.startsWith("booking");
    if (filter === "users") return item.type === "user_registered";
    if (filter === "properties") return item.type.startsWith("property");
    if (filter === "reviews") return item.type === "review_posted";
    if (filter === "routes") return item.type === "route_created";
    if (filter === "moderation") return item.type === "claim_filed" || item.type === "message_flagged";
    return true;
  });

  // Group activities by date for better visual organization
  const groupedActivities: Record<string, ActivityItem[]> = {};
  filteredActivities.forEach((item) => {
    const date = format(new Date(item.timestamp), "yyyy-MM-dd");
    if (!groupedActivities[date]) {
      groupedActivities[date] = [];
    }
    groupedActivities[date].push(item);
  });

  const dateLabels: Record<string, string> = {};
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
  
  Object.keys(groupedActivities).forEach((date) => {
    if (date === today) {
      dateLabels[date] = "Today";
    } else if (date === yesterday) {
      dateLabels[date] = "Yesterday";
    } else {
      dateLabels[date] = format(new Date(date), "EEEE, dd MMMM yyyy");
    }
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
            </CardTitle>
            <CardDescription>
              Real-time platform activity • {filteredActivities.length} items
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchActivities(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {filterCategories.map((cat) => {
            const Icon = cat.icon;
            const count = cat.id === "all" 
              ? activities.length 
              : activities.filter((item) => {
                  if (cat.id === "bookings") return item.type.startsWith("booking");
                  if (cat.id === "users") return item.type === "user_registered";
                  if (cat.id === "properties") return item.type.startsWith("property");
                  if (cat.id === "reviews") return item.type === "review_posted";
                  if (cat.id === "routes") return item.type === "route_created";
                  if (cat.id === "moderation") return item.type === "claim_filed" || item.type === "message_flagged";
                  return false;
                }).length;

            return (
              <Button
                key={cat.id}
                variant={filter === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(cat.id)}
                className="gap-1"
              >
                <Icon className="h-3 w-3" />
                {cat.label}
                {count > 0 && (
                  <Badge 
                    variant={filter === cat.id ? "secondary" : "outline"} 
                    className="ml-1 text-xs px-1.5"
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {loading ? (
            <div>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <ActivitySkeleton key={i} />
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No activity found</p>
              <p className="text-sm text-muted-foreground">
                {filter !== "all" ? "Try selecting a different filter" : "Activity will appear here"}
              </p>
            </div>
          ) : (
            <div>
              {Object.entries(groupedActivities).map(([date, items]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm px-4 py-2 border-b">
                    <p className="text-sm font-semibold text-muted-foreground">
                      {dateLabels[date]}
                    </p>
                  </div>
                  {/* Activities for this date */}
                  {items.map((item) => (
                    <ActivityItemCard key={item.id} item={item} />
                  ))}
                </div>
              ))}

              {/* Load more */}
              {filteredActivities.length >= limit && (
                <div className="p-4 text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setLimit(limit + 50)}
                    className="w-full"
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

