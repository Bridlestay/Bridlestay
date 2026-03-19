"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Star,
  Navigation,
  Search,
  Bookmark,
  ImageIcon,
  SlidersHorizontal,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getRouteThumbnailUrlAuto } from "@/lib/routes/route-thumbnail";

interface FindRoutesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteClick: (routeId: string) => void;
  onRouteHover?: (routeId: string | null) => void;
  onRoutesFound?: (routes: any[]) => void;
  mapBounds?: google.maps.LatLngBounds | null;
  mobilePanelOpen?: boolean;
  onMobilePanelToggle?: (open: boolean) => void;
}

const DIFFICULTY_OPTIONS = [
  { value: "unrated", label: "Unrated", color: "bg-gray-600" },
  { value: "easy", label: "Easy", color: "bg-green-600" },
  { value: "moderate", label: "Moderate", color: "bg-blue-600" },
  { value: "difficult", label: "Difficult", color: "bg-orange-600" },
  { value: "severe", label: "Severe", color: "bg-red-600" },
];

const RATING_OPTIONS = [
  { value: "0", label: "Any" },
  { value: "3.5", label: "3.5+" },
  { value: "4.0", label: "4.0+" },
  { value: "4.5", label: "4.5+" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  unrated: "bg-gray-100 text-gray-700 border-gray-300",
  easy: "bg-green-100 text-green-700 border-green-300",
  moderate: "bg-amber-100 text-amber-700 border-amber-300",
  medium: "bg-amber-100 text-amber-700 border-amber-300",
  difficult: "bg-orange-100 text-orange-700 border-orange-300",
  hard: "bg-red-100 text-red-700 border-red-300",
  severe: "bg-red-100 text-red-700 border-red-300",
};

export function FindRoutesPanel({
  isOpen,
  onClose,
  onRouteClick,
  onRouteHover,
  onRoutesFound,
}: FindRoutesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("most_popular");
  const [distanceRange, setDistanceRange] = useState([0, 40]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(
    []
  );
  const [minRating, setMinRating] = useState("0");
  const [routeType, setRouteType] = useState<string[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [savedRouteIds, setSavedRouteIds] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Featured routes state
  const [featuredRoutes, setFeaturedRoutes] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  // Saved tab state
  const [myRoutes, setMyRoutes] = useState<any[]>([]);
  const [bookmarkedRoutes, setBookmarkedRoutes] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedSubTab, setSavedSubTab] = useState<"my-routes" | "bookmarked">("my-routes");

  // Fetch user's saved routes on mount
  useEffect(() => {
    const fetchSavedRoutes = async () => {
      try {
        const res = await fetch("/api/routes/favorites");
        if (res.ok) {
          const data = await res.json();
          const routes = Array.isArray(data) ? data : data.routes || [];
          setSavedRouteIds(new Set(routes.map((r: any) => r.id)));
        }
      } catch (error) {
        console.error("Error fetching saved routes:", error);
      }
    };
    fetchSavedRoutes();
  }, []);

  // Toggle bookmark/save route
  const toggleSaveRoute = async (routeId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const isSaved = savedRouteIds.has(routeId);

    try {
      const res = await fetch(`/api/routes/${routeId}/favorite`, {
        method: isSaved ? "DELETE" : "POST",
      });

      if (res.ok) {
        setSavedRouteIds((prev) => {
          const newSet = new Set(prev);
          if (isSaved) {
            newSet.delete(routeId);
            toast.success("Route removed from saved");
          } else {
            newSet.add(routeId);
            toast.success("Route saved!");
          }
          return newSet;
        });
      } else {
        toast.error("Please sign in to save routes");
      }
    } catch (error) {
      toast.error("Failed to update saved routes");
    }
  };

  // Fetch featured routes when panel opens
  useEffect(() => {
    if (!isOpen) return;
    const fetchFeatured = async () => {
      setFeaturedLoading(true);
      try {
        const res = await fetch("/api/routes/featured?limit=3");
        if (res.ok) {
          const data = await res.json();
          setFeaturedRoutes(data.featured || []);
        }
      } catch (error) {
        console.error("Failed to fetch featured routes:", error);
      } finally {
        setFeaturedLoading(false);
      }
    };
    fetchFeatured();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab !== "saved") {
      fetchRoutes();
    }
  }, [
    isOpen,
    sortBy,
    distanceRange,
    selectedDifficulties,
    minRating,
    routeType,
    activeTab,
  ]);

  // Fetch saved routes when Saved tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== "saved") return;
    const fetchSaved = async () => {
      setSavedLoading(true);
      try {
        const [myRes, favRes] = await Promise.all([
          fetch("/api/routes/my-routes"),
          fetch("/api/routes/favorites"),
        ]);
        if (myRes.ok) {
          const data = await myRes.json();
          setMyRoutes(data.routes || []);
        }
        if (favRes.ok) {
          const data = await favRes.json();
          setBookmarkedRoutes(data.routes || []);
        }
      } catch (error) {
        console.error("Failed to fetch saved routes:", error);
      } finally {
        setSavedLoading(false);
      }
    };
    fetchSaved();
  }, [isOpen, activeTab]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/routes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibility: "public",
          minDistance: distanceRange[0],
          maxDistance: distanceRange[1] >= 40 ? 1000 : distanceRange[1],
          difficulties:
            selectedDifficulties.length > 0
              ? selectedDifficulties
              : undefined,
          minRating: parseFloat(minRating) || undefined,
          routeTypes: routeType.length > 0 ? routeType : undefined,
          sortBy,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
        onRoutesFound?.(data.routes || []);
      }
    } catch (error) {
      console.error("Failed to fetch routes:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          toast.success("Finding routes near you...");
        },
        () => {
          toast.error("Could not get your location");
        }
      );
    }
  };

  const clearFilters = () => {
    setDistanceRange([0, 40]);
    setSelectedDifficulties([]);
    setMinRating("0");
    setRouteType([]);
    setShowVariants(false);
    setSearchQuery("");
  };

  const hasFilters =
    distanceRange[0] > 0 ||
    distanceRange[1] < 40 ||
    selectedDifficulties.length > 0 ||
    minRating !== "0" ||
    routeType.length > 0 ||
    showVariants;

  const activeFilterCount =
    (distanceRange[0] > 0 || distanceRange[1] < 40 ? 1 : 0) +
    (selectedDifficulties.length > 0 ? 1 : 0) +
    (minRating !== "0" ? 1 : 0) +
    (routeType.length > 0 ? 1 : 0) +
    (showVariants ? 1 : 0);

  // Filter by search query
  let displayRoutes: any[];
  let isLoadingDisplay: boolean;

  if (activeTab === "saved") {
    const savedSource = savedSubTab === "my-routes" ? myRoutes : bookmarkedRoutes;
    displayRoutes = searchQuery.trim()
      ? savedSource.filter(
          (r) =>
            r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : savedSource;
    isLoadingDisplay = savedLoading;
  } else {
    displayRoutes = searchQuery.trim()
      ? routes.filter(
          (r) =>
            r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : routes;
    isLoadingDisplay = loading;
  }

  if (showVariants) {
    displayRoutes = displayRoutes.filter((r) => !!r.variant_of_id);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop (desktop only — mobile is full-screen) */}
      <div
        className="fixed inset-0 z-40 hidden md:block bg-black/40 backdrop-blur-sm transition-all duration-300"
        onClick={onClose}
      />

      {/* Full-screen sheet (mobile) / Centered Modal (desktop) */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto bg-white shadow-2xl relative flex flex-col overflow-hidden",
            "w-full h-[100dvh] rounded-none",
            "animate-in slide-in-from-bottom fade-in duration-300",
            "md:rounded-2xl md:max-w-2xl md:max-h-[80vh] md:h-auto",
            "md:animate-in md:zoom-in-95 md:slide-in-from-bottom-4 md:fade-in md:duration-300"
          )}
        >
          {/* Sticky Header */}
          <div className="shrink-0 border-b bg-white md:rounded-t-2xl">
            {/* Title + Share + Close */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Find Routes
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-5 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search for places and routes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Controls: Tabs + Sort + Filters toggle */}
            <div className="px-5 py-3 space-y-3 border-b">
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="all" className="flex-1">
                    All Routes
                  </TabsTrigger>
                  <TabsTrigger value="saved" className="flex-1">
                    Saved
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Sort + Filter toggle — hidden on Saved tab */}
              {activeTab !== "saved" && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Sort:</span>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="most_popular">
                          Most popular
                        </SelectItem>
                        <SelectItem value="highest_rated">
                          Highest rated
                        </SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="shortest">Shortest</SelectItem>
                        <SelectItem value="longest">Longest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={() => setFiltersOpen(!filtersOpen)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      filtersOpen || hasFilters
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="bg-green-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Collapsible Filters */}
            {filtersOpen && activeTab !== "saved" && (
              <div className="px-5 py-3 space-y-4 border-b bg-gray-50/50">
                {/* Route Length */}
                <div>
                  <span className="text-sm font-medium">Route Length</span>
                  <Slider
                    value={distanceRange}
                    onValueChange={setDistanceRange}
                    min={0}
                    max={40}
                    step={1}
                    className="my-3"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{distanceRange[0]} km</span>
                    <span>
                      {distanceRange[1] >= 40
                        ? "40 km+"
                        : `${distanceRange[1]} km`}
                    </span>
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <span className="text-sm font-medium">Difficulty</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DIFFICULTY_OPTIONS.map((diff) => {
                      const isSelected = selectedDifficulties.includes(
                        diff.value
                      );
                      return (
                        <button
                          key={diff.value}
                          onClick={() => {
                            setSelectedDifficulties((prev) =>
                              isSelected
                                ? prev.filter((d) => d !== diff.value)
                                : [...prev, diff.value]
                            );
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            isSelected
                              ? `${diff.color} text-white`
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          {diff.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <span className="text-sm font-medium">Rating</span>
                  <div className="flex gap-2 mt-2">
                    {RATING_OPTIONS.map((rating) => (
                      <button
                        key={rating.value}
                        onClick={() => setMinRating(rating.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                          minRating === rating.value
                            ? "bg-gray-800 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {rating.label}
                        {rating.value !== "0" && (
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Route Type */}
                <div>
                  <span className="text-sm font-medium">Route type</span>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={routeType.includes("circular")}
                        onCheckedChange={(checked) => {
                          setRouteType((prev) =>
                            checked
                              ? [...prev, "circular"]
                              : prev.filter((t) => t !== "circular")
                          );
                        }}
                      />
                      <span className="text-sm">Circular</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={routeType.includes("linear")}
                        onCheckedChange={(checked) => {
                          setRouteType((prev) =>
                            checked
                              ? [...prev, "linear"]
                              : prev.filter((t) => t !== "linear")
                          );
                        }}
                      />
                      <span className="text-sm">Point to point</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={showVariants}
                        onCheckedChange={(checked) => setShowVariants(!!checked)}
                      />
                      <span className="text-sm">Variants</span>
                    </label>
                  </div>
                </div>

                {/* Near Me + Clear */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleNearMe}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Routes Near Me
                  </Button>
                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-primary hover:underline ml-auto"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Saved sub-tabs (My Routes / Bookmarked) */}
            {activeTab === "saved" && (
              <div className="px-5 pt-3 flex gap-2">
                <button
                  onClick={() => setSavedSubTab("my-routes")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    savedSubTab === "my-routes"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  My Routes
                </button>
                <button
                  onClick={() => setSavedSubTab("bookmarked")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    savedSubTab === "bookmarked"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  Bookmarked
                </button>
              </div>
            )}

            {/* Featured Routes — pinned section at top of All tab */}
            {activeTab === "all" && featuredRoutes.length > 0 && !searchQuery.trim() && (
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Featured Routes</h3>
                </div>
                {featuredLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
                    {featuredRoutes.map((route) => {
                      const thumbnailUrl =
                        route.cover_photo_url ||
                        getRouteThumbnailUrlAuto(route.geometry, {
                          width: 300,
                          height: 160,
                          routeColor: "3B82F6",
                          routeWeight: 4,
                        });
                      return (
                        <div
                          key={route.id}
                          className="flex-shrink-0 w-[200px] snap-start rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white border border-gray-100"
                          onClick={() => onRouteClick(route.id)}
                        >
                          <div className="relative h-24">
                            {thumbnailUrl ? (
                              <img
                                src={thumbnailUrl}
                                alt={route.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
                                <ImageIcon className="h-6 w-6 text-green-300" />
                              </div>
                            )}
                            <span className="absolute bottom-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-white/90 text-gray-700 font-medium">
                              {Number(route.distance_km || 0).toFixed(1)} km
                            </span>
                          </div>
                          <div className="p-2.5">
                            <h4 className="font-semibold text-xs leading-tight text-gray-900 line-clamp-1">
                              {route.title}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] h-4 font-medium px-1.5",
                                  DIFFICULTY_COLORS[route.difficulty] ||
                                    DIFFICULTY_COLORS.unrated
                                )}
                              >
                                {route.difficulty
                                  ?.charAt(0)
                                  .toUpperCase() +
                                  route.difficulty?.slice(1) || "Unrated"}
                              </Badge>
                              {route.avg_rating > 0 && (
                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                  <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                                  {Number(route.avg_rating).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="border-b border-gray-100 mt-3" />
              </div>
            )}

            {/* Route Cards Grid */}
            {isLoadingDisplay ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : displayRoutes.length > 0 ? (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayRoutes.map((route) => {
                  const thumbnailUrl =
                    route.cover_photo_url ||
                    getRouteThumbnailUrlAuto(route.geometry, {
                      width: 400,
                      height: 200,
                      routeColor: "3B82F6",
                      routeWeight: 4,
                    });
                  const isSaved = savedRouteIds.has(route.id);
                  const rideTimeMins = route.estimated_time_minutes
                    ? Math.round(route.estimated_time_minutes)
                    : route.distance_km
                      ? Math.round((Number(route.distance_km) / 8) * 60)
                      : 0;
                  const rideTimeStr =
                    rideTimeMins >= 60
                      ? `${Math.floor(rideTimeMins / 60)}h ${rideTimeMins % 60 > 0 ? `${rideTimeMins % 60}m` : ""}`
                      : `${rideTimeMins}m`;
                  return (
                    <div
                      key={route.id}
                      className="rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer bg-white border border-gray-100"
                      onClick={() => onRouteClick(route.id)}
                      onMouseEnter={() => onRouteHover?.(route.id)}
                      onMouseLeave={() => onRouteHover?.(null)}
                    >
                      {/* Cover photo / Map preview */}
                      <div className="relative h-36">
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={route.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
                            <ImageIcon className="h-10 w-10 text-green-300" />
                          </div>
                        )}
                        {/* Bottom gradient */}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                        {/* Bookmark button */}
                        <button
                          onClick={(e) => toggleSaveRoute(route.id, e)}
                          className={cn(
                            "absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md",
                            isSaved
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-white/80 backdrop-blur-sm text-gray-500 hover:bg-white hover:text-gray-700"
                          )}
                          title={isSaved ? "Remove from saved" : "Save route"}
                        >
                          <Bookmark
                            className={cn(
                              "h-4 w-4",
                              isSaved && "fill-current"
                            )}
                          />
                        </button>
                        {/* Circular / Variant badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          {route.route_type === "circular" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white font-medium">
                              Circular
                            </span>
                          )}
                          {route.variant_of_id && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-600/80 backdrop-blur-sm text-white font-medium flex items-center gap-1">
                              <Shuffle className="h-3 w-3" />
                              Variant
                            </span>
                          )}
                        </div>
                        {/* Distance pill */}
                        <span className="absolute bottom-2.5 left-2.5 text-xs px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 font-medium shadow-sm">
                          {Number(route.distance_km || 0).toFixed(1)} km
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-3.5">
                        {/* Title */}
                        <h4 className="font-bold text-[15px] leading-tight text-gray-900 line-clamp-1">
                          {route.title}
                        </h4>

                        {/* Description */}
                        {route.description && (
                          <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                            {route.description}
                          </p>
                        )}

                        {/* Stat grid */}
                        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                          <div className="text-center">
                            <p className="text-lg font-bold text-gray-900">
                              {Number(route.distance_km || 0).toFixed(1)}
                              <span className="text-xs font-normal text-gray-400 ml-0.5">
                                km
                              </span>
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Distance
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-gray-900">
                              {rideTimeStr}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Est. Ride Time
                            </p>
                          </div>
                        </div>

                        {/* Difficulty + county */}
                        <div className="flex items-center justify-between mt-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] h-5 font-medium",
                              DIFFICULTY_COLORS[route.difficulty] ||
                                DIFFICULTY_COLORS.unrated
                            )}
                          >
                            {route.difficulty
                              ?.charAt(0)
                              .toUpperCase() +
                              route.difficulty?.slice(1) || "Unrated"}
                          </Badge>
                          {route.county && (
                            <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                              {route.county}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <Search className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No routes found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Try adjusting your filters or zoom out on the map
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
