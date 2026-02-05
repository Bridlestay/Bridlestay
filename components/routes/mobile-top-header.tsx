"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  Search,
  User,
  LogOut,
  Settings,
  LayoutDashboard,
  Heart,
  MessageCircle,
  MessageSquarePlus,
  HelpCircle,
  AlertTriangle,
  Route,
  X,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaceResult {
  id: string;
  name: string;
  placeName: string;
  coordinates: { lat: number; lng: number };
  type: string;
}

interface RouteResult {
  id: string;
  title: string;
  description?: string;
  difficulty?: string;
  distance_km?: number;
  distanceFromSearch?: number;
  geometry?: any;
}

interface MobileTopHeaderProps {
  onSearch?: (query: string) => void;
  onPlaceSelect?: (place: PlaceResult) => void;
  onRouteSelect?: (route: RouteResult) => void;
  onCreateRoute?: (location: { lat: number; lng: number }) => void;
}

export function MobileTopHeader({ onSearch, onPlaceSelect, onRouteSelect, onCreateRoute }: MobileTopHeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState<"places" | "routes">("places");
  
  // Geocoding state
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [searchRadius, setSearchRadius] = useState(25); // km
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        setUser(userData);
      }
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getUser();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch("/api/messages/unread-count");
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  };

  // Geocode address as user types
  useEffect(() => {
    if (searchTab !== "places" || searchQuery.length < 3) {
      setPlaces([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch("/api/geocode/mapbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery, limit: 5 }),
        });
        if (res.ok) {
          const data = await res.json();
          setPlaces(data.places || []);
        }
      } catch (error) {
        console.error("Geocoding error:", error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchTab]);

  // Search routes when query changes (routes tab)
  useEffect(() => {
    if (searchTab !== "routes" || searchQuery.length < 2) {
      setRoutes([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const body: any = { q: searchQuery, limit: 10 };
        if (selectedPlace) {
          body.lat = selectedPlace.coordinates.lat;
          body.lng = selectedPlace.coordinates.lng;
          body.searchRadius = searchRadius;
        }
        const res = await fetch("/api/routes/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setRoutes(data.routes || []);
        }
      } catch (error) {
        console.error("Route search error:", error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchTab, selectedPlace, searchRadius]);

  const handlePlaceSelect = async (place: PlaceResult) => {
    setSelectedPlace(place);
    setSearchTab("routes");
    setSearchQuery("");
    onPlaceSelect?.(place);
    
    // Search for routes near this location
    setSearchLoading(true);
    try {
      const res = await fetch("/api/routes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: place.coordinates.lat,
          lng: place.coordinates.lng,
          searchRadius: searchRadius,
          limit: 20,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
      }
    } catch (error) {
      console.error("Route search error:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRouteSelect = (route: RouteResult) => {
    onRouteSelect?.(route);
    setIsSearchOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 md:hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Hamburger Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>
                <Link href="/" className="flex items-center mb-2">
                  <Image
                    src="/logo.png"
                    alt="padoq"
                    width={100}
                    height={30}
                    className="object-contain"
                    priority
                  />
                </Link>
                {user && (
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Hi, {user.name}!
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/routes" className="cursor-pointer">
                  <Route className="mr-2 h-4 w-4" />
                  Routes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/messages" className="cursor-pointer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Messages
                      {unreadCount > 0 && (
                        <Badge className="ml-auto bg-primary text-white text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/favorites" className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      My Favorites
                    </Link>
                  </DropdownMenuItem>
                  {(user.role === "host" || user.role === "admin") && (
                    <DropdownMenuItem asChild>
                      <Link href="/host/listings" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        My Listings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard" className="cursor-pointer text-primary font-semibold">
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/help" className="cursor-pointer">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Help
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/feedback" className="cursor-pointer">
                      <MessageSquarePlus className="mr-2 h-4 w-4" />
                      Send Feedback
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/claims" className="cursor-pointer">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Claims
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/auth/sign-in">Sign In</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/auth/sign-up">Sign Up</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search Bar - Click to open search overlay */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex-1 relative"
          >
            <div className="flex items-center pl-3 pr-10 py-2 h-10 rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-500">
              Search for places and routes
            </div>
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </button>

          {/* Profile Picture */}
          {loading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
          ) : user ? (
            <Link href="/profile" className="shrink-0">
              <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link href="/auth/sign-in" className="shrink-0">
              <Avatar className="h-9 w-9 cursor-pointer bg-gray-200">
                <AvatarFallback className="text-gray-500">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>
      </header>

      {/* Search Overlay - Full screen when open */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-white md:hidden flex flex-col">
          {/* Search Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery("");
              }}
            >
              <Menu className="h-6 w-6" />
            </Button>

            <form onSubmit={handleSearchSubmit} className="flex-1">
              <div className="relative">
                <Input
                  placeholder="Search for places and routes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-3 pr-10 py-2 h-10 rounded-full border-gray-200 bg-gray-50 focus:bg-white text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

            {loading ? (
              <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
            ) : user ? (
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-9 w-9 shrink-0 bg-gray-200">
                <AvatarFallback className="text-gray-500">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          {/* Places / Routes Tabs */}
          <div className="flex px-4 py-2">
            <button
              onClick={() => setSearchTab("places")}
              className={cn(
                "flex-1 py-2 rounded-full text-sm font-medium transition-colors",
                searchTab === "places"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500"
              )}
            >
              Places
            </button>
            <button
              onClick={() => setSearchTab("routes")}
              className={cn(
                "flex-1 py-2 rounded-full text-sm font-medium transition-colors",
                searchTab === "routes"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500"
              )}
            >
              Routes
            </button>
          </div>

          {/* Selected Place Banner */}
          {selectedPlace && (
            <div className="px-4 py-2 bg-green-50 border-b border-green-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">{selectedPlace.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-green-600"
                onClick={() => {
                  setSelectedPlace(null);
                  setRoutes([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Search Content */}
          <div className="flex-1 overflow-y-auto">
            {searchLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : searchTab === "places" ? (
              places.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {places.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => handlePlaceSelect(place)}
                      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{place.name}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">{place.placeName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 3 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <MapPin className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No places found for &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <Search className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Search for a place</h3>
                  <p className="text-sm text-gray-500 max-w-xs">
                    Type an address, postcode, or place name to find routes nearby
                  </p>
                </div>
              )
            ) : routes.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {routes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => handleRouteSelect(route)}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <Route className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{route.title || "Untitled Route"}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {route.distance_km && (
                          <span>{route.distance_km.toFixed(1)} km</span>
                        )}
                        {route.difficulty && (
                          <span className="capitalize">{route.difficulty}</span>
                        )}
                        {route.distanceFromSearch !== undefined && (
                          <span className="text-green-600">
                            {route.distanceFromSearch < 1 
                              ? `${(route.distanceFromSearch * 1000).toFixed(0)}m away`
                              : `${route.distanceFromSearch.toFixed(1)}km away`
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : selectedPlace && !searchLoading ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <Route className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No routes nearby</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-xs">
                  No routes found within {searchRadius}km of {selectedPlace.name}
                </p>
                {onCreateRoute && (
                  <Button
                    onClick={() => {
                      onCreateRoute(selectedPlace.coordinates);
                      setIsSearchOpen(false);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Create a route here
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <Search className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Search for routes</h3>
                <p className="text-sm text-gray-500 max-w-xs">
                  {selectedPlace 
                    ? "Type a route name to search within the selected area"
                    : "Search for routes by name, or select a place first to find routes nearby"
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

