"use client";

import { useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

// SVG coordinate padding — gives curves room to overshoot without clipping
const SVG_Y_TOP = 8;
const SVG_Y_BOTTOM = 85;
const SVG_Y_RANGE = SVG_Y_BOTTOM - SVG_Y_TOP;

// Map elevation to padded SVG y coordinate
function elevToY(elev: number, minElev: number, range: number): number {
  return SVG_Y_BOTTOM - ((elev - minElev) / range) * SVG_Y_RANGE;
}

// Catmull-Rom spline → cubic Bezier SVG path
function catmullRomToSvg(
  points: { x: number; y: number }[],
  tension = 0.3
): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

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
  const [hoverData, setHoverData] = useState<{
    xPercent: number;
    yPercent: number;
    elevation: number;
    distance: number;
    index: number;
  } | null>(null);
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

  // Generate smooth Catmull-Rom spline SVG path
  const svgPoints = useMemo(() => {
    if (!elevationData || elevationData.elevations.length < 2) return [];
    return elevationData.elevations.map((elev, i) => ({
      x: (elevationData.distances[i] / elevationData.totalDistance) * 400,
      y: elevToY(elev, elevationData.minElevation, elevationData.range),
    }));
  }, [elevationData]);

  const svgLinePath = useMemo(() => {
    if (svgPoints.length < 2) return "";
    return catmullRomToSvg(svgPoints);
  }, [svgPoints]);

  // Generate SVG area fill path (gradient below line, stops partway)
  const svgAreaPath = useMemo(() => {
    if (svgPoints.length < 2) return "";
    // Area extends from the line down to 95 (leaving some space above 100)
    const areaBottom = 95;
    const curvePath = catmullRomToSvg(svgPoints);
    const lastPt = svgPoints[svgPoints.length - 1];
    const firstPt = svgPoints[0];
    return `${curvePath} L${lastPt.x},${areaBottom} L${firstPt.x},${areaBottom} Z`;
  }, [svgPoints]);

  // Key points: start, end, highest, lowest (inline mode only)
  const keyPoints = useMemo(() => {
    if (isFloating) return [];
    if (!elevationData || elevationData.elevations.length < 2) return [];
    const { elevations, distances, totalDistance, minElevation, range } = elevationData;

    const toSvg = (i: number) => ({
      x: (distances[i] / totalDistance) * 100,
      y: elevToY(elevations[i], minElevation, range),
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
        const y = elevToY(wp.elevation!, minElevation, range);
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
        const y = elevToY(h.elevation!, minElevation, range);
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
      // Force Start to 0%, Finish to 100%, others use GPS-based position
      let x: number;
      if (wp.type === "start") {
        x = 0;
      } else if (wp.type === "finish") {
        x = 100;
      } else {
        x = Math.min(Math.max((wp.distanceFromStart / totalDistance) * 100, 1), 99);
      }
      const y = elevToY(wp.elevation, minElevation, range);
      const label =
        wp.type === "start" ? "S" :
        wp.type === "finish" ? "F" :
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
      // Hazards use GPS-based position, but clamp to 0.5%-99.5% to avoid edge overlap
      const x = Math.min(Math.max((h.distanceFromStart / totalDistance) * 100, 0.5), 99.5);
      const y = elevToY(h.elevation, minElevation, range);
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
    const xFrac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetDist = xFrac * elevationData.totalDistance;

    const dists = elevationData.distances;
    const elevs = elevationData.elevations;

    // Find surrounding indices for interpolation
    let hi = 1;
    while (hi < dists.length - 1 && dists[hi] < targetDist) hi++;
    const lo = hi - 1;

    // Linearly interpolate between the two surrounding points
    const segLen = dists[hi] - dists[lo];
    const t = segLen > 0 ? (targetDist - dists[lo]) / segLen : 0;
    const interpElev = elevs[lo] + t * (elevs[hi] - elevs[lo]);
    const interpY = elevToY(interpElev, elevationData.minElevation, elevationData.range);

    // Nearest index for callback
    const nearIdx = Math.abs(dists[lo] - targetDist) <= Math.abs(dists[hi] - targetDist) ? lo : hi;

    setHoverData({
      xPercent: xFrac * 100,
      yPercent: interpY,
      elevation: interpElev,
      distance: targetDist,
      index: nearIdx,
    });

    if (coordinates && coordinates[nearIdx]) {
      onHover?.(nearIdx, { lat: coordinates[nearIdx][1], lng: coordinates[nearIdx][0] });
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
    onHover?.(null, null);
  };

  // Highlight from external prop falls back to discrete index positioning
  const externalHighlight = highlightIndex !== null && highlightIndex !== undefined ? {
    xPercent: (elevationData.distances[highlightIndex] / elevationData.totalDistance) * 100,
    yPercent: elevToY(elevationData.elevations[highlightIndex], elevationData.minElevation, elevationData.range),
    elevation: elevationData.elevations[highlightIndex],
    distance: elevationData.distances[highlightIndex],
    index: highlightIndex,
  } : null;

  const active = externalHighlight ?? hoverData;

  return (
    <div className={cn("rounded-lg p-3 flex flex-col overflow-hidden", className)}>
      <div className="flex flex-1 min-h-0">
        {/* Chart + markers column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Floating markers gutter (always present for layout consistency) */}
          <div className="relative h-14 flex-shrink-0 overflow-visible">
            {isFloating && floatingMarkers.map((m, i) => (
                <div
                  key={`fm-${m.id}-${i}`}
                  className="absolute z-10"
                  style={{
                    left: `${m.xPercent}%`,
                    bottom: `${m.tier * 22}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {m.markerType === "waypoint" ? (
                    <button
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shadow-sm transition-transform hover:scale-110",
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

          {/* Chart area */}
          <div
            ref={containerRef}
            className="relative flex-1 cursor-crosshair"
            style={{ minHeight: 180 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <svg
              viewBox="0 0 400 100"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <defs>
                <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#267347" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#267347" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#267347" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Area fill (Komoot-style soft gradient) */}
              <path
                d={svgAreaPath}
                fill="url(#elevationGradient)"
              />

              {/* Dotted drop-lines for floating markers (full height) */}
              {isFloating && floatingMarkers.map((m, i) => (
                <line
                  key={`drop-${i}`}
                  x1={m.xPercent * 4}
                  y1="0"
                  x2={m.xPercent * 4}
                  y2="100"
                  stroke={m.color}
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                  opacity="0.65"
                />
              ))}

              {/* Elevation line */}
              <path
                d={svgLinePath}
                fill="none"
                stroke="#267347"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* Hover line */}
              {active && (
                <line
                  x1={active.xPercent * 4}
                  y1="0"
                  x2={active.xPercent * 4}
                  y2="100"
                  stroke="#267347"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              )}

              {/* Small dots at drop-line intersection points */}
              {isFloating && floatingMarkers.map((m, i) => (
                <circle
                  key={`dot-${i}`}
                  cx={m.xPercent * 4}
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
                <div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-[#267347]" />
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
            {active && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${active.xPercent}%`,
                  top: `${active.yPercent}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="w-3 h-3 rounded-full bg-[#267347] border-2 border-white shadow" />
              </div>
            )}

            {/* Hover tooltip */}
            {active && (
              <div
                className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10"
                style={{
                  left: `${Math.min(Math.max(active.xPercent, 8), 92)}%`,
                  top: `${Math.max(active.yPercent - 2, 0)}%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div>{Math.round(active.elevation)}m</div>
                <div className="text-gray-400">{active.distance.toFixed(2)} km</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-[9px] text-slate-400 font-light mt-1 flex-shrink-0">
        <span>0</span>
        <span>{(distanceKm / 4).toFixed(1)}</span>
        <span>{(distanceKm / 2).toFixed(1)}</span>
        <span>{((distanceKm * 3) / 4).toFixed(1)}</span>
        <span>{distanceKm.toFixed(1)} km</span>
      </div>
    </div>
  );
}
