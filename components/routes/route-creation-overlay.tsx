"use client";

import { cn } from "@/lib/utils";
import { Clock, Ruler, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Floating Stats Pill ---
// Shows distance + time on the map during route creation
interface RouteStatsPillProps {
  distanceKm: number;
  rideTimeMinutes: number;
  className?: string;
}

export function RouteStatsPill({
  distanceKm,
  rideTimeMinutes,
  className,
}: RouteStatsPillProps) {
  const formatDistance = (km: number) => {
    if (km < 0.01) return "0 km";
    if (km < 10) return `${km.toFixed(2)} km`;
    return `${km.toFixed(1)} km`;
  };

  const formatTime = (minutes: number) => {
    if (minutes === 0) return "0 min";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div
      className={cn(
        "bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-slate-200 px-4 py-2 flex items-center gap-3 text-sm",
        className
      )}
    >
      <span className="flex items-center gap-1.5 text-slate-700 font-medium">
        <Ruler className="h-3.5 w-3.5 text-slate-400" />
        {formatDistance(distanceKm)}
      </span>
      <span className="w-px h-4 bg-slate-200" />
      <span className="flex items-center gap-1.5 text-slate-700 font-medium">
        <Clock className="h-3.5 w-3.5 text-slate-400" />
        {formatTime(rideTimeMinutes)}
      </span>
    </div>
  );
}

// --- Floating Save Route Button ---
// Appears when user has 2+ waypoints, triggers the form modal
interface SaveRouteButtonProps {
  waypointCount: number;
  onClick: () => void;
  className?: string;
}

export function SaveRouteButton({
  waypointCount,
  onClick,
  className,
}: SaveRouteButtonProps) {
  if (waypointCount < 2) return null;

  return (
    <Button
      onClick={onClick}
      className={cn(
        "bg-[#2E8B57] hover:bg-[#256b45] text-white shadow-lg rounded-full px-6 h-11 text-sm font-semibold",
        className
      )}
    >
      <Check className="h-4 w-4 mr-2" />
      Save Route
    </Button>
  );
}
