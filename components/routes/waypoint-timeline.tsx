"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { WaypointCard } from "./waypoint-card";

interface WaypointTimelineProps {
  fullWaypointList: any[];
  waypointElevationMap: Record<string, number>;
  onFlyToLocation?: (lat: number, lng: number) => void;
  onOpenFullPanel?: () => void;
  onDismiss?: () => void;
  onToggleWaypoints?: () => void;
  isOwner?: boolean;
  onEditWaypoint?: (waypoint: any) => void;
  onSuggestEdit?: (waypoint: any) => void;
}

export function WaypointTimeline({
  fullWaypointList,
  waypointElevationMap,
  onFlyToLocation,
  onOpenFullPanel,
  isOwner,
  onEditWaypoint,
  onSuggestEdit,
}: WaypointTimelineProps) {
  if (fullWaypointList.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-800">
          Waypoints
        </h3>
        {onOpenFullPanel && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-green-600 hover:text-green-700 h-7"
            onClick={onOpenFullPanel}
          >
            View all
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        )}
      </div>

      {/* Waypoint Timeline - Komoot Style */}
      <div className="relative pl-10">
        {/* Continuous dotted line behind all waypoints */}
        <div className="absolute left-[16px] top-0 bottom-0 border-l-2 border-dotted border-slate-300 z-0" />

        {fullWaypointList.map((wp: any, index: number) => {
          const isStart = wp.type === "start";
          const isFinish = wp.type === "finish";
          const isLast = index === fullWaypointList.length - 1;

          const waypointNumber = isStart
            ? "S"
            : isFinish
            ? "F"
            : `${(wp.listIndex ?? index) + 1}`;

          // Convert km to meters for distance from previous
          const distanceFromPrevious = wp._distFromPrev
            ? wp._distFromPrev * 1000
            : undefined;

          const showConnector = index > 0 && distanceFromPrevious;
          const distanceText = distanceFromPrevious
            ? distanceFromPrevious < 1000
              ? `${Math.round(distanceFromPrevious)} m`
              : `${(distanceFromPrevious / 1000).toFixed(1)} km`
            : null;

          return (
            <div key={wp.id} id={`waypoint-timeline-${wp.id}`} className="relative">
              {/* Distance label on the line */}
              {showConnector && distanceText && (
                <div className="absolute left-[-40px] top-[-26px] z-10 w-8 flex items-center justify-center">
                  <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 leading-none whitespace-nowrap rounded-sm">
                    {distanceText}
                  </span>
                </div>
              )}

              <WaypointCard
                waypoint={wp}
                waypointNumber={waypointNumber}
                distanceFromPrevious={distanceFromPrevious}
                onShowOnMap={
                  wp.lat && wp.lng
                    ? () => onFlyToLocation?.(wp.lat, wp.lng)
                    : undefined
                }
                onEdit={isOwner && onEditWaypoint ? () => onEditWaypoint(wp) : undefined}
                onSuggestEdit={!isOwner && onSuggestEdit ? () => onSuggestEdit(wp) : undefined}
                isOwner={isOwner}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
