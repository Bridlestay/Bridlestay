"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown } from "lucide-react";
import { WaypointCard } from "./waypoint-card";
import { cn } from "@/lib/utils";

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
  const [expandHeight, setExpandHeight] = useState(0);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-expand if the target waypoint is hidden in collapsed view
  useEffect(() => {
    if (!initialExpandedWaypointId) return;
    const idx = fullWaypointList.findIndex(
      (wp: any) => wp.id === initialExpandedWaypointId
    );
    if (idx >= 3) {
      handleExpand();
    }
  }, [initialExpandedWaypointId, fullWaypointList]);

  if (fullWaypointList.length === 0) return null;

  // Truncate list at Finish — nothing should appear after it
  const finishIdx = fullWaypointList.findIndex(
    (wp: any) => wp.type === "finish"
  );
  const truncatedList =
    finishIdx >= 0
      ? fullWaypointList.slice(0, finishIdx + 1)
      : fullWaypointList;

  const shouldCollapse = truncatedList.length > COLLAPSED_LIMIT && !showAll;
  const hiddenCount = truncatedList.length - 3;

  // Only show first 3 when collapsed (no finish)
  const visibleWaypoints = shouldCollapse
    ? truncatedList.slice(0, 3)
    : truncatedList;

  const handleExpand = () => {
    setShowAll(true);
    // Measure content height after DOM render, then animate
    requestAnimationFrame(() => {
      if (hiddenRef.current) {
        setExpandHeight(hiddenRef.current.scrollHeight);
      }
      // Scroll to bottom of waypoint section after animation
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 350);
    });
  };

  const handleCollapse = () => {
    setExpandHeight(0);
    // Wait for collapse animation to finish before unmounting
    setTimeout(() => setShowAll(false), 400);
  };

  const renderWaypoint = (wp: any, visIdx: number) => {
    const index = truncatedList.indexOf(wp);
    const isStart = wp.type === "start";
    const isFinish = wp.type === "finish";

    const waypointNumber = isStart
      ? "S"
      : isFinish
      ? "F"
      : `${(wp.listIndex ?? index) + 1}`;

    const distanceFromPrevious = wp._distFromPrev
      ? wp._distFromPrev * 1000
      : undefined;

    const showConnector = visIdx > 0 && distanceFromPrevious;
    const distanceText = distanceFromPrevious
      ? distanceFromPrevious < 1000
        ? `${Math.round(distanceFromPrevious)} m`
        : `${(distanceFromPrevious / 1000).toFixed(1)} km`
      : null;

    return (
      <div key={wp.id}>
        <div id={`waypoint-timeline-${wp.id}`} className="relative">
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
            onEdit={isOwner && onEditWaypoint && !isStart && !isFinish ? () => onEditWaypoint(wp) : undefined}
            onSuggestEdit={!isOwner && onSuggestEdit && !isStart && !isFinish ? () => onSuggestEdit(wp) : undefined}
            isOwner={isOwner}
          />
        </div>
      </div>
    );
  };

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

      {/* Waypoint Timeline */}
      <div className="relative pl-10">
        {/* Continuous dotted line behind all waypoints */}
        <div className="absolute left-[16px] top-0 bottom-0 border-l-2 border-dotted border-slate-300 z-0" />

        {/* Always-visible waypoints (first 3 when collapsed, all when expanded) */}
        {visibleWaypoints.map((wp: any, visIdx: number) =>
          renderWaypoint(wp, visIdx)
        )}

        {/* Fade-out gradient overlay when collapsed — covers content AND dotted timeline */}
        {shouldCollapse && (
          <div className="relative -mt-20 pt-20 z-20">
            {/* White gradient fade — extends left to cover the dotted timeline */}
            <div className="absolute inset-x-[-50px] top-0 h-20 bg-gradient-to-b from-transparent via-white/80 to-white pointer-events-none" />
            {/* Show more button */}
            <div className="relative flex justify-center py-2">
              <button
                onClick={handleExpand}
                className="text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 px-4 py-1.5 rounded-full transition-colors"
              >
                Show {hiddenCount} more waypoint{hiddenCount !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

        {/* Hidden waypoints that expand/collapse with smooth height animation */}
        {showAll && truncatedList.length > COLLAPSED_LIMIT && (
          <div
            ref={hiddenRef}
            className="transition-all duration-400 ease-out overflow-hidden"
            style={{
              maxHeight: expandHeight > 0 ? `${expandHeight}px` : "0px",
              opacity: expandHeight > 0 ? 1 : 0,
            }}
          >
            {truncatedList.slice(3).map((wp: any, i: number) =>
              renderWaypoint(wp, i + 3)
            )}
          </div>
        )}
      </div>

      {/* Collapse button when expanded */}
      {showAll && expandHeight > 0 && truncatedList.length > COLLAPSED_LIMIT && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleCollapse}
            className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-full transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5 rotate-180" />
            Show fewer
          </button>
        </div>
      )}

      {/* Scroll target for auto-scroll after expand */}
      <div ref={endRef} />
    </div>
  );
}
