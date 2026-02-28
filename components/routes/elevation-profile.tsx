"use client";

import { useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

interface WaypointItem {
  id: string;
  name: string;
  distanceFromStart: number;
  elevation?: number;
  type: "start" | "waypoint" | "finish";
  listIndex?: number;
}

interface HazardItem {
  id: string;
  type: string;
  distanceFromStart: number;
  elevation?: number;
}

interface ElevationProfileProps {
  // Pre-computed data from API (preferred)
  elevations?: number[];
  distances?: number[];
  totalAscent?: number;
  totalDescent?: number;
  // Legacy: raw coordinates
  coordinates?: [number, number, number?][]; // [lng, lat, elevation?]
  distanceKm: number;
  className?: string;
  onHover?: (index: number | null, position: { lat: number; lng: number } | null) => void;
  highlightIndex?: number | null;
  // Inline mode markers (original)
  waypoints?: Array<{
    name: string;
    distanceFromStart: number;
    elevation?: number;
  }>;
  hazards?: Array<{
    type: string;
    distanceFromStart: number;
    elevation?: number;
  }>;
  // Floating mode markers (Komoot-style)
  markerStyle?: "inline" | "floating";
  waypointItems?: WaypointItem[];
  hazardItems?: HazardItem[];
  onWaypointClick?: (index: number) => void;
  onHazardClick?: (index: number) => void;
}

export function ElevationProfile({
  elevations: preElevations,
  distances: preDistances,
  totalAscent: preTotalAscent,
  totalDescent: preTotalDescent,
  coordinates,
  distanceKm,
  className,
  onHover,
  highlightIndex,
  waypoints,
  hazards,
  markerStyle = "inline",
  waypointItems,
  hazardItems,
  onWaypointClick,
  onHazardClick,
}: ElevationProfileProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFloating = markerStyle === "floating";

  // Calculate elevation data from pre-computed or coordinates
  const elevationData = useMemo(() => {
    let elevations: number[];
    let distances: number[];
    let totalAscent: number;
    let totalDescent: number;

    if (preElevations && preDistances) {
      elevations = preElevations;
      distances = preDistances;
      totalAscent = preTotalAscent ?? 0;
      totalDescent = preTotalDescent ?? 0;
    } else if (coordinates) {
      elevations = coordinates.map((coord, i) => {
        if (coord[2] !== undefined) return coord[2];
        return 50 + Math.sin(i * 0.1) * 30 + Math.sin(i * 0.05) * 20;
      });

      distances = [0];
      let totalDist = 0;
      for (let i = 1; i < coordinates.length; i++) {
        const [lng1, lat1] = coordinates[i - 1];
        const [lng2, lat2] = coordinates[i];
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        totalDist += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distances.push(totalDist);
      }

      totalAscent = 0;
      totalDescent = 0;
      for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1];
        if (diff > 0) totalAscent += diff;
        else totalDescent += Math.abs(diff);
      }
    } else {
      return null;
    }

    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    const range = maxElevation - minElevation || 1;
    const totalDistance = distances[distances.length - 1] || 1;

    return {
      elevations,
      distances,
      totalDistance,
      minElevation,
      maxElevation,
      range,
      totalAscent,
      totalDescent,
    };
  }, [preElevations, preDistances, preTotalAscent, preTotalDescent, coordinates]);

  // Generate SVG line path (no area fill)
  const svgLinePath = useMemo(() => {
    if (!elevationData || elevationData.elevations.length < 2) return "";

    const points = elevationData.elevations.map((elev, i) => {
      const x = (elevationData.distances[i] / elevationData.totalDistance) * 100;
      const y = 100 - ((elev - elevationData.minElevation) / elevationData.range) * 80;
      return `${x},${y}`;
    });

    return `M${points[0]} L${points.join(" L")}`;
  }, [elevationData]);

  // Key points: start, end, highest, lowest (inline mode only)
  const keyPoints = useMemo(() => {
    if (isFloating) return [];
    if (!elevationData || elevationData.elevations.length < 2) return [];
    const { elevations, distances, totalDistance, minElevation, range } = elevationData;

    const toSvg = (i: number) => ({
      x: (distances[i] / totalDistance) * 100,
      y: 100 - ((elevations[i] - minElevation) / range) * 80,
      elevation: Math.round(elevations[i]),
    });

    const endIdx = elevations.length - 1;
    let maxIdx = 0;
    let minIdx = 0;
    for (let i = 1; i < elevations.length; i++) {
      if (elevations[i] > elevations[maxIdx]) maxIdx = i;
      if (elevations[i] < elevations[minIdx]) minIdx = i;
    }

    const points: Array<{
      x: number;
      y: number;
      elevation: number;
      labelPosition: "above" | "below";
    }> = [];

    points.push({ ...toSvg(0), labelPosition: "above" });
    if (maxIdx !== 0 && maxIdx !== endIdx) {
      points.push({ ...toSvg(maxIdx), labelPosition: "above" });
    }
    if (minIdx !== 0 && minIdx !== endIdx && minIdx !== maxIdx) {
      points.push({ ...toSvg(minIdx), labelPosition: "below" });
    }
    points.push({ ...toSvg(endIdx), labelPosition: "above" });

    return points;
  }, [elevationData, isFloating]);

  // Inline-mode waypoint markers
  const waypointMarkers = useMemo(() => {
    if (isFloating) return [];
    if (!elevationData || !waypoints || waypoints.length === 0) return [];
    const { totalDistance, minElevation, range } = elevationData;

    return waypoints
      .filter((wp) => wp.elevation !== undefined)
      .map((wp) => {
        const x = Math.min(Math.max((wp.distanceFromStart / totalDistance) * 100, 1), 99);
        const y = 100 - ((wp.elevation! - minElevation) / range) * 80;
        return { ...wp, x, y };
      });
  }, [elevationData, waypoints, isFloating]);

  // Inline-mode hazard markers
  const hazardMarkers = useMemo(() => {
    if (isFloating) return [];
    if (!elevationData || !hazards || hazards.length === 0) return [];
    const { totalDistance, minElevation, range } = elevationData;

    return hazards
      .filter((h) => h.elevation !== undefined)
      .map((h) => {
        const x = Math.min(Math.max((h.distanceFromStart / totalDistance) * 100, 1), 99);
        const y = 100 - ((h.elevation! - minElevation) / range) * 80;
        return { ...h, x, y };
      });
  }, [elevationData, hazards, isFloating]);

  // Floating-mode markers with stagger
  const floatingMarkers = useMemo(() => {
    if (!isFloating || !elevationData) return [];
    const { totalDistance, minElevation, range } = elevationData;

    type FloatingMarker = {
      id: string;
      markerType: "waypoint" | "hazard";
      xPercent: number;
      yOnLine: number;
      label: string;
      color: string;
      bgColor: string;
      tier: number;
      originalIndex: number;
      waypointType?: "start" | "waypoint" | "finish";
    };

    const all: FloatingMarker[] = [];

    (waypointItems || []).forEach((wp, i) => {
      if (wp.elevation === undefined) return;
      const x = Math.min(Math.max((wp.distanceFromStart / totalDistance) * 100, 1), 99);
      const y = 100 - ((wp.elevation - minElevation) / range) * 80;
      const label =
        wp.type === "start" ? "A" :
        wp.type === "finish" ? "B" :
        `${(wp.listIndex ?? i) + 1}`;
      const bgColor =
        wp.type === "start" ? "bg-green-500" :
        wp.type === "finish" ? "bg-red-500" :
        "bg-blue-500";
      all.push({
        id: wp.id,
        markerType: "waypoint",
        xPercent: x,
        yOnLine: y,
        label,
        color: wp.type === "start" ? "#22C55E" : wp.type === "finish" ? "#EF4444" : "#3B82F6",
        bgColor,
        tier: 0,
        originalIndex: i,
        waypointType: wp.type,
      });
    });

    (hazardItems || []).forEach((h, i) => {
      if (h.elevation === undefined) return;
      const x = Math.min(Math.max((h.distanceFromStart / totalDistance) * 100, 1), 99);
      const y = 100 - ((h.elevation - minElevation) / range) * 80;
      all.push({
        id: h.id,
        markerType: "hazard",
        xPercent: x,
        yOnLine: y,
        label: "!",
        color: "#F59E0B",
        bgColor: "bg-amber-500",
        tier: 0,
        originalIndex: i,
      });
    });

    // Sort by x position
    all.sort((a, b) => a.xPercent - b.xPercent);

    // Assign stagger tiers (max 2)
    const OVERLAP_THRESHOLD = 5;
    for (let i = 1; i < all.length; i++) {
      if (all[i].xPercent - all[i - 1].xPercent < OVERLAP_THRESHOLD) {
        all[i].tier = Math.min((all[i - 1].tier || 0) + 1, 2);
      } else {
        all[i].tier = 0;
      }
    }

    return all;
  }, [isFloating, elevationData, waypointItems, hazardItems]);

  if (!elevationData) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !elevationData) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const targetDist = x * elevationData.totalDistance;

    const dists = elevationData.distances;
    let lo = 0;
    let hi = dists.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (dists[mid] < targetDist) lo = mid + 1;
      else hi = mid;
    }
    let idx = lo;
    if (idx > 0 && Math.abs(dists[idx - 1] - targetDist) < Math.abs(dists[idx] - targetDist)) {
      idx = idx - 1;
    }

    setHoverIndex(idx);
    if (coordinates && coordinates[idx]) {
      onHover?.(idx, { lat: coordinates[idx][1], lng: coordinates[idx][0] });
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    onHover?.(null, null);
  };

  const activeIndex = highlightIndex ?? hoverIndex;
  const activeElevation = activeIndex !== null ? elevationData.elevations[activeIndex] : null;
  const activeDistance = activeIndex !== null ? elevationData.distances[activeIndex] : null;

  const yMin = elevationData.minElevation;
  const yMax = elevationData.maxElevation;
  const yMid = Math.round((yMin + yMax) / 2);

  return (
    <div className={cn("bg-white rounded-lg border p-3", className)}>
      <div className="flex gap-1">
        {/* Y-axis */}
        <div className={cn(
          "flex flex-col justify-end text-[10px] text-slate-400 pr-1 w-10 text-right flex-shrink-0",
          isFloating && "pb-0.5"
        )}>
          {isFloating && <div className="h-10 flex-shrink-0" />}
          <div className="flex flex-col justify-between flex-1 py-0.5">
            <span>{Math.round(yMax)}m</span>
            <span>{yMid}m</span>
            <span>{Math.round(yMin)}m</span>
          </div>
        </div>

        {/* Chart + markers column */}
        <div className="flex-1 flex flex-col">
          {/* Floating markers gutter */}
          {isFloating && (
            <div className="relative h-10 flex-shrink-0">
              {floatingMarkers.map((m, i) => (
                <div
                  key={`fm-${m.id}-${i}`}
                  className="absolute z-10"
                  style={{
                    left: `${m.xPercent}%`,
                    bottom: `${m.tier * 20}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {m.markerType === "waypoint" ? (
                    <button
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-110",
                        m.bgColor
                      )}
                      onClick={() => onWaypointClick?.(m.originalIndex)}
                    >
                      {m.label}
                    </button>
                  ) : (
                    <button
                      className="w-5 h-5 text-amber-500 drop-shadow transition-transform hover:scale-110"
                      onClick={() => onHazardClick?.(m.originalIndex)}
                    >
                      <svg viewBox="0 0 20 20" className="w-full h-full">
                        <path d="M10 2L1 18h18L10 2z" fill="currentColor" stroke="white" strokeWidth="1.5" />
                        <text x="10" y="15" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">!</text>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Chart area */}
          <div
            ref={containerRef}
            className={cn(
              "relative flex-1 cursor-crosshair",
              isFloating ? "h-40" : "h-28"
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              {/* Dotted drop-lines for floating markers */}
              {isFloating && floatingMarkers.map((m, i) => (
                <line
                  key={`drop-${i}`}
                  x1={m.xPercent}
                  y1="0"
                  x2={m.xPercent}
                  y2={m.yOnLine}
                  stroke={m.color}
                  strokeWidth="0.4"
                  strokeDasharray="1,1.5"
                  opacity="0.5"
                />
              ))}

              {/* Line path (no fill) */}
              <path
                d={svgLinePath}
                fill="none"
                stroke="#16A34A"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Hover line */}
              {activeIndex !== null && (
                <line
                  x1={(elevationData.distances[activeIndex] / elevationData.totalDistance) * 100}
                  y1="0"
                  x2={(elevationData.distances[activeIndex] / elevationData.totalDistance) * 100}
                  y2="100"
                  stroke="#16A34A"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              )}

              {/* Small dots at drop-line intersection points */}
              {isFloating && floatingMarkers.map((m, i) => (
                <circle
                  key={`dot-${i}`}
                  cx={m.xPercent}
                  cy={m.yOnLine}
                  r="0.8"
                  fill={m.color}
                  opacity="0.7"
                />
              ))}
            </svg>

            {/* Key-point markers (inline mode only) */}
            {!isFloating && keyPoints.map((pt, i) => (
              <div
                key={`kp-${i}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-green-600" />
                <div
                  className="absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-700 whitespace-nowrap"
                  style={{
                    [pt.labelPosition === "below" ? "top" : "bottom"]: "100%",
                    marginTop: pt.labelPosition === "below" ? "2px" : undefined,
                    marginBottom: pt.labelPosition === "above" ? "2px" : undefined,
                  }}
                >
                  {pt.elevation}m
                </div>
              </div>
            ))}

            {/* Inline waypoint markers */}
            {!isFloating && waypointMarkers.map((wp, i) => (
              <div
                key={`wp-${i}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${wp.x}%`,
                  top: `${wp.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 text-[9px] font-medium text-blue-700 whitespace-nowrap bg-white/90 px-1 rounded">
                  {wp.name}
                </div>
              </div>
            ))}

            {/* Inline hazard markers */}
            {!isFloating && hazardMarkers.map((h, i) => (
              <div
                key={`hz-${i}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${h.x}%`,
                  top: `${h.y}%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="w-4 h-4 text-amber-500 drop-shadow">
                  <svg viewBox="0 0 20 20" className="w-full h-full">
                    <path d="M10 2L1 18h18L10 2z" fill="currentColor" stroke="white" strokeWidth="1.5" />
                    <text x="10" y="15" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">!</text>
                  </svg>
                </div>
              </div>
            ))}

            {/* Hover point */}
            {activeIndex !== null && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${(elevationData.distances[activeIndex] / elevationData.totalDistance) * 100}%`,
                  top: `${100 - ((elevationData.elevations[activeIndex] - elevationData.minElevation) / elevationData.range) * 80}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="w-3 h-3 rounded-full bg-green-600 border-2 border-white shadow" />
              </div>
            )}

            {/* Hover tooltip */}
            {activeIndex !== null && activeElevation !== null && activeDistance !== null && (
              <div
                className="absolute top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10"
                style={{
                  left: `${Math.min(Math.max((elevationData.distances[activeIndex] / elevationData.totalDistance) * 100, 10), 90)}%`,
                  transform: "translateX(-50%)",
                }}
              >
                <div>{Math.round(activeElevation)}m</div>
                <div className="text-gray-400">{activeDistance.toFixed(2)} km</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-[10px] text-slate-400 mt-1 ml-11">
        <span>0</span>
        <span>{(distanceKm / 4).toFixed(1)}</span>
        <span>{(distanceKm / 2).toFixed(1)}</span>
        <span>{((distanceKm * 3) / 4).toFixed(1)}</span>
        <span>{distanceKm.toFixed(1)} km</span>
      </div>
    </div>
  );
}
