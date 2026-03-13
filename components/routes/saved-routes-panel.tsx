"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Search, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRouteThumbnailUrlAuto } from "@/lib/routes/route-thumbnail";

interface SavedRoutesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteClick: (routeId: string) => void;
  onRouteHover?: (routeId: string | null) => void;
  mobilePanelOpen?: boolean;
  onMobilePanelToggle?: (open: boolean) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  unrated: "bg-gray-100 text-gray-700 border-gray-300",
  easy: "bg-green-100 text-green-700 border-green-300",
  moderate: "bg-amber-100 text-amber-700 border-amber-300",
  medium: "bg-amber-100 text-amber-700 border-amber-300",
  difficult: "bg-orange-100 text-orange-700 border-orange-300",
  hard: "bg-red-100 text-red-700 border-red-300",
  severe: "bg-red-100 text-red-700 border-red-300",
};

export function SavedRoutesPanel({
  isOpen,
  onClose,
  onRouteClick,
  onRouteHover,
}: SavedRoutesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_created");
  const [routeType, setRouteType] = useState<string[]>([]);
  const [myRoutes, setMyRoutes] = useState<any[]>([]);
  const [bookmarkedRoutes, setBookmarkedRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my-routes");

  useEffect(() => {
    if (isOpen) {
      fetchSavedRoutes();
    }
  }, [isOpen]);

  const fetchSavedRoutes = async () => {
    setLoading(true);
    try {
      const myRes = await fetch("/api/routes/my-routes");
      if (myRes.ok) {
        const data = await myRes.json();
        setMyRoutes(data.routes || []);
      }

      const favRes = await fetch("/api/routes/favorites");
      if (favRes.ok) {
        const data = await favRes.json();
        setBookmarkedRoutes(data.routes || []);
      }
    } catch (error) {
      console.error("Failed to fetch saved routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterRoutes = (routes: any[]) => {
    let filtered = routes;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title?.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query)
      );
    }

    if (routeType.length > 0) {
      filtered = filtered.filter((r) => routeType.includes(r.route_type));
    }

    if (sortBy === "date_created") {
      filtered.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.title?.localeCompare(b.title));
    } else if (sortBy === "distance") {
      filtered.sort((a, b) => (b.distance_km || 0) - (a.distance_km || 0));
    }

    return filtered;
  };

  const displayRoutes =
    activeTab === "my-routes"
      ? filterRoutes(myRoutes)
      : filterRoutes(bookmarkedRoutes);

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
            {/* Title + Close */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Saved Routes
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search saved routes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Controls: Sort + Tabs + Filters */}
            <div className="px-5 py-3 space-y-3 border-b">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-36 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_created">Date created</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="distance">Distance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="my-routes" className="flex-1">
                    My Routes
                  </TabsTrigger>
                  <TabsTrigger value="bookmarked" className="flex-1">
                    Bookmarked Routes
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Route type filter — inline */}
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm text-gray-500">Type:</span>
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
                {(routeType.length > 0 || searchQuery) && (
                  <button
                    onClick={() => {
                      setRouteType([]);
                      setSearchQuery("");
                    }}
                    className="text-sm text-primary hover:underline ml-auto"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Route Cards Grid */}
            {loading ? (
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
                        {/* Circular badge */}
                        {route.route_type === "circular" && (
                          <span className="absolute top-2.5 left-2.5 text-[10px] px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white font-medium">
                            Circular
                          </span>
                        )}
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

                        {/* Difficulty + reviews */}
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
                  {activeTab === "my-routes"
                    ? "Create your first route to see it here"
                    : "Bookmark routes while browsing to see them here"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
