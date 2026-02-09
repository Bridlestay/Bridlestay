"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Clock, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMapboxThumbnailUrl } from "@/lib/routes/route-thumbnail";

interface RouteQuickCardProps {
  route: any;
  onClose: () => void;
  onClick: () => void;
  className?: string;
}

const DIFFICULTY_STYLES: Record<string, { bg: string; text: string }> = {
  easy: { bg: "bg-green-100", text: "text-green-800" },
  moderate: { bg: "bg-amber-100", text: "text-amber-800" },
  medium: { bg: "bg-amber-100", text: "text-amber-800" },
  difficult: { bg: "bg-orange-100", text: "text-orange-800" },
  hard: { bg: "bg-red-100", text: "text-red-800" },
  severe: { bg: "bg-red-200", text: "text-red-900" },
  unrated: { bg: "bg-gray-100", text: "text-gray-700" },
};

export function RouteQuickCard({ route, onClose, onClick, className }: RouteQuickCardProps) {
  if (!route) return null;

  // Calculate ride time
  const rideTimeMinutes = Math.round((route.distance_km || 0) / 8 * 60);
  const hours = Math.floor(rideTimeMinutes / 60);
  const mins = rideTimeMinutes % 60;
  const rideTimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const difficulty = (route.difficulty || "unrated").toLowerCase();
  const diffStyle = DIFFICULTY_STYLES[difficulty] || DIFFICULTY_STYLES.unrated;

  // Route thumbnail
  const thumbnailUrl = getMapboxThumbnailUrl(route.geometry, {
    width: 120,
    height: 80,
    routeColor: "166534",
    routeWeight: 4,
  });

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md",
        "md:bottom-6 md:max-w-lg",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        className
      )}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-2xl transition-shadow duration-200"
        onClick={onClick}
      >
        {/* Close button - small corner cutout */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-0 right-0 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-bl-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-gray-500" />
        </button>

        <div className="flex items-center gap-3 p-3">
          {/* Route Thumbnail */}
          {thumbnailUrl && (
            <div className="flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={thumbnailUrl}
                alt={route.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          {/* Route Info */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="font-semibold text-sm text-gray-900 truncate leading-tight">
              {route.title || "Untitled Route"}
            </h3>

            {/* Author */}
            {route.owner?.name && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={route.owner?.avatar_url} />
                  <AvatarFallback className="text-[8px] bg-green-100 text-green-800">
                    {route.owner?.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-500 truncate">
                  {route.owner.name}
                </span>
              </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center gap-3 mt-1.5">
              {/* Distance */}
              <span className="text-xs text-gray-600 flex items-center gap-1">
                🐴 {(route.distance_km || 0).toFixed(1)} km
              </span>

              {/* Time */}
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {rideTimeStr}
              </span>

              {/* Completions */}
              {(route.completions_count !== undefined && route.completions_count > 0) && (
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {route.completions_count}
                </span>
              )}
            </div>
          </div>

          {/* Difficulty Badge */}
          <div className="flex-shrink-0">
            <Badge
              className={cn(
                "text-[11px] px-2.5 py-0.5 font-semibold capitalize border-0",
                diffStyle.bg,
                diffStyle.text
              )}
            >
              {difficulty === "unrated" ? "Unrated" : difficulty}
            </Badge>
          </div>
        </div>

        {/* Subtle tap hint */}
        <div className="bg-green-50 px-3 py-1.5 border-t border-green-100">
          <p className="text-[11px] text-green-700 text-center font-medium">
            Tap for full details
          </p>
        </div>
      </div>
    </div>
  );
}

