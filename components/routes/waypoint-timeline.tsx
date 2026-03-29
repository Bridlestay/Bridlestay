"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown } from "lucide-react";
import { WaypointCard } from "./waypoint-card";
import { cn } from "@/lib/utils";

const COLLAPSED_LIMIT = 4;
const STAGGER_DELAY = 120; // ms between each card
const CARD_DURATION = 400; // ms per card transition

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
  const [isRevealed, setIsRevealed] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number>(0);

  if (fullWaypointList.length === 0) return null;

  // Truncate list at Finish — nothing should appear after it
  const finishIdx = fullWaypointList.findIndex(
    (wp: any) => wp.type === "finish"
  );
  const truncatedList =
    finishIdx >= 0
      ? fullWaypointList.slice(0, finishIdx + 1)
      : fullWaypointList;

  const canCollapse = truncatedList.length > COLLAPSED_LIMIT;
  const hiddenCount = truncatedList.length - 3;
  const hiddenWaypoints = canCollapse ? truncatedList.slice(3) : [];
  const totalHidden = hiddenWaypoints.length;
  const totalAnimTime = (totalHidden - 1) * STAGGER_DELAY + CARD_DURATION;

  // Always show only first 3 when collapsible — hidden section renders the rest
  const visibleWaypoints = canCollapse
    ? truncatedList.slice(0, 3)
    : truncatedList;

  // Show gradient + button when collapsed OR collapsing
  const showCollapsedUI = canCollapse && (!showAll || isCollapsing);

  // Distance from last visible waypoint to first hidden (for collapsed state)
  const firstHiddenWp = hiddenWaypoints[0];
  const nextDistanceMetres = firstHiddenWp?._distFromPrev
    ? firstHiddenWp._distFromPrev * 1000
    : undefined;
  const nextDistanceText = nextDistanceMetres
    ? nextDistanceMetres < 1000
      ? `${Math.round(nextDistanceMetres)} m`
      : `${(nextDistanceMetres / 1000).toFixed(1)} km`
    : null;

  // Progressive scroll — follows content as it reveals
  // If targetId is provided, follows the cascade until that element is revealed, then stops there
  const startProgressiveScroll = useCallback((duration: number, targetId?: string) => {
    const startTime = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed < duration) {
        if (targetId) {
          // Follow cascade by scrolling to the target element as it animates in
          const el = document.getElementById(`waypoint-timeline-${targetId}`);
          el?.scrollIntoView({ behavior: "auto", block: "center" });
        } else {
          endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
        }
        scrollRafRef.current = requestAnimationFrame(tick);
      }
    };
    scrollRafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopProgressiveScroll = useCallback(() => {
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = 0;
    }
  }, []);

  const handleExpand = useCallback((scrollToId?: string) => {
    setShowAll(true);
    setIsCollapsing(false);
    // Frame 1: mount cards (invisible). Frame 2: measure + reveal
    requestAnimationFrame(() => {
      if (hiddenRef.current) {
        setContainerHeight(hiddenRef.current.scrollHeight);
      }
      requestAnimationFrame(() => {
        setIsRevealed(true);
        if (scrollToId) {
          // Find the target's index in hidden waypoints to calculate its reveal time
          const targetIdx = hiddenWaypoints.findIndex((wp: any) => wp.id === scrollToId);
          // Follow cascade until target is fully revealed, then stop
          const stopAt = targetIdx >= 0
            ? (targetIdx * STAGGER_DELAY) + CARD_DURATION + 200
            : totalAnimTime + 200;
          startProgressiveScroll(stopAt, scrollToId);
        } else {
          // Default: progressive scroll follows the cascade to the end
          startProgressiveScroll(totalAnimTime + 200);
        }
      });
    });
  }, [totalAnimTime, startProgressiveScroll, hiddenWaypoints]);

  const handleCollapse = useCallback(() => {
    stopProgressiveScroll();
    setIsRevealed(false);
    setIsCollapsing(true);
    setContainerHeight(0);
    // Wait for reverse stagger to finish, then unmount
    setTimeout(() => {
      setShowAll(false);
      setIsCollapsing(false);
    }, totalAnimTime + 50);
  }, [totalAnimTime, stopProgressiveScroll]);

  // Auto-expand if the target waypoint is hidden in collapsed view
  useEffect(() => {
    if (!initialExpandedWaypointId) return;
    const idx = fullWaypointList.findIndex(
      (wp: any) => wp.id === initialExpandedWaypointId
    );
    if (idx >= 3) {
      handleExpand(initialExpandedWaypointId);
    } else {
      // Waypoint is visible — just scroll to it
      const el = document.getElementById(`waypoint-timeline-${initialExpandedWaypointId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [initialExpandedWaypointId, fullWaypointList, handleExpand]);

  // Cleanup scroll on unmount
  useEffect(() => {
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

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
        <div className={cn(
          "absolute left-[16px] top-0 border-l-2 border-dotted border-slate-300 z-0",
          showCollapsedUI ? "bottom-16" : "bottom-0"
        )} />

        {/* Always-visible waypoints (first 3 when collapsible, all otherwise) */}
        {visibleWaypoints.map((wp: any, visIdx: number) =>
          renderWaypoint(wp, visIdx)
        )}

        {/* Gradient fade + distance label + "Show more" when collapsed or collapsing */}
        {showCollapsedUI && (
          <>
            {/* Distance to next hidden waypoint — matches other distance label positions */}
            {nextDistanceText && (
              <div className="relative">
                <div className="absolute left-[-40px] top-[-26px] z-10 w-8 flex items-center justify-center">
                  <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 leading-none whitespace-nowrap rounded-sm">
                    {nextDistanceText}
                  </span>
                </div>
              </div>
            )}
            {/* Gradient fade */}
            <div className="relative h-12 z-20 pointer-events-none">
              <div className="absolute inset-x-[-50px] bottom-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent" />
            </div>
            {/* Show more button */}
            {!isCollapsing && (
              <div className="relative z-20 flex justify-center py-1">
                <button
                  onClick={handleExpand}
                  className="text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 px-4 py-1.5 rounded-full transition-colors"
                >
                  Show {hiddenCount} more waypoint{hiddenCount !== 1 ? "s" : ""}
                </button>
              </div>
            )}
          </>
        )}

        {/* Hidden waypoints — staggered cascade animation */}
        {showAll && canCollapse && (
          <div
            ref={hiddenRef}
            className="overflow-hidden transition-all ease-out"
            style={{
              maxHeight: containerHeight > 0 ? `${containerHeight}px` : "0px",
              transitionDuration: `${totalAnimTime}ms`,
              marginLeft: "-50px",
              paddingLeft: "50px",
            }}
          >
            {hiddenWaypoints.map((wp: any, i: number) => (
              <div
                key={wp.id}
                className="transition-all ease-out"
                style={{
                  opacity: isRevealed ? 1 : 0,
                  transform: isRevealed ? "translateY(0)" : "translateY(-12px)",
                  transitionDuration: `${CARD_DURATION}ms`,
                  transitionDelay: isRevealed
                    ? `${i * STAGGER_DELAY}ms`
                    : `${(totalHidden - 1 - i) * STAGGER_DELAY}ms`,
                }}
              >
                {renderWaypoint(wp, i + 3)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* "Show fewer" button when expanded */}
      {showAll && canCollapse && (
        <div
          className="flex justify-center pt-2 transition-opacity"
          style={{
            opacity: isRevealed ? 1 : 0,
            transitionDuration: `${CARD_DURATION}ms`,
          }}
        >
          <button
            onClick={handleCollapse}
            disabled={!isRevealed}
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
