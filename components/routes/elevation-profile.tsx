"use client";

import { useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Mountain } from "lucide-react";

interface ElevationProfileProps {
  coordinates: [number, number, number?][]; // [lng, lat, elevation?]
  distanceKm: number;
  className?: string;
  onHover?: (index: number | null, position: { lat: number; lng: number } | null) => void;
  highlightIndex?: number | null;
}

export function ElevationProfile({
  coordinates,
  distanceKm,
  className,
  onHover,
  highlightIndex,
}: ElevationProfileProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate elevation data
  const elevationData = useMemo(() => {
    // Extract elevations or generate mock data based on position
    const elevations = coordinates.map((coord, i) => {
      if (coord[2] !== undefined) return coord[2];
      // Generate mock elevation based on lat/lng for demo
      return 50 + Math.sin(i * 0.1) * 30 + Math.sin(i * 0.05) * 20;
    });

    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    const range = maxElevation - minElevation || 1;

    // Calculate cumulative distances
    const distances: number[] = [0];
    let totalDist = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const [lng1, lat1] = coordinates[i - 1];
      const [lng2, lat2] = coordinates[i];
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDist += R * c;
      distances.push(totalDist);
    }

    // Calculate total ascent/descent
    let totalAscent = 0;
    let totalDescent = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) totalAscent += diff;
      else totalDescent += Math.abs(diff);
    }

    return {
      elevations,
      distances,
      totalDistance: totalDist,
      minElevation,
      maxElevation,
      range,
      totalAscent,
      totalDescent,
    };
  }, [coordinates]);

  // Generate SVG path
  const svgPath = useMemo(() => {
    if (elevationData.elevations.length < 2) return "";

    const points = elevationData.elevations.map((elev, i) => {
      const x = (elevationData.distances[i] / elevationData.totalDistance) * 100;
      const y = 100 - ((elev - elevationData.minElevation) / elevationData.range) * 80;
      return `${x},${y}`;
    });

    return `M${points[0]} L${points.join(" L")} L100,100 L0,100 Z`;
  }, [elevationData]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const idx = Math.min(
      Math.floor(x * coordinates.length),
      coordinates.length - 1
    );
    
    setHoverIndex(idx);
    onHover?.(idx, { lat: coordinates[idx][1], lng: coordinates[idx][0] });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    onHover?.(null, null);
  };

  const activeIndex = highlightIndex ?? hoverIndex;
  const activeElevation = activeIndex !== null ? elevationData.elevations[activeIndex] : null;
  const activeDistance = activeIndex !== null ? elevationData.distances[activeIndex] : null;

  return (
    <div className={cn("bg-white rounded-lg border p-4", className)}>
      {/* Stats header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Mountain className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Elevation Profile</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-600" />
            {Math.round(elevationData.totalAscent)}m
          </span>
          <span className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-red-600" />
            {Math.round(elevationData.totalDescent)}m
          </span>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="relative h-32 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* SVG chart */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Gradient fill */}
          <defs>
            <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d={svgPath}
            fill="url(#elevationGradient)"
            stroke="#3B82F6"
            strokeWidth="0.5"
          />

          {/* Hover line */}
          {activeIndex !== null && (
            <line
              x1={(elevationData.distances[activeIndex] / elevationData.totalDistance) * 100}
              y1="0"
              x2={(elevationData.distances[activeIndex] / elevationData.totalDistance) * 100}
              y2="100"
              stroke="#3B82F6"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          )}

          {/* Hover point */}
          {activeIndex !== null && (
            <circle
              cx={(elevationData.distances[activeIndex] / elevationData.totalDistance) * 100}
              cy={100 - ((elevationData.elevations[activeIndex] - elevationData.minElevation) / elevationData.range) * 80}
              r="2"
              fill="#3B82F6"
              stroke="white"
              strokeWidth="1"
            />
          )}
        </svg>

        {/* Hover tooltip */}
        {activeIndex !== null && activeElevation !== null && activeDistance !== null && (
          <div
            className="absolute top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10"
            style={{
              left: `${(elevationData.distances[activeIndex] / elevationData.totalDistance) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div>{Math.round(activeElevation)}m</div>
            <div className="text-gray-400">{activeDistance.toFixed(1)} km</div>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>0 km</span>
        <span>{(distanceKm / 2).toFixed(1)} km</span>
        <span>{distanceKm.toFixed(1)} km</span>
      </div>

      {/* Y-axis labels */}
      <div className="absolute right-6 top-12 bottom-20 flex flex-col justify-between text-xs text-gray-400">
        <span>{Math.round(elevationData.maxElevation)}m</span>
        <span>{Math.round(elevationData.minElevation)}m</span>
      </div>
    </div>
  );
}

