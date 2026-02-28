"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Map,
  TrendingUp,
  MapPin,
  AlertTriangle,
  Cloud,
  ChevronRight,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ElevationProfile } from "./elevation-profile";
import { RouteWeatherSection } from "./route-weather-section";
import { getMapboxThumbnailUrl } from "@/lib/routes/route-thumbnail";
import {
  HAZARD_TYPES,
  WARNING_TYPES,
  SEVERITY_COLORS,
  getTimeRemaining,
} from "./route-detail-constants";
import type { WeatherData } from "@/lib/weather";

interface RouteDetailTabsProps {
  route: any;
  elevationData: {
    elevations: number[];
    distances: number[];
    totalAscent: number;
    totalDescent: number;
  } | null;
  loadingElevation: boolean;
  weatherData: WeatherData | null;
  loadingWeather: boolean;
  fullWaypointList: any[];
  waypointElevationMap: Record<string, number>;
  waypoints: any[];
  activeHazards: any[];
  activeWarnings: any[];
  showAllWarnings: boolean;
  onShowAllWarningsChange: (show: boolean) => void;
  userVotedWarnings: Set<string>;
  userId?: string;
  onVoteClearWarning: (warningId: string) => void;
  onViewAllWaypoints: () => void;
  onEnterViewMode?: (mode: "waypoints" | "hazards") => void;
  onPlaceHazard?: () => void;
  onPostWarning: () => void;
  onFlyToLocation?: (lat: number, lng: number) => void;
  onDismiss?: () => void;
}

