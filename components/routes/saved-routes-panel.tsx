"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
  Clock,
  Ruler,
  Star,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { RoutesPanelHeader } from "./routes-panel-header";

interface SavedRoutesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteClick: (routeId: string) => void;
  onRouteHover?: (routeId: string | null) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  unrated: "bg-gray-100 text-gray-700",
  easy: "bg-green-100 text-green-700",
  moderate: "bg-blue-100 text-blue-700",
  difficult: "bg-orange-100 text-orange-700",
  severe: "bg-red-100 text-red-700",
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
      // Fetch user's own routes
      const myRes = await fetch("/api/routes/my-routes");
      if (myRes.ok) {
        const data = await myRes.json();
        setMyRoutes(data.routes || []);
      }

      // Fetch bookmarked/favorited routes
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

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title?.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query)
      );
    }

    // Route type filter
    if (routeType.length > 0) {
      filtered = filtered.filter((r) => routeType.includes(r.route_type));
    }

    // Sort
    if (sortBy === "date_created") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.title?.localeCompare(b.title));
    } else if (sortBy === "distance") {
      filtered.sort((a, b) => (b.distance_km || 0) - (a.distance_km || 0));
    }

    return filtered;
  };

  const displayRoutes = activeTab === "my-routes" 
    ? filterRoutes(myRoutes) 
    : filterRoutes(bookmarkedRoutes);

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 left-0 bottom-0 w-96 bg-white shadow-2xl z-20 flex flex-col">
      {/* Panel Header with menu, search, profile, close */}
      <RoutesPanelHeader
        onClose={onClose}
        onSearch={(query) => setSearchQuery(query)}
        searchPlaceholder="Search saved routes"
      />

      {/* Sort dropdown */}
      <div className="px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_created">Date created</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="distance">Distance</SelectItem>
            </SelectContent>
          </Select>
          {sortBy !== "date_created" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSortBy("date_created")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3">
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
      </div>

      {/* Filters */}
      <div className="px-4 pb-3 border-b">
        <h4 className="text-sm font-medium mb-2">Route type</h4>
        <div className="space-y-2">
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
        
        {(routeType.length > 0 || searchQuery) && (
          <button
            onClick={() => {
              setRouteType([]);
              setSearchQuery("");
            }}
            className="text-sm text-primary hover:underline mt-2"
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
          <div className="p-4 space-y-3">
            {displayRoutes.map((route) => (
              <div
                key={route.id}
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onRouteClick(route.id)}
                onMouseEnter={() => onRouteHover?.(route.id)}
                onMouseLeave={() => onRouteHover?.(null)}
              >
                <div className="flex gap-3">
                  {route.cover_photo_url && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={route.cover_photo_url}
                        alt={route.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{route.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Ruler className="h-3 w-3" />
                        {route.distance_km?.toFixed(1)} km
                      </span>
                      {route.estimated_time_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round(route.estimated_time_minutes)}m
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] h-5",
                          DIFFICULTY_COLORS[route.difficulty] || DIFFICULTY_COLORS.unrated
                        )}
                      >
                        {route.difficulty?.charAt(0).toUpperCase() + route.difficulty?.slice(1) || "Unrated"}
                      </Badge>
                      {route.avg_rating > 0 && (
                        <span className="flex items-center gap-0.5 text-xs">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {route.avg_rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Search className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No routes found</p>
            <p className="text-sm text-gray-400 mt-1">
              Please zoom out to view more routes or edit your filters
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

