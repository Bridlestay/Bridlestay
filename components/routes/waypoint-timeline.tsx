"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronRight, ImageIcon } from "lucide-react";

const TAG_CONFIG: Record<string, { label: string; className: string }> = {
  instruction: { label: "Instruction", className: "bg-blue-100 text-blue-700 border-blue-200" },
  poi: { label: "POI", className: "bg-purple-100 text-purple-700 border-purple-200" },
  caution: { label: "Caution", className: "bg-amber-100 text-amber-700 border-amber-200" },
};

interface WaypointTimelineProps {
  fullWaypointList: any[];
  waypointElevationMap: Record<string, number>;
  onFlyToLocation?: (lat: number, lng: number) => void;
  onOpenFullPanel?: () => void;
}

export function WaypointTimeline({
  fullWaypointList,
  waypointElevationMap,
  onFlyToLocation,
  onOpenFullPanel,
}: WaypointTimelineProps) {
  if (fullWaypointList.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
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

      {/* Timeline */}
      <div className="relative">
        {fullWaypointList.map((wp: any, index: number) => {
          const isStart = wp.type === "start";
          const isFinish = wp.type === "finish";
          const isWaypoint = wp.type === "waypoint";

          const circleLabel = isStart
            ? "S"
            : isFinish
            ? "F"
            : `${(wp.listIndex ?? index) + 1}`;

          const circleColor = isStart
            ? "bg-green-500"
            : isFinish
            ? "bg-red-500"
            : "bg-slate-800";

          const elevation = waypointElevationMap[wp.id];
          const distPrev = wp._distFromPrev;
          const hasPhotos =
            wp.photo_url ||
            (wp.community_photos && wp.community_photos.length > 0);
          const totalPhotos =
            (wp.photo_url ? 1 : 0) + (wp.photo_count || 0);

          return (
            <div key={wp.id} id={`waypoint-timeline-${wp.id}`}>
              {/* Distance connector between entries */}
              {index > 0 && distPrev > 0 && (
                <div className="flex items-center ml-[13px] py-0.5">
                  <div className="w-px h-5 border-l-2 border-dotted border-slate-300" />
                  <span className="text-[10px] text-slate-400 ml-2.5">
                    {distPrev < 1
                      ? `${Math.round(distPrev * 1000)}m`
                      : `${distPrev.toFixed(1)} km`}
                  </span>
                </div>
              )}

              {/* Waypoint entry */}
              <button
                className="group flex items-start gap-3 w-full py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                onClick={() => {
                  if (wp.lat && wp.lng && onFlyToLocation)
                    onFlyToLocation(wp.lat, wp.lng);
                }}
              >
                {/* Numbered circle with hover effect */}
                <div
                  className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm transition-all duration-200",
                    "group-hover:bg-green-500 group-hover:scale-110",
                    circleColor
                  )}
                >
                  {circleLabel}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {wp.name ||
                        (isStart
                          ? "Start"
                          : isFinish
                          ? "Finish"
                          : `Waypoint ${(wp.listIndex || 0) + 1}`)}
                    </span>
                    {wp.tag &&
                      wp.tag !== "note" &&
                      TAG_CONFIG[wp.tag] && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] h-4 px-1.5",
                            TAG_CONFIG[wp.tag].className
                          )}
                        >
                          {TAG_CONFIG[wp.tag].label}
                        </Badge>
                      )}
                    {wp.icon_type && wp.icon_type !== "other" && (
                      <span className="text-[10px] text-slate-400 capitalize">
                        {wp.icon_type}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {wp.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {wp.description}
                    </p>
                  )}

                  {/* Photo preview row */}
                  {hasPhotos && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {wp.photo_url && (
                        <div className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0 bg-slate-100">
                          <Image
                            src={wp.photo_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      )}
                      {wp.community_photos
                        ?.slice(0, 2)
                        .map((p: any) => (
                          <div
                            key={p.id}
                            className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0 bg-slate-100"
                          >
                            <Image
                              src={p.url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        ))}
                      {totalPhotos > 3 && (
                        <div className="flex items-center gap-0.5 text-[10px] text-slate-400">
                          <ImageIcon className="h-3 w-3" />
                          {totalPhotos}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Elevation on right */}
                {elevation !== undefined && (
                  <span className="text-xs text-slate-400 pt-1 flex-shrink-0 tabular-nums">
                    {Math.round(elevation)}m
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
