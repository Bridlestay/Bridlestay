"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
  Share2,
  Navigation,
  Search,
  Bookmark,
  ImageIcon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RoutesPanelHeader } from "./routes-panel-header";
import { MobileTopHeader } from "./mobile-top-header";
import { getRouteThumbnailUrlAuto } from "@/lib/routes/route-thumbnail";
import { MobilePanelToggle } from "./mobile-panel-toggle";

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
  mapBounds,
  mobilePanelOpen = true,
  onMobilePanelToggle,
}: FindRoutesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("most_popular");
  const [distanceRange, setDistanceRange] = useState([0, 40]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [minRating, setMinRating] = useState("0");
  const [routeType, setRouteType] = useState<string[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("recommended");
  const [savedRouteIds, setSavedRouteIds] = useState<Set<string>>(new Set());

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
    e.stopPropagation(); // Prevent card click
    
    const isSaved = savedRouteIds.has(routeId);
    
    try {
      const res = await fetch(`/api/routes/${routeId}/favorite`, {
        method: isSaved ? "DELETE" : "POST",
      });
      
      if (res.ok) {
        setSavedRouteIds(prev => {
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

  useEffect(() => {
    if (isOpen) {
      fetchRoutes();
    }
  }, [isOpen, sortBy, distanceRange, selectedDifficulties, minRating, routeType, activeTab]);

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
          difficulties: selectedDifficulties.length > 0 ? selectedDifficulties : undefined,
          minRating: parseFloat(minRating) || undefined,
          routeTypes: routeType.length > 0 ? routeType : undefined,
          sortBy,
          recommended: activeTab === "recommended",
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

  const handleShare = async () => {
    const params = new URLSearchParams();
    if (distanceRange[0] > 0) params.set("minDist", String(distanceRange[0]));
    if (distanceRange[1] < 40) params.set("maxDist", String(distanceRange[1]));
    if (selectedDifficulties.length) params.set("diff", selectedDifficulties.join(","));
    if (minRating !== "0") params.set("rating", minRating);
    
    const url = `${window.location.origin}/routes?${params.toString()}`;
    
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          toast.success("Finding routes near you...");
          // This would trigger a search filtered by location
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
    setSearchQuery("");
  };

  const hasFilters = 
    distanceRange[0] > 0 || 
    distanceRange[1] < 40 || 
    selectedDifficulties.length > 0 || 
    minRating !== "0" || 
    routeType.length > 0;

  // Filter by search query
  const displayRoutes = searchQuery.trim()
    ? routes.filter(
        (r) =>
          r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : routes;

  if (!isOpen) return null;

  const panelContent = (
    <>
      {/* Sort dropdown and Share */}
      <div className="px-4 py-2 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most_popular">Most popular</SelectItem>
                <SelectItem value="highest_rated">Highest rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="shortest">Shortest</SelectItem>
                <SelectItem value="longest">Longest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="recommended" className="flex-1">
              Recommended Routes
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1">
              All Routes
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <div className="px-4 pb-3 space-y-4 border-b">
        {/* Route Length */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium underline cursor-pointer">Route Length</span>
            <span className="text-sm text-gray-500">↔ Route Time</span>
          </div>
          <Slider
            value={distanceRange}
            onValueChange={setDistanceRange}
            min={0}
            max={40}
            step={1}
            className="my-4"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{distanceRange[0]} km</span>
            <span>{distanceRange[1] >= 40 ? "40 km+" : `${distanceRange[1]} km`}</span>
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <span className="text-sm font-medium">Difficulty</span>
            <span className="text-gray-400 cursor-help">ⓘ</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_OPTIONS.map((diff) => {
              const isSelected = selectedDifficulties.includes(diff.value);
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
          <div className="space-y-2 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
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
            <label className="flex items-center gap-2 cursor-pointer">
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
          </div>
        </div>

        {/* Near Me Button */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleNearMe}
        >
          <Navigation className="h-4 w-4" />
          Routes Near Me
        </Button>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary hover:underline w-full text-center"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Routes List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : displayRoutes.length > 0 ? (
          <div className="p-4 space-y-4">
            {displayRoutes.map((route) => {
              const thumbnailUrl = route.cover_photo_url || getRouteThumbnailUrlAuto(route.geometry, {
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
              const rideTimeStr = rideTimeMins >= 60
                ? `${Math.floor(rideTimeMins / 60)}h ${rideTimeMins % 60 > 0 ? `${rideTimeMins % 60}m` : ""}`
                : `${rideTimeMins}m`;
              return (
                <div
                  key={route.id}
                  className="rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer bg-white border border-gray-100"
                  onClick={() => onRouteClick(route.id)}
                  onMouseEnter={() => onRouteHover?.(route.id)}
                  onMouseLeave={() => onRouteHover?.(null)}
                >
                  {/* Photo / Map preview */}
                  <div className="relative h-32 group">
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
                      <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
                    </button>
                    {/* Route type badge */}
                    {route.route_type === "circular" && (
                      <span className="absolute top-2.5 left-2.5 text-[10px] px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white font-medium">
                        Circular
                      </span>
                    )}
                    {/* Distance on image */}
                    <span className="absolute bottom-2.5 left-2.5 text-xs px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 font-medium shadow-sm">
                      {Number(route.distance_km || 0).toFixed(1)} km
                    </span>
                  </div>

                  {/* Content area */}
                  <div className="p-3.5">
                    {/* Title + Rating */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-[15px] leading-tight text-gray-900 line-clamp-1">{route.title}</h4>
                      {route.avg_rating > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-600 flex-shrink-0">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          {route.avg_rating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    {/* Description preview */}
                    {route.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-1">{route.description}</p>
                    )}

                    {/* Stats row — matching detail card style */}
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {Number(route.distance_km || 0).toFixed(1)}
                          <span className="text-xs font-normal text-gray-400 ml-0.5">km</span>
                        </p>
                        <p className="text-[10px] text-gray-400">Distance</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {rideTimeStr}
                        </p>
                        <p className="text-[10px] text-gray-400">Est. Ride Time</p>
                      </div>
                    </div>

                    {/* Difficulty badge + county */}
                    <div className="flex items-center justify-between mt-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] h-5 font-medium",
                          DIFFICULTY_COLORS[route.difficulty] || DIFFICULTY_COLORS.unrated
                        )}
                      >
                        {route.difficulty?.charAt(0).toUpperCase() + route.difficulty?.slice(1) || "Unrated"}
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
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Search className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No routes found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your filters or zoom out on the map
            </p>
          </div>
        )}
      </ScrollArea>
    </>
  );

  return (
    <>
      {/* Desktop Panel */}
      <div className="hidden md:flex absolute top-0 left-0 bottom-0 w-96 bg-white shadow-2xl z-20 flex-col">
        {/* Panel Header with menu, search, profile, close */}
        <RoutesPanelHeader
          onClose={onClose}
          onSearch={(query) => setSearchQuery(query)}
          searchPlaceholder="Search for places and routes"
        />
        {panelContent}
      </div>

      {/* Mobile Panel with slide animation */}
      <div 
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 top-0 z-20 transition-transform duration-300 ease-out",
          mobilePanelOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="h-full bg-white flex flex-col">
          {/* Mobile top header */}
          <MobileTopHeader onSearch={(query) => setSearchQuery(query)} />
          
          {/* Content with padding for header and bottom button */}
          <div className="flex-1 flex flex-col pt-14 pb-24 overflow-hidden">
            {panelContent}
          </div>

          {/* Map button at bottom - small and discreet */}
          <div className="absolute bottom-20 left-0 right-0 pb-2">
            <MobilePanelToggle
              mode="map"
              onClick={() => onMobilePanelToggle?.(false)}
              alwaysVisible={true}
            />
          </div>
        </div>
      </div>
    </>
  );
}

