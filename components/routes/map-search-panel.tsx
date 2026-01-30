"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Route as RouteIcon,
  Star,
  Clock,
  Filter,
  SlidersHorizontal,
  Plus,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface RouteResult {
  id: string;
  title: string;
  distance_km: number;
  estimated_time_minutes: number;
  difficulty: string;
  route_type: string;
  average_rating: number;
  total_reviews: number;
  cover_photo_url?: string;
}

interface PlaceResult {
  id: string;
  name: string;
  type: string;
  location: string;
  lat: number;
  lng: number;
}

interface MapSearchPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onRouteClick: (routeId: string) => void;
  onPlaceClick: (lat: number, lng: number) => void;
  onCreateRoute: () => void;
  className?: string;
}

const DIFFICULTY_OPTIONS = ["unrated", "easy", "moderate", "difficult", "severe"];
const DIFFICULTY_COLORS: Record<string, string> = {
  unrated: "bg-gray-500",
  easy: "bg-green-500",
  moderate: "bg-blue-500",
  difficult: "bg-orange-500",
  severe: "bg-red-500",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function MapSearchPanel({
  isOpen,
  onToggle,
  onRouteClick,
  onPlaceClick,
  onCreateRoute,
  className,
}: MapSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"places" | "routes">("routes");
  const [showFilters, setShowFilters] = useState(false);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [distanceRange, setDistanceRange] = useState([0, 50]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [routeTypes, setRouteTypes] = useState<string[]>([]);

  // Fetch routes on filter change
  useEffect(() => {
    if (activeTab === "routes") {
      fetchRoutes();
    }
  }, [distanceRange, selectedDifficulties, minRating, routeTypes, searchQuery, activeTab]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/routes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibility: "public",
          search: searchQuery || undefined,
          minDistance: distanceRange[0] > 0 ? distanceRange[0] : undefined,
          maxDistance: distanceRange[1] < 50 ? distanceRange[1] : undefined,
          difficulties: selectedDifficulties.length > 0 ? selectedDifficulties : undefined,
          minRating: minRating > 0 ? minRating : undefined,
          routeTypes: routeTypes.length > 0 ? routeTypes : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
      }
    } catch (error) {
      console.error("Failed to fetch routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDifficulty = (diff: string) => {
    setSelectedDifficulties((prev) =>
      prev.includes(diff) ? prev.filter((d) => d !== diff) : [...prev, diff]
    );
  };

  // Panel collapsed state (just the toggle button)
  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        size="icon"
        className={cn(
          "absolute top-4 left-4 z-20 h-11 w-11 rounded-full shadow-lg bg-white hover:bg-gray-100",
          className
        )}
        onClick={onToggle}
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "absolute top-0 left-0 bottom-0 z-20 w-full max-w-md",
        "bg-white shadow-2xl",
        "lg:w-96",
        className
      )}
    >
      <div className="h-full flex flex-col">
        {/* Header with search */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              onClick={onToggle}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search for places and routes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="places" className="gap-2">
                <MapPin className="h-4 w-4" />
                Places
              </TabsTrigger>
              <TabsTrigger value="routes" className="gap-2">
                <RouteIcon className="h-4 w-4" />
                Routes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "routes" && (
            <div className="h-full flex flex-col">
              {/* Filters bar */}
              <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {loading ? "Loading..." : `${routes.length} routes found`}
                </span>
                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-1"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </Button>
              </div>

              {/* Filter panel */}
              {showFilters && (
                <div className="p-4 border-b bg-gray-50 space-y-4">
                  {/* Distance range */}
                  <div>
                    <Label className="text-sm font-medium">
                      Distance: {distanceRange[0]} - {distanceRange[1]}+ mi
                    </Label>
                    <Slider
                      value={distanceRange}
                      onValueChange={setDistanceRange}
                      min={0}
                      max={50}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  {/* Difficulty */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Difficulty</Label>
                    <div className="flex flex-wrap gap-2">
                      {DIFFICULTY_OPTIONS.map((diff) => (
                        <button
                          key={diff}
                          onClick={() => toggleDifficulty(diff)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            selectedDifficulties.includes(diff)
                              ? cn(DIFFICULTY_COLORS[diff], "text-white")
                              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          )}
                        >
                          {diff.charAt(0).toUpperCase() + diff.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <Label className="text-sm font-medium">
                      Minimum Rating: {minRating > 0 ? `${minRating}+` : "Any"}
                    </Label>
                    <div className="flex gap-2 mt-2">
                      {[0, 3, 3.5, 4, 4.5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setMinRating(rating)}
                          className={cn(
                            "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            minRating === rating
                              ? "bg-yellow-500 text-white"
                              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          )}
                        >
                          {rating > 0 && <Star className="h-3 w-3" />}
                          {rating > 0 ? `${rating}+` : "Any"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Route type */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Route Type</Label>
                    <div className="flex gap-2">
                      {["circular", "linear"].map((type) => (
                        <button
                          key={type}
                          onClick={() =>
                            setRouteTypes((prev) =>
                              prev.includes(type)
                                ? prev.filter((t) => t !== type)
                                : [...prev, type]
                            )
                          }
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize",
                            routeTypes.includes(type)
                              ? "bg-primary text-white"
                              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear filters */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDistanceRange([0, 50]);
                      setSelectedDifficulties([]);
                      setMinRating(0);
                      setRouteTypes([]);
                    }}
                    className="w-full"
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}

              {/* Routes list */}
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {routes.map((route) => (
                    <Card
                      key={route.id}
                      className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => onRouteClick(route.id)}
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
                          <h4 className="font-medium truncate">{route.title}</h4>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <span>{route.distance_km?.toFixed(1)} mi</span>
                            <span>•</span>
                            <span>{formatDuration(route.estimated_time_minutes)}</span>
                            {route.average_rating > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  {route.average_rating.toFixed(1)}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex gap-1.5 mt-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                DIFFICULTY_COLORS[route.difficulty],
                                "text-white"
                              )}
                            >
                              {route.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {route.route_type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {routes.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500">
                      <RouteIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No routes found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {activeTab === "places" && (
            <div className="p-4">
              <p className="text-center text-gray-500 py-8">
                <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                Search for a place to center the map
              </p>
            </div>
          )}
        </div>

        {/* Create route button */}
        <div className="p-4 border-t">
          <Button onClick={onCreateRoute} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Create Route
          </Button>
        </div>
      </div>
    </div>
  );
}

