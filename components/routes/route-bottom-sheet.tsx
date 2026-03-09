"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Star,
  TrendingUp,
  Route as RouteIcon,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface RoutePreview {
  id: string;
  title: string;
  distance_km: number;
  estimated_time_minutes: number;
  difficulty: string;
  route_type: string;
  average_rating: number;
  total_reviews: number;
  cover_photo_url?: string;
  creator?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

interface RouteBottomSheetProps {
  routes: RoutePreview[];
  selectedRouteId: string | null;
  onRouteSelect: (routeId: string) => void;
  onRouteClick: (routeId: string) => void;
  onClose: () => void;
  isCluster?: boolean;
  clusterCount?: number;
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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function RouteBottomSheet({
  routes,
  selectedRouteId,
  onRouteSelect,
  onRouteClick,
  onClose,
  isCluster = false,
  clusterCount = 0,
}: RouteBottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const displayRoute = selectedRoute || routes[0];

  // Scroll to selected route in carousel
  useEffect(() => {
    if (selectedRouteId && scrollRef.current) {
      const index = routes.findIndex((r) => r.id === selectedRouteId);
      if (index !== -1) {
        const cardWidth = 280;
        scrollRef.current.scrollTo({
          left: index * cardWidth,
          behavior: "smooth",
        });
      }
    }
  }, [selectedRouteId, routes]);

  if (!displayRoute) return null;

  // Collapsed single route view
  if (!isCluster && routes.length === 1) {
    return (
      <div className="absolute inset-x-0 bottom-0 z-20 p-4 pb-safe">
        <Card className="rounded-2xl shadow-2xl overflow-hidden">
          {/* Drag handle */}
          <div className="flex justify-center py-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Route preview */}
          <div
            className="p-4 cursor-pointer"
            onClick={() => onRouteClick(displayRoute.id)}
          >
            <div className="flex gap-4">
              {/* Cover image */}
              {displayRoute.cover_photo_url && (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={displayRoute.cover_photo_url}
                    alt={displayRoute.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{displayRoute.title}</h3>
                
                {displayRoute.creator && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={displayRoute.creator.avatar_url} />
                      <AvatarFallback className="text-[10px]">
                        {displayRoute.creator.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600 truncate">
                      {displayRoute.creator.name}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <RouteIcon className="h-3.5 w-3.5" />
                    {displayRoute.distance_km?.toFixed(1)} mi
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(displayRoute.estimated_time_minutes)}
                  </span>
                  {displayRoute.average_rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      {displayRoute.average_rating.toFixed(1)}
                      <span className="text-gray-400">({displayRoute.total_reviews})</span>
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", DIFFICULTY_COLORS[displayRoute.difficulty] || DIFFICULTY_COLORS.unrated)}
                  >
                    {displayRoute.difficulty.charAt(0).toUpperCase() + displayRoute.difficulty.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {displayRoute.route_type}
                  </Badge>
                </div>
              </div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Cluster/multiple routes carousel view
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 pb-safe">
      <Card className="rounded-t-2xl shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-2 flex items-center justify-between">
          <h3 className="font-semibold text-lg">
            {isCluster ? `${clusterCount} Routes` : `${routes.length} Routes`}
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Horizontal scroll carousel */}
        <div className="relative">
          <ScrollArea className="w-full" ref={scrollRef}>
            <div className="flex gap-3 px-4 pb-4">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className={cn(
                    "flex-shrink-0 w-64 rounded-xl border-2 p-3 cursor-pointer transition-all",
                    selectedRouteId === route.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-gray-50 hover:bg-gray-100"
                  )}
                  onClick={() => onRouteSelect(route.id)}
                  onDoubleClick={() => onRouteClick(route.id)}
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
                        <span>{route.distance_km?.toFixed(1)} mi</span>
                        <span>•</span>
                        <span>{formatDuration(route.estimated_time_minutes)}</span>
                      </div>
                      {route.average_rating > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{route.average_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Navigation arrows for desktop */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow hidden lg:flex"
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollBy({ left: -280, behavior: "smooth" });
              }
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow hidden lg:flex"
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollBy({ left: 280, behavior: "smooth" });
              }
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Tap to view full details hint */}
        <div className="px-4 pb-3 text-center">
          <p className="text-xs text-gray-500">
            Tap a route to highlight • Double-tap to view details
          </p>
        </div>
      </Card>
    </div>
  );
}