export function RouteDetailTabs({
  route,
  elevationData,
  loadingElevation,
  weatherData,
  loadingWeather,
  fullWaypointList,
  waypointElevationMap,
  waypoints,
  activeHazards,
  activeWarnings,
  showAllWarnings,
  onShowAllWarningsChange,
  userVotedWarnings,
  userId,
  onVoteClearWarning,
  onViewAllWaypoints,
  onEnterViewMode,
  onPlaceHazard,
  onPostWarning,
  onFlyToLocation,
}: RouteDetailTabsProps) {
  const geo = route?.geometry || route?.route_geometry;

  return (
    <Tabs defaultValue="elevation" className="w-full">
      <TabsList className="w-full h-auto p-1 bg-slate-100 rounded-lg overflow-x-auto scrollbar-hidden flex gap-0.5">
        {/* Map — mobile only */}
        <TabsTrigger
          value="map"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md md:hidden"
        >
          <Map className="h-3.5 w-3.5" />
          Map
        </TabsTrigger>
        <TabsTrigger
          value="elevation"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Elevation
        </TabsTrigger>
        <TabsTrigger
          value="waypoints"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md"
        >
          <MapPin className="h-3.5 w-3.5" />
          Waypoints
          {fullWaypointList.length > 0 && (
            <span className="ml-0.5 text-[10px] bg-slate-200 data-[state=active]:bg-white/80 px-1.5 rounded-full">
              {fullWaypointList.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="hazards"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Hazards
          {activeHazards.length > 0 && (
            <span className="ml-0.5 text-[10px] bg-red-100 text-red-700 px-1.5 rounded-full font-medium">
              {activeHazards.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="warnings"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          Warnings
          {activeWarnings.length > 0 && (
            <span className="ml-0.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-full font-medium">
              {activeWarnings.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="weather"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md"
        >
          <Cloud className="h-3.5 w-3.5" />
          Weather
        </TabsTrigger>
      </TabsList>

      {/* MAP TAB (mobile only) */}
      <TabsContent value="map" className="md:hidden">
        {(() => {
          const snapshotUrl = getMapboxThumbnailUrl(geo, {
            width: 600,
            height: 260,
            routeColor: "166534",
            routeWeight: 3,
          });
          return snapshotUrl ? (
            <div className="relative w-full h-52 rounded-lg overflow-hidden bg-gray-100 border">
              <img
                src={snapshotUrl}
                alt="Route map"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-52 bg-slate-50 rounded-lg border text-sm text-muted-foreground">
              Map not available
            </div>
          );
        })()}
      </TabsContent>

      {/* ELEVATION TAB */}
      <TabsContent value="elevation">
        {loadingElevation ? (
          <Skeleton className="h-36 w-full rounded-lg" />
        ) : elevationData && elevationData.elevations.length > 1 ? (
          <ElevationProfile
            className="h-36"
            elevations={elevationData.elevations}
            distances={elevationData.distances}
            totalAscent={elevationData.totalAscent}
            totalDescent={elevationData.totalDescent}
            distanceKm={Number(route?.distance_km || 0)}
          />
        ) : (
          <div className="flex items-center justify-center h-36 bg-slate-50 rounded-lg border text-sm text-muted-foreground">
            No elevation data available
          </div>
        )}
      </TabsContent>

      {/* WAYPOINTS TAB */}
      <TabsContent value="waypoints">
        <div className="space-y-1.5">
          {fullWaypointList.length > 0 ? (
            <>
              {fullWaypointList.slice(0, 6).map((wp: any) => {
                const dotColor =
                  wp.type === "start"
                    ? "bg-green-500"
                    : wp.type === "finish"
                      ? "bg-red-500"
                      : "bg-blue-500";
                const elevation = waypointElevationMap[wp.id];

                return (
                  <button
                    key={wp.id}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    onClick={() => {
                      if (wp.lat && wp.lng && onFlyToLocation) {
                        onFlyToLocation(wp.lat, wp.lng);
                      }
                    }}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0`}
                    />
                    <span className="text-sm font-medium truncate flex-1">
                      {wp.name || `Waypoint ${(wp.listIndex || 0) + 1}`}
                    </span>
                    {elevation !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(elevation)}m
                      </span>
                    )}
                    {wp._distFromStart !== undefined && wp._distFromStart > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {wp._distFromStart < 1
                          ? `${Math.round(wp._distFromStart * 1000)}m`
                          : `${wp._distFromStart.toFixed(1)}km`}
                      </span>
                    )}
                  </button>
                );
              })}
              {fullWaypointList.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={onViewAllWaypoints}
                >
                  View all {fullWaypointList.length} waypoints
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={onViewAllWaypoints}
              >
                <MapPin className="h-3.5 w-3.5 mr-1.5" />
                View full waypoint list
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No waypoints on this route
            </div>
          )}
        </div>
      </TabsContent>

      {/* HAZARDS TAB */}
      <TabsContent value="hazards">
        <div className="space-y-2">
          {activeHazards.length > 0 ? (
            <>
              {activeHazards.map((hazard: any) => (
                <div
                  key={hazard.id}
                  className={`p-3 rounded-lg border ${SEVERITY_COLORS[hazard.severity] || SEVERITY_COLORS.medium}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {HAZARD_TYPES.find((t) => t.value === hazard.hazard_type)
                        ?.label || hazard.hazard_type}
                    </span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {hazard.severity}
                    </Badge>
                  </div>
                  {hazard.description && (
                    <p className="text-xs mt-1 opacity-80">
                      {hazard.description}
                    </p>
                  )}
                  <span className="text-[10px] opacity-60 mt-1 block">
                    {formatDistanceToNow(new Date(hazard.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              ))}
              {onEnterViewMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => onEnterViewMode("hazards")}
                >
                  View on map
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No active hazards reported
            </div>
          )}
          {onPlaceHazard && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs border-red-200 text-red-700 hover:bg-red-50"
              onClick={onPlaceHazard}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Report a hazard
            </Button>
          )}
        </div>
      </TabsContent>

      {/* WARNINGS TAB */}
      <TabsContent value="warnings">
        <div className="space-y-2">
          {activeWarnings.length > 0 ? (
            <>
              {(showAllWarnings
                ? activeWarnings
                : activeWarnings.slice(0, 3)
              ).map((warning: any) => (
                <div
                  key={warning.id}
                  className="p-3 bg-amber-50 border border-amber-300 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span className="font-medium text-sm text-amber-900 truncate">
                        {WARNING_TYPES.find(
                          (t) => t.value === warning.hazard_type
                        )?.label || warning.hazard_type}
                      </span>
                    </div>
                    {warning.expires_at && (
                      <span className="text-xs text-amber-600 whitespace-nowrap ml-2">
                        {getTimeRemaining(warning.expires_at)}
                      </span>
                    )}
                  </div>
                  {warning.description && (
                    <p className="text-xs text-amber-700 mt-1">
                      {warning.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-amber-500">
                      Reported{" "}
                      {formatDistanceToNow(new Date(warning.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      {warning.clear_votes_needed && (
                        <span className="text-xs text-amber-600">
                          {warning.clear_votes_count || 0}/
                          {warning.clear_votes_needed} say cleared
                        </span>
                      )}
                      {userId &&
                        (userVotedWarnings.has(warning.id) ||
                        warning.user_has_voted ? (
                          <Badge className="h-6 text-xs bg-green-100 text-green-700 border border-green-300 hover:bg-green-100">
                            Voted
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 px-2"
                            onClick={() => onVoteClearWarning(warning.id)}
                          >
                            Cleared?
                          </Button>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
              {activeWarnings.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-amber-700 hover:text-amber-800"
                  onClick={() => onShowAllWarningsChange(!showAllWarnings)}
                >
                  {showAllWarnings
                    ? "Show less"
                    : `Show ${activeWarnings.length - 3} more warning${activeWarnings.length - 3 > 1 ? "s" : ""}`}
                </Button>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No active warnings
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
            onClick={onPostWarning}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Post a warning
          </Button>
        </div>
      </TabsContent>

      {/* WEATHER TAB */}
      <TabsContent value="weather">
        <RouteWeatherSection
          weatherData={weatherData}
          loading={loadingWeather}
        />
      </TabsContent>
    </Tabs>
  );
}
