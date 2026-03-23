"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown } from "lucide-react";
import { WaypointCard } from "./waypoint-card";

const COLLAPSED_LIMIT = 4;

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
  initialExpandedWaypointId?: string | null;
}

export function WaypointTimeline({
  fullWaypointList,
  waypointElevationMap,
  onFlyToLocation,
  onOpenFullPanel,
  isOwner,
  onEditWaypoint,
  onSuggestEdit,
  initialExpandedWaypointId,
}: WaypointTimelineProps) {
  const [showAll, setShowAll] = useState(false);

  // Auto-expand if the target waypoint is hidden in collapsed view
  useEffect(() => {
    if (!initialExpandedWaypointId) return;
    const idx = fullWaypointList.findIndex(
      (wp: any) => wp.id === initialExpandedWaypointId
    );
    // If target is beyond the first 3 and not the last, expand
    if (idx >= 3 && idx < fullWaypointList.length - 1) {
      setShowAll(true);
    }
  }, [initialExpandedWaypointId, fullWaypointList]);

  if (fullWaypointList.length === 0) return null;

  const shouldCollapse = fullWaypointList.length > COLLAPSED_LIMIT && !showAll;
  // When collapsed: show first 3 + last (finish)
  const visibleWaypoints = shouldCollapse
    ? [...fullWaypointList.slice(0, 3), fullWaypointList[fullWaypointList.length - 1]]
    : fullWaypointList;
  const hiddenCount = fullWaypointList.length - 4;

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

        {visibleWaypoints.map((wp: any, visIdx: number) => {
          const index = fullWaypointList.indexOf(wp);
          const isStart = wp.type === "start";
          const isFinish = wp.type === "finish";

          const waypointNumber = isStart
            ? "S"
            : isFinish
            ? "F"
            : `${(wp.listIndex ?? index) + 1}`;

          // Convert km to meters for distance from previous
          const distanceFromPrevious = wp._distFromPrev
            ? wp._distFromPrev * 1000
            : undefined;

          const showConnector = visIdx > 0 && distanceFromPrevious;
          const distanceText = distanceFromPrevious
            ? distanceFromPrevious < 1000
              ? `${Math.round(distanceFromPrevious)} m`
              : `${(distanceFromPrevious / 1000).toFixed(1)} km`
            : null;

          // Show expand button before the last item when collapsed
          const showExpandGap = shouldCollapse && visIdx === 3;

          return (
            <div key={wp.id}>
              {showExpandGap && (
                <div className="relative z-10 flex justify-center py-1.5">
                  <button
                    onClick={() => setShowAll(true)}
                    className="text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1 rounded-full transition-colors"
                  >
                    Show {hiddenCount} more waypoint{hiddenCount !== 1 ? "s" : ""}
                  </button>
                </div>
              )}
              <div id={`waypoint-timeline-${wp.id}`} className="relative">
                {/* Distance label on the line */}
                {showConnector && distanceText && !showExpandGap && (
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
                  onEdit={isOwner && onEditWaypoint && !isStart && !isFinish ? () => onEditWaypoint(wp) : undefined}
                  onSuggestEdit={!isOwner && onSuggestEdit && !isStart && !isFinish ? () => onSuggestEdit(wp) : undefined}
                  isOwner={isOwner}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Collapse button when expanded */}
      {!shouldCollapse && fullWaypointList.length > COLLAPSED_LIMIT && showAll && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setShowAll(false)}
            className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-full transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5 rotate-180" />
            Show fewer
          </button>
        </div>
      )}
    </div>
  );
}
