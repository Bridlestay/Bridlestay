"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { latLngToOSGridRef } from "@/lib/routes/os-grid-ref";

interface RouteWaypointsPanelProps {
  fullWaypointList: any[];
  waypointElevationMap: Record<string, number>;
  onBack: () => void;
  onFlyToLocation?: (lat: number, lng: number) => void;
  onDismiss?: () => void;
  initialExpandedId?: string;
}

export function RouteWaypointsPanel({
  fullWaypointList,
  waypointElevationMap,
  onBack,
  onFlyToLocation,
  onDismiss,
  initialExpandedId,
}: RouteWaypointsPanelProps) {
  const [expandedWaypoints, setExpandedWaypoints] = useState<Set<string>>(
    initialExpandedId ? new Set([initialExpandedId]) : new Set()
  );
  const [waypointTagFilters, setWaypointTagFilters] = useState<Set<string>>(new Set());

  return (
    <div className="flex flex-col h-full">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0"
        >
          <ChevronDown className="h-5 w-5 rotate-90" />
        </Button>
        <h2 className="font-semibold text-lg">Waypoints</h2>
        <Badge variant="outline" className="ml-auto">{fullWaypointList.length}</Badge>
      </div>

      {/* Tag Filter Pills */}
      <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b">
        {[
          { value: "instruction", label: "Instruction", color: "bg-blue-100 text-blue-700 border-blue-300" },
          { value: "poi", label: "POI", color: "bg-purple-100 text-purple-700 border-purple-300" },
          { value: "note", label: "Note", color: "bg-gray-100 text-gray-700 border-gray-300" },
          { value: "caution", label: "Caution", color: "bg-amber-100 text-amber-700 border-amber-300" },
        ].map((tag) => {
          const isActive = waypointTagFilters.has(tag.value);
          return (
            <button
              key={tag.value}
              onClick={() => {
                setWaypointTagFilters((prev) => {
                  const next = new Set(prev);
                  if (next.has(tag.value)) next.delete(tag.value);
                  else next.add(tag.value);
                  return next;
                });
              }}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                isActive ? tag.color : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
              )}
            >
              {tag.label}
            </button>
          );
        })}
      </div>

      {/* Waypoints Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {fullWaypointList.length > 0 ? (
            fullWaypointList
              .filter((wp: any) => {
                if (waypointTagFilters.size === 0) return true;
                if (wp.type === "start" || wp.type === "finish") return true;
                return waypointTagFilters.has(wp.tag || "note");
              })
              .map((wp: any, index: number) => {
              const isExpanded = expandedWaypoints.has(wp.id);
              const isStart = wp.type === "start";
              const isFinish = wp.type === "finish";
              const circleColor = isStart
                ? "bg-green-500 text-white"
                : isFinish
                ? "bg-red-500 text-white"
                : "bg-slate-200 text-slate-700";
              const circleLabel = isStart ? "S" : isFinish ? "F" : `${index}`;
              const wpElevation = waypointElevationMap[wp.id];
              const gridRef = latLngToOSGridRef(wp.lat, wp.lng);

              // Calculate ascent/descent from previous using elevation data
              const prevWp = index > 0 ? fullWaypointList[index - 1] : null;
              const prevElevation = prevWp ? waypointElevationMap[prevWp.id] : undefined;
              let ascentFromPrev: number | undefined;
              let descentFromPrev: number | undefined;
              if (wpElevation !== undefined && prevElevation !== undefined) {
                const diff = wpElevation - prevElevation;
                ascentFromPrev = diff > 0 ? diff : 0;
                descentFromPrev = diff < 0 ? Math.abs(diff) : 0;
              }

              return (
                <div key={wp.id} id={`waypoint-${wp.id}`} className="border rounded-lg overflow-hidden">
                  {/* Collapsed row */}
                  <button
                    onClick={() => {
                      const next = new Set(expandedWaypoints);
                      if (next.has(wp.id)) next.delete(wp.id);
                      else next.add(wp.id);
                      setExpandedWaypoints(next);
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs",
                      circleColor
                    )}>
                      {circleLabel}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {wp.name || `Waypoint ${index}`}
                      </p>
                    </div>
                    {wp.tag && wp.tag !== "note" && (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] h-5 px-1.5 flex-shrink-0", {
                          "bg-blue-50 text-blue-700 border-blue-200": wp.tag === "instruction",
                          "bg-purple-50 text-purple-700 border-purple-200": wp.tag === "poi",
                          "bg-amber-50 text-amber-700 border-amber-200": wp.tag === "caution",
                        })}
                      >
                        {wp.tag === "instruction" ? "Instruction" : wp.tag === "poi" ? "POI" : "Caution"}
                      </Badge>
                    )}
                    {wp._distFromStart > 0 && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {wp._distFromStart.toFixed(2)} km
                      </span>
                    )}
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
                      isExpanded && "rotate-180"
                    )} />
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t bg-slate-50/50 space-y-2">
                      {wp.description && (
                        <p className="text-sm text-slate-600">{wp.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {wp._distFromPrev > 0 && (
                          <>
                            <span className="text-slate-500">Distance from previous:</span>
                            <span className="font-medium">{wp._distFromPrev.toFixed(2)} km</span>
                          </>
                        )}
                        {ascentFromPrev !== undefined && ascentFromPrev > 0 && (
                          <>
                            <span className="text-slate-500">Ascent from previous:</span>
                            <span className="font-medium">{Math.round(ascentFromPrev)} m</span>
                          </>
                        )}
                        {descentFromPrev !== undefined && descentFromPrev > 0 && (
                          <>
                            <span className="text-slate-500">Descent from previous:</span>
                            <span className="font-medium">{Math.round(descentFromPrev)} m</span>
                          </>
                        )}
                        {gridRef && (
                          <>
                            <span className="text-slate-500">OS Grid Ref:</span>
                            <span className="font-medium font-mono">{gridRef}</span>
                          </>
                        )}
                        <span className="text-slate-500">Lat, long:</span>
                        <span className="font-medium font-mono">{wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}</span>
                        {wpElevation !== undefined && (
                          <>
                            <span className="text-slate-500">Elevation:</span>
                            <span className="font-medium">{wpElevation} m</span>
                          </>
                        )}
                      </div>
                      {onFlyToLocation && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={() => {
                            onFlyToLocation(wp.lat, wp.lng);
                            onDismiss?.();
                          }}
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          Show on map
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No waypoints added to this route yet.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
