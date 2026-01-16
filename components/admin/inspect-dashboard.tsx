"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatGBP } from "@/lib/fees";
import { format } from "date-fns";
import {
  Search,
  User,
  Home,
  Loader2,
  Mail,
  Calendar,
  Shield,
  Ban,
  BookOpen,
  Star,
  MessageSquare,
  Heart,
  HelpCircle,
  ArrowRight,
  Building,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  MapPin,
  Image as ImageIcon,
  Camera,
} from "lucide-react";
import Link from "next/link";

// Debounce hook for predictive search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface InspectDashboardProps {
  initialUserId?: string;
  initialPropertyId?: string;
  initialTab?: "users" | "properties";
}

export function InspectDashboard({ 
  initialUserId, 
  initialPropertyId, 
  initialTab = "users" 
}: InspectDashboardProps) {
  const [activeTab, setActiveTab] = useState<"users" | "properties">(initialTab);
  const [userSearch, setUserSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(initialPropertyId || null);
  const [userData, setUserData] = useState<any>(null);
  const [propertyData, setPropertyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [propertySearchResults, setPropertySearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const propertyDropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Debounced search values for predictive search
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const debouncedPropertySearch = useDebounce(propertySearch, 300);

  // Predictive search for users
  useEffect(() => {
    if (activeTab === "users" && debouncedUserSearch.trim().length >= 2) {
      performPredictiveUserSearch(debouncedUserSearch);
    } else {
      setUserSearchResults([]);
      setShowUserDropdown(false);
    }
  }, [debouncedUserSearch, activeTab]);

  // Predictive search for properties
  useEffect(() => {
    if (activeTab === "properties" && debouncedPropertySearch.trim().length >= 2) {
      performPredictivePropertySearch(debouncedPropertySearch);
    } else {
      setPropertySearchResults([]);
      setShowPropertyDropdown(false);
    }
  }, [debouncedPropertySearch, activeTab]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(event.target as Node)) {
        setShowPropertyDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performPredictiveUserSearch = async (query: string) => {
    setSearching(true);
    try {
      const response = await fetch(`/api/admin/search?type=users&query=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (response.ok) {
        setUserSearchResults(data.results || []);
        setSearchResults(data.results || []);
        setShowUserDropdown(true);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  const performPredictivePropertySearch = async (query: string) => {
    setSearching(true);
    try {
      const response = await fetch(`/api/admin/search?type=properties&query=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (response.ok) {
        setPropertySearchResults(data.results || []);
        setSearchResults(data.results || []);
        setShowPropertyDropdown(true);
      }
    } catch (error) {
      console.error("Error searching properties:", error);
    } finally {
      setSearching(false);
    }
  };

  // Load initial data if IDs provided
  useEffect(() => {
    if (initialUserId) {
      fetchUserData(initialUserId);
    }
    if (initialPropertyId) {
      fetchPropertyData(initialPropertyId);
    }
  }, [initialUserId, initialPropertyId]);

  const searchUsers = async () => {
    if (!userSearch.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(`/api/admin/search?type=users&query=${encodeURIComponent(userSearch)}`);
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  const searchProperties = async () => {
    if (!propertySearch.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(`/api/admin/search?type=properties&query=${encodeURIComponent(propertySearch)}`);
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error("Error searching properties:", error);
    } finally {
      setSearching(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    setSelectedUserId(userId);
    try {
      const response = await fetch(`/api/admin/inspect/user?userId=${userId}`);
      const data = await response.json();
      if (response.ok) {
        setUserData(data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to fetch user data",
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertyData = async (propertyId: string) => {
    setLoading(true);
    setSelectedPropertyId(propertyId);
    try {
      const response = await fetch(`/api/admin/inspect/property?propertyId=${propertyId}`);
      const data = await response.json();
      if (response.ok) {
        setPropertyData(data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to fetch property data",
        });
      }
    } catch (error) {
      console.error("Error fetching property data:", error);
    } finally {
      setLoading(false);
    }
  };

  const inspectUserFromProperty = (userId: string) => {
    setActiveTab("users");
    fetchUserData(userId);
  };

  const inspectPropertyFromUser = (propertyId: string) => {
    setActiveTab("properties");
    fetchPropertyData(propertyId);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "users" | "properties")}>
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="gap-2">
            <User className="h-4 w-4" />
            Inspect User
          </TabsTrigger>
          <TabsTrigger value="properties" className="gap-2">
            <Home className="h-4 w-4" />
            Inspect Property
          </TabsTrigger>
        </TabsList>

        {/* User Inspection */}
        <TabsContent value="users" className="space-y-4">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Users</CardTitle>
              <CardDescription>Search by name, email, or user ID - results appear as you type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative" ref={userDropdownRef}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Start typing a name, email, or ID..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onFocus={() => searchResults.length > 0 && activeTab === "users" && setShowUserDropdown(true)}
                      onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                    />
                    {searching && activeTab === "users" && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <Button onClick={searchUsers} disabled={searching}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {/* Predictive Dropdown */}
                {showUserDropdown && userSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {userSearchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          fetchUserData(user.id);
                          setShowUserDropdown(false);
                          setUserSearch(user.name || user.email || "");
                        }}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>{user.name?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name || "No name"}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{user.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legacy Search Results (for Enter key search) */}
              {searchResults.length > 0 && activeTab === "users" && !showUserDropdown && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">{searchResults.length} results found</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          fetchUserData(user.id);
                          setSearchResults([]);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>{user.name?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Details */}
          {loading && activeTab === "users" ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : userData ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* User Profile Card */}
              <Card className="md:col-span-2 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    User Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={userData.user.avatar_url} />
                      <AvatarFallback className="text-xl">{userData.user.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{userData.user.name}</h3>
                      <p className="text-sm text-muted-foreground">{userData.user.email}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{userData.user.role}</Badge>
                        {userData.user.banned && (
                          <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" /> Banned</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">User ID</span>
                      <span className="font-mono text-xs">{userData.user.id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Joined</span>
                      <span>{format(new Date(userData.user.created_at), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span>{userData.user.phone || "Not provided"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Response Time</span>
                      <span>
                        {userData.user.avg_response_time_hours
                          ? `${userData.user.avg_response_time_hours.toFixed(1)} hrs`
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link href={`/profile/${userData.user.id}`} target="_blank" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-1" /> View Profile
                      </Button>
                    </Link>
                    <Link href={`/messages?userId=${userData.user.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <MessageSquare className="h-4 w-4 mr-1" /> Message
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Guest Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="h-4 w-4" />
                    As Guest
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{userData.guestStats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Bookings</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{formatGBP(userData.guestStats.totalSpent)}</p>
                      <p className="text-xs text-muted-foreground">Total Spent</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Requested</span>
                      <span>{userData.guestStats.byStatus.requested}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Accepted</span>
                      <span className="text-green-600">{userData.guestStats.byStatus.accepted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Declined</span>
                      <span className="text-red-600">{userData.guestStats.byStatus.declined}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cancelled</span>
                      <span>{userData.guestStats.byStatus.cancelled}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Nights</span>
                      <span>{userData.guestStats.totalNights}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Host Stats */}
              {userData.user.role === "host" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building className="h-4 w-4" />
                      As Host
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{userData.hostStats.totalBookings}</p>
                        <p className="text-xs text-muted-foreground">Bookings Received</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{formatGBP(userData.hostStats.totalRevenue)}</p>
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Acceptance Rate</span>
                        <span className="font-medium">{userData.hostStats.acceptanceRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Properties</span>
                        <span>{userData.propertyStats.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Published</span>
                        <span>{userData.propertyStats.published}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Verified</span>
                        <span>{userData.propertyStats.verified}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reviews Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-4 w-4" />
                    Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{userData.reviewStats.written.total}</p>
                      <p className="text-xs text-muted-foreground">Written</p>
                      <p className="text-xs text-muted-foreground">
                        Avg: {userData.reviewStats.written.avgRating} ⭐
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{userData.reviewStats.received.total}</p>
                      <p className="text-xs text-muted-foreground">Received</p>
                      <p className="text-xs text-muted-foreground">
                        Avg: {userData.reviewStats.received.avgRating} ⭐
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Messages & Moderation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-4 w-4" />
                    Messages & Moderation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Messages Sent</span>
                      <span>{userData.messageStats.sent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Messages Received</span>
                      <span>{userData.messageStats.received}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unread</span>
                      <span>{userData.messageStats.unread}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Flagged Messages</span>
                      <span className={userData.flaggedStats.total > 0 ? "text-red-600 font-medium" : ""}>
                        {userData.flaggedStats.total}
                      </span>
                    </div>
                    {userData.flaggedStats.total > 0 && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">As Sender</span>
                          <span className="text-red-600">{userData.flaggedStats.asSender}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">As Recipient</span>
                          <span>{userData.flaggedStats.asRecipient}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Other Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Heart className="h-4 w-4" />
                    Other Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Favorites</span>
                      <span>{userData.favorites.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Horses Registered</span>
                      <span>{userData.horses.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Questions Asked</span>
                      <span>{userData.questions.asked}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Questions Answered</span>
                      <span>{userData.questions.answered}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Properties List (if host) */}
              {userData.propertyStats.properties.length > 0 && (
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Home className="h-4 w-4" />
                      Properties ({userData.propertyStats.total})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userData.propertyStats.properties.map((prop: any) => (
                        <div
                          key={prop.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{prop.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {prop.city}, {prop.county} • {formatGBP(prop.nightly_price_pennies)}/night
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {prop.removed && <Badge variant="destructive">Removed</Badge>}
                            {prop.published ? (
                              <Badge className="bg-green-600">Published</Badge>
                            ) : (
                              <Badge variant="secondary">Draft</Badge>
                            )}
                            {prop.admin_verified && <Badge className="bg-blue-600">Verified</Badge>}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => inspectPropertyFromUser(prop.id)}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Search for a user to view their detailed information</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Property Inspection */}
        <TabsContent value="properties" className="space-y-4">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Properties</CardTitle>
              <CardDescription>Search by name, location, or property ID - results appear as you type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative" ref={propertyDropdownRef}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Start typing a property name, location, or ID..."
                      value={propertySearch}
                      onChange={(e) => setPropertySearch(e.target.value)}
                      onFocus={() => searchResults.length > 0 && activeTab === "properties" && setShowPropertyDropdown(true)}
                      onKeyDown={(e) => e.key === "Enter" && searchProperties()}
                    />
                    {searching && activeTab === "properties" && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <Button onClick={searchProperties} disabled={searching}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {/* Predictive Dropdown */}
                {showPropertyDropdown && propertySearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {propertySearchResults.map((property) => (
                      <div
                        key={property.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          fetchPropertyData(property.id);
                          setShowPropertyDropdown(false);
                          setPropertySearch(property.name || "");
                        }}
                      >
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          {property.coverPhoto ? (
                            <img src={property.coverPhoto} alt="" className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <Home className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{property.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {property.city}, {property.county}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {property.published ? (
                            <Badge className="bg-green-600 text-xs">Published</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Draft</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legacy Search Results (for Enter key search) */}
              {searchResults.length > 0 && activeTab === "properties" && !showPropertyDropdown && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">{searchResults.length} results found</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {searchResults.map((property) => (
                      <div
                        key={property.id}
                        className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          fetchPropertyData(property.id);
                          setSearchResults([]);
                        }}
                      >
                        <div>
                          <p className="font-medium text-sm">{property.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {property.city}, {property.county}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {property.removed && <Badge variant="destructive" className="text-xs">Removed</Badge>}
                          {property.published ? (
                            <Badge className="bg-green-600 text-xs">Published</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Draft</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Details */}
          {loading && activeTab === "properties" ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : propertyData ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Property Info Card */}
              <Card className="md:col-span-2 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{propertyData.property.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {propertyData.property.city}, {propertyData.property.county}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {propertyData.property.removed && (
                        <Badge variant="destructive">Removed</Badge>
                      )}
                      {propertyData.property.published ? (
                        <Badge className="bg-green-600">Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                      {propertyData.property.admin_verified && (
                        <Badge className="bg-blue-600">Verified</Badge>
                      )}
                      {propertyData.property.instant_book && (
                        <Badge className="bg-purple-600">Instant Book</Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Property ID</span>
                      <span className="font-mono text-xs">{propertyData.property.id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{format(new Date(propertyData.property.created_at), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nightly Rate</span>
                      <span className="font-semibold">{formatGBP(propertyData.property.nightly_price_pennies)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Guests</span>
                      <span>{propertyData.property.max_guests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Property Type</span>
                      <span className="capitalize">{propertyData.property.property_type || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verified</span>
                      <span>
                        {propertyData.property.admin_verified 
                          ? (propertyData.property.verified_at 
                              ? format(new Date(propertyData.property.verified_at), "dd MMM yyyy")
                              : "Yes")
                          : <span className="text-amber-600">Awaiting Verification</span>
                        }
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link href={`/property/${propertyData.property.id}?admin_preview=true`} target="_blank" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-1" /> {propertyData.property.published ? "View Listing" : "Preview Listing"}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Host Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Host
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={propertyData.host?.avatar_url} />
                      <AvatarFallback>{propertyData.host?.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{propertyData.host?.name}</p>
                      <p className="text-sm text-muted-foreground">{propertyData.host?.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => inspectUserFromProperty(propertyData.host?.id)}
                  >
                    <ArrowRight className="h-4 w-4 mr-1" /> Inspect Host
                  </Button>
                </CardContent>
              </Card>

              {/* Booking Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="h-4 w-4" />
                    Booking Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{propertyData.bookingStats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Bookings</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{formatGBP(propertyData.bookingStats.totalRevenue)}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Acceptance Rate</span>
                      <span className="font-medium">{propertyData.bookingStats.acceptanceRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Nights/Booking</span>
                      <span>{propertyData.bookingStats.avgNightsPerBooking}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Guests</span>
                      <span>{propertyData.bookingStats.totalGuests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Horses</span>
                      <span>{propertyData.bookingStats.totalHorses}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    Booking Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Requested
                      </span>
                      <span>{propertyData.bookingStats.byStatus.requested}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Accepted
                      </span>
                      <span className="text-green-600">{propertyData.bookingStats.byStatus.accepted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Declined
                      </span>
                      <span className="text-red-600">{propertyData.bookingStats.byStatus.declined}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Cancelled
                      </span>
                      <span>{propertyData.bookingStats.byStatus.cancelled}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Completed
                      </span>
                      <span className="text-blue-600">{propertyData.bookingStats.byStatus.completed}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reviews */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-4 w-4" />
                    Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{propertyData.reviewStats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Reviews</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{propertyData.reviewStats.avgRating} ⭐</p>
                      <p className="text-xs text-muted-foreground">Avg Rating</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex justify-between items-center">
                        <span className="text-muted-foreground">{rating} stars</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-yellow-500 h-2 rounded-full"
                              style={{
                                width: `${
                                  propertyData.reviewStats.total > 0
                                    ? (propertyData.reviewStats.ratingBreakdown[rating] /
                                        propertyData.reviewStats.total) *
                                      100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="w-6 text-right">{propertyData.reviewStats.ratingBreakdown[rating]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Q&A and Engagement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HelpCircle className="h-4 w-4" />
                    Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Questions</span>
                      <span>{propertyData.questionStats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Answered</span>
                      <span className="text-green-600">{propertyData.questionStats.answered}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unanswered</span>
                      <span className="text-orange-600">{propertyData.questionStats.unanswered}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Favorites</span>
                      <span>{propertyData.favorites.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Messages</span>
                      <span>{propertyData.messages.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Shares</span>
                      <span>{propertyData.shares?.total || 0}</span>
                    </div>
                  </div>
                  {propertyData.shares?.breakdown && Object.keys(propertyData.shares.breakdown).length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2 text-sm">
                        <p className="font-medium text-xs text-muted-foreground">Shares by Platform</p>
                        {propertyData.shares.breakdown.copy_link > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">📋 Copy Link</span>
                            <span>{propertyData.shares.breakdown.copy_link}</span>
                          </div>
                        )}
                        {propertyData.shares.breakdown.facebook > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">📘 Facebook</span>
                            <span>{propertyData.shares.breakdown.facebook}</span>
                          </div>
                        )}
                        {propertyData.shares.breakdown.twitter > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">🐦 Twitter/X</span>
                            <span>{propertyData.shares.breakdown.twitter}</span>
                          </div>
                        )}
                        {propertyData.shares.breakdown.whatsapp > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">💬 WhatsApp</span>
                            <span>{propertyData.shares.breakdown.whatsapp}</span>
                          </div>
                        )}
                        {propertyData.shares.breakdown.email > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">✉️ Email</span>
                            <span>{propertyData.shares.breakdown.email}</span>
                          </div>
                        )}
                        {propertyData.shares.breakdown.native > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">📱 Native Share</span>
                            <span>{propertyData.shares.breakdown.native}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Photos & Media */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Camera className="h-4 w-4" />
                    Photos & Media
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Photos</span>
                      <span>{propertyData.photoStats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">General Photos</span>
                      <span>{propertyData.photoStats.general}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Facility Photos</span>
                      <span>{propertyData.photoStats.facility}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Has Cover Photo</span>
                      <span>{propertyData.photoStats.hasCover ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Equine Features */}
              {propertyData.equine && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      🐴 Equine Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Horses</span>
                      <span>{propertyData.equine.max_horses || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stables</span>
                      <span>{propertyData.equine.has_stables ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Arena</span>
                      <span>{propertyData.equine.has_arena ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Round Pen</span>
                      <span>{propertyData.equine.has_round_pen ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paddocks</span>
                      <span>{propertyData.equine.has_paddocks ? "Yes" : "No"}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Home className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Search for a property to view its detailed information</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

