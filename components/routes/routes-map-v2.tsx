"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useGoogleMaps } from "@/lib/hooks/use-google-maps";
import { Loader2, AlertCircle, Info } from "lucide-react";
import type { Waypoint, RouteStyle } from "./route-creator";

// Route difficulty colors
const DIFFICULTY_COLORS = {
  unrated: "#6B7280",
  easy: "#10B981",
  moderate: "#3B82F6",
  difficult: "#F59E0B",
  severe: "#EF4444",
};

// Path type colors for public rights of way
const PATH_COLORS = {
  bridleway: "#8B4513", // Brown - horse-friendly!
  footpath: "#228B22", // Forest green
  restricted_byway: "#FF8C00", // Orange
  byway: "#9932CC", // Purple
  other: "#808080", // Gray
};

// Path layer visibility
export interface PathLayers {
  bridleways: boolean;
  boats: boolean; // boats = byways open to all traffic
  footpaths: boolean;
  permissive: boolean; // permissive = restricted byways
}

export interface RoutesMapV2Props {
  routes?: any[];
  onRouteClick?: (routeId: string) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  propertyPins?: any[];
  // Route creation props
  isCreating?: boolean;
  isPlotting?: boolean;
  snapEnabled?: boolean;
  waypoints?: Waypoint[];
  routeType?: "circular" | "linear";
  routeStyle?: RouteStyle;
  onWaypointAdd?: (lat: number, lng: number, snapped: boolean, pathType?: string) => void;
  onWaypointUpdate?: (id: string, lat: number, lng: number, snapped: boolean) => void;
  onWaypointRemove?: (id: string) => void;
  // Path layer visibility
  pathLayers?: PathLayers;
}

export interface RoutesMapV2Handle {
  getMap: () => google.maps.Map | null;
  panTo: (lat: number, lng: number) => void;
  setZoom: (zoom: number) => void;
}

export const RoutesMapV2 = forwardRef<RoutesMapV2Handle, RoutesMapV2Props>(
  (
    {
      routes = [],
      onRouteClick,
      center = { lat: 52.2, lng: -2.2 }, // Worcestershire center
      zoom = 10,
      propertyPins = [],
      isCreating = false,
      isPlotting = false,
      snapEnabled = true,
      waypoints = [],
      routeType = "linear",
      routeStyle = { color: "#3B82F6", thickness: 4, opacity: 100 },
      onWaypointAdd,
      onWaypointUpdate,
      onWaypointRemove,
      pathLayers = { bridleways: true, boats: true, footpaths: true, permissive: true },
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const routePolylinesRef = useRef<google.maps.Polyline[]>([]);
    const waypointMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
    const routeLineRef = useRef<google.maps.Polyline | null>(null);
    const propertyMarkersRef = useRef<google.maps.Marker[]>([]);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
    const snapPolylineRef = useRef<google.maps.Polyline | null>(null);
    const pathPolylinesRef = useRef<google.maps.Polyline[]>([]);
    const pathDataRef = useRef<{ path: google.maps.LatLng[]; type: string }[]>([]); // Store path data for snapping
    const [pathsLoading, setPathsLoading] = useState(false);
    const [pathsError, setPathsError] = useState<string | null>(null);
    const [pathsCount, setPathsCount] = useState(0);

    const { isLoaded, loadError } = useGoogleMaps();

    // Expose map methods
    useImperativeHandle(ref, () => ({
      getMap: () => mapRef.current,
      panTo: (lat: number, lng: number) => {
        mapRef.current?.panTo({ lat, lng });
      },
      setZoom: (zoom: number) => {
        mapRef.current?.setZoom(zoom);
      },
    }));

    // Initialize map with terrain and trails visible
    useEffect(() => {
      if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

      const map = new google.maps.Map(mapContainerRef.current, {
        center,
        zoom,
        mapTypeId: "terrain", // Shows trails and paths
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: google.maps.ControlPosition.TOP_LEFT,
          mapTypeIds: ["roadmap", "terrain", "satellite", "hybrid"],
        },
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_CENTER,
        },
        // Custom styling to highlight paths and trails
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "road.local",
            elementType: "geometry",
            stylers: [{ visibility: "on" }],
          },
          {
            featureType: "landscape.natural",
            elementType: "geometry",
            stylers: [{ saturation: -20 }],
          },
        ],
      });

      mapRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow();
      directionsServiceRef.current = new google.maps.DirectionsService();

      return () => {
        routePolylinesRef.current.forEach((p) => p.setMap(null));
        waypointMarkersRef.current.forEach((m) => m.setMap(null));
        propertyMarkersRef.current.forEach((m) => m.setMap(null));
        routeLineRef.current?.setMap(null);
        snapPolylineRef.current?.setMap(null);
        pathPolylinesRef.current.forEach((p) => p.setMap(null));
      };
    }, [isLoaded, center, zoom]);

    // Load public rights of way from JSON (Worcestershire data)
    useEffect(() => {
      if (!mapRef.current || !isLoaded) return;

      // Clean up existing path polylines
      pathPolylinesRef.current.forEach((p) => p.setMap(null));
      pathPolylinesRef.current = [];
      pathDataRef.current = []; // Clear path data for snapping
      setPathsError(null);
      setPathsCount(0);

      // Check if any path layers are enabled
      const anyLayerEnabled = pathLayers.bridleways || pathLayers.boats || 
                              pathLayers.footpaths || pathLayers.permissive;
      
      if (!anyLayerEnabled) return;

      // Load paths from JSON files
      const loadPaths = async () => {
        setPathsLoading(true);
        let totalPaths = 0;

        try {
          const filesToLoad: { file: string; type: string; color: string; enabled: boolean }[] = [
            { file: "bridleways.json", type: "bridleway", color: PATH_COLORS.bridleway, enabled: pathLayers.bridleways },
            { file: "byways.json", type: "byway", color: PATH_COLORS.byway, enabled: pathLayers.boats },
            { file: "footpaths.json", type: "footpath", color: PATH_COLORS.footpath, enabled: pathLayers.footpaths },
            { file: "restricted_byways.json", type: "restricted_byway", color: PATH_COLORS.restricted_byway, enabled: pathLayers.permissive },
          ];

          for (const { file, type, color, enabled } of filesToLoad) {
            if (!enabled) continue;

            try {
              const response = await fetch(`/kml/worcestershire/${file}`);
              if (!response.ok) continue;

              const data = await response.json();
              
              if (data.features && Array.isArray(data.features)) {
                // Draw each path as a polyline
                data.features.forEach((feature: any) => {
                  if (feature.geometry?.type !== "LineString" || !feature.geometry.coordinates) return;

                  const path = feature.geometry.coordinates.map((coord: [number, number]) => ({
                    lat: coord[1],
                    lng: coord[0],
                  }));

                  if (path.length < 2) return;

                  const polyline = new google.maps.Polyline({
                    path,
                    strokeColor: color,
                    strokeWeight: type === "bridleway" ? 3 : 2,
                    strokeOpacity: type === "bridleway" ? 0.9 : 0.7,
                    map: mapRef.current,
                    clickable: true,
                    zIndex: type === "bridleway" ? 10 : 5,
                  });

                  // Store path data for snapping (bridleways only for now)
                  if (type === "bridleway") {
                    const latLngPath = path.map((p: {lat: number, lng: number}) => 
                      new google.maps.LatLng(p.lat, p.lng)
                    );
                    pathDataRef.current.push({ path: latLngPath, type });
                  }

                  // Highlight on hover (visual feedback only)
                  polyline.addListener("mouseover", () => {
                    polyline.setOptions({ strokeWeight: 5, strokeOpacity: 1 });
                  });

                  polyline.addListener("mouseout", () => {
                    polyline.setOptions({ 
                      strokeWeight: type === "bridleway" ? 3 : 2, 
                      strokeOpacity: type === "bridleway" ? 0.9 : 0.7 
                    });
                  });

                  // Info on CLICK (not hover)
                  polyline.addListener("click", (e: google.maps.MapMouseEvent) => {
                    if (infoWindowRef.current && e.latLng) {
                      const name = feature.properties?.name || feature.properties?.pathNumber || "Unknown path";
                      const parish = feature.properties?.parish || "";
                      const content = `
                        <div style="padding: 8px; min-width: 150px; font-family: system-ui, sans-serif;">
                          <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">${name}</div>
                          <div style="font-size: 12px; color: #666;">
                            <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 2px; margin-right: 6px;"></span>
                            ${type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </div>
                          ${parish ? `<div style="font-size: 11px; color: #888; margin-top: 4px;">${parish}</div>` : ""}
                        </div>
                      `;
                      infoWindowRef.current.setContent(content);
                      infoWindowRef.current.setPosition(e.latLng);
                      infoWindowRef.current.open(mapRef.current);
                    }
                  });

                  pathPolylinesRef.current.push(polyline);
                  totalPaths++;
                });
              }
            } catch (err) {
              console.warn(`Failed to load ${file}:`, err);
            }
          }

          setPathsCount(totalPaths);
          if (totalPaths === 0) {
            setPathsError("No path data found. Make sure the JSON files are in public/kml/worcestershire/");
          }
        } catch (error) {
          console.error("Failed to load path data:", error);
          setPathsError("Failed to load path data");
        } finally {
          setPathsLoading(false);
        }
      };

      loadPaths();
    }, [isLoaded, pathLayers]);

    // Helper: Calculate distance between two points (Haversine formula in meters)
    const getDistanceMeters = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371000; // Earth's radius in meters
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }, []);

    // Helper: Find nearest point on a line segment
    const nearestPointOnSegment = useCallback((
      px: number, py: number, 
      ax: number, ay: number, 
      bx: number, by: number
    ): { x: number; y: number } => {
      const dx = bx - ax;
      const dy = by - ay;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
      return { x: ax + t * dx, y: ay + t * dy };
    }, []);

    // Snap to bridleway - finds nearest point on any loaded bridleway
    const snapToBridleway = useCallback((lat: number, lng: number): { lat: number; lng: number; snapped: boolean; pathType?: string } => {
      const SNAP_THRESHOLD_METERS = 50; // Snap if within 50 meters of a bridleway
      
      let nearestDist = Infinity;
      let nearestPoint = { lat, lng };
      let snapped = false;

      for (const { path, type } of pathDataRef.current) {
        // Check each segment of the path
        for (let i = 0; i < path.length - 1; i++) {
          const a = path[i];
          const b = path[i + 1];
          
          // Find nearest point on this segment
          const nearest = nearestPointOnSegment(
            lng, lat,
            a.lng(), a.lat(),
            b.lng(), b.lat()
          );
          
          const dist = getDistanceMeters(lat, lng, nearest.y, nearest.x);
          
          if (dist < nearestDist && dist < SNAP_THRESHOLD_METERS) {
            nearestDist = dist;
            nearestPoint = { lat: nearest.y, lng: nearest.x };
            snapped = true;
          }
        }
      }

      return { ...nearestPoint, snapped, pathType: snapped ? "bridleway" : undefined };
    }, [getDistanceMeters, nearestPointOnSegment]);

    // Snap to roads using Google's Roads API / Directions (fallback if not near bridleway)
    const snapToRoad = useCallback(async (lat: number, lng: number): Promise<{lat: number, lng: number, snapped: boolean, pathType?: string}> => {
      if (!snapEnabled) {
        return { lat, lng, snapped: false };
      }

      // First, try to snap to bridleway
      const bridlewaySnap = snapToBridleway(lat, lng);
      if (bridlewaySnap.snapped) {
        return bridlewaySnap;
      }

      // If not near a bridleway and we have waypoints, try Google Directions
      if (!directionsServiceRef.current || waypoints.length === 0) {
        return { lat, lng, snapped: false };
      }

      try {
        // Use directions to snap to the road network
        const lastWaypoint = waypoints[waypoints.length - 1];
        
        const result = await new Promise<google.maps.DirectionsResult | null>((resolve) => {
          directionsServiceRef.current!.route(
            {
              origin: { lat: lastWaypoint.lat, lng: lastWaypoint.lng },
              destination: { lat, lng },
              travelMode: google.maps.TravelMode.WALKING, // Walking includes trails/paths
            },
            (result, status) => {
              if (status === google.maps.DirectionsStatus.OK) {
                resolve(result);
              } else {
                resolve(null);
              }
            }
          );
        });

        if (result && result.routes[0]?.legs[0]?.end_location) {
          const endLoc = result.routes[0].legs[0].end_location;
          return {
            lat: endLoc.lat(),
            lng: endLoc.lng(),
            snapped: true,
            pathType: "road",
          };
        }
      } catch (error) {
        console.error("Snap to road failed:", error);
      }

      return { lat, lng, snapped: false };
    }, [snapEnabled, waypoints, snapToBridleway]);

    // Handle map clicks for route creation
    useEffect(() => {
      if (!mapRef.current || !isLoaded) return;

      const clickListener = mapRef.current.addListener(
        "click",
        async (e: google.maps.MapMouseEvent) => {
          if (!isCreating || !isPlotting || !e.latLng) return;

          const lat = e.latLng.lat();
          const lng = e.latLng.lng();

          if (snapEnabled && waypoints.length > 0) {
            // Try to snap to road/path
            const snapped = await snapToRoad(lat, lng);
            onWaypointAdd?.(snapped.lat, snapped.lng, snapped.snapped, snapped.snapped ? "road" : undefined);
          } else {
            onWaypointAdd?.(lat, lng, false);
          }
        }
      );

      return () => {
        google.maps.event.removeListener(clickListener);
      };
    }, [isLoaded, isCreating, isPlotting, snapEnabled, onWaypointAdd, waypoints, snapToRoad]);

    // Helper: Find path along bridleway between two points
    const findBridlewayPath = useCallback((
      fromLat: number, fromLng: number, 
      toLat: number, toLng: number
    ): google.maps.LatLng[] => {
      const SEARCH_RADIUS_METERS = 100;
      let bestPath: google.maps.LatLng[] = [];
      let bestDist = Infinity;

      // Look for bridleway segments that connect these points
      for (const { path } of pathDataRef.current) {
        // Find indices of path points closest to from/to
        let fromIdx = -1;
        let toIdx = -1;
        let fromDist = Infinity;
        let toDist = Infinity;

        for (let i = 0; i < path.length; i++) {
          const p = path[i];
          const dFrom = getDistanceMeters(fromLat, fromLng, p.lat(), p.lng());
          const dTo = getDistanceMeters(toLat, toLng, p.lat(), p.lng());
          
          if (dFrom < fromDist && dFrom < SEARCH_RADIUS_METERS) {
            fromDist = dFrom;
            fromIdx = i;
          }
          if (dTo < toDist && dTo < SEARCH_RADIUS_METERS) {
            toDist = dTo;
            toIdx = i;
          }
        }

        // If both points are near this bridleway, extract the path segment
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          const start = Math.min(fromIdx, toIdx);
          const end = Math.max(fromIdx, toIdx);
          const segment = path.slice(start, end + 1);
          
          // Reverse if needed
          if (fromIdx > toIdx) {
            segment.reverse();
          }

          // Calculate total distance of this segment
          let segmentDist = 0;
          for (let i = 0; i < segment.length - 1; i++) {
            segmentDist += getDistanceMeters(
              segment[i].lat(), segment[i].lng(),
              segment[i + 1].lat(), segment[i + 1].lng()
            );
          }

          if (segmentDist < bestDist) {
            bestDist = segmentDist;
            bestPath = segment;
          }
        }
      }

      return bestPath;
    }, [getDistanceMeters]);

    // Draw route line between waypoints - ALWAYS draws at minimum a straight line
    useEffect(() => {
      if (!mapRef.current || !isLoaded || !isCreating) return;
      
      snapPolylineRef.current?.setMap(null);
      routeLineRef.current?.setMap(null);
      
      if (waypoints.length < 2) return;

      // Build the full path, trying to follow bridleways
      const buildRoutePath = () => {
        const fullPath: google.maps.LatLng[] = [];
        
        for (let i = 0; i < waypoints.length - 1; i++) {
          const from = waypoints[i];
          const to = waypoints[i + 1];
          
          // Add the starting point
          if (i === 0) {
            fullPath.push(new google.maps.LatLng(from.lat, from.lng));
          }
          
          // Try to find a bridleway path between these points
          if (snapEnabled) {
            const bridlewayPath = findBridlewayPath(from.lat, from.lng, to.lat, to.lng);
            
            if (bridlewayPath.length > 0) {
              // Add bridleway path (skip first point as it's already added)
              bridlewayPath.slice(1).forEach(p => fullPath.push(p));
            }
          }
          
          // Always add the destination point
          fullPath.push(new google.maps.LatLng(to.lat, to.lng));
        }
        
        // Close the loop for circular routes
        if (routeType === "circular" && waypoints.length > 2) {
          const first = waypoints[0];
          const last = waypoints[waypoints.length - 1];
          
          if (snapEnabled) {
            const closingPath = findBridlewayPath(last.lat, last.lng, first.lat, first.lng);
            if (closingPath.length > 0) {
              closingPath.slice(1).forEach(p => fullPath.push(p));
            }
          }
          
          fullPath.push(new google.maps.LatLng(first.lat, first.lng));
        }
        
        return fullPath;
      };

      const path = buildRoutePath();
      
      // Draw the route line
      routeLineRef.current = new google.maps.Polyline({
        path,
        strokeColor: routeStyle.color,
        strokeWeight: routeStyle.thickness,
        strokeOpacity: routeStyle.opacity / 100,
        map: mapRef.current,
        zIndex: 100,
      });
    }, [isLoaded, isCreating, waypoints, snapEnabled, routeStyle, routeType, findBridlewayPath]);

    // Render user routes
    useEffect(() => {
      if (!mapRef.current || !isLoaded) return;

      routePolylinesRef.current.forEach((p) => p.setMap(null));
      routePolylinesRef.current = [];

      routes.forEach((route) => {
        if (!route.geometry?.coordinates) return;

        const path = route.geometry.coordinates.map(
          (coord: [number, number]) => ({
            lat: coord[1],
            lng: coord[0],
          })
        );

        const color = DIFFICULTY_COLORS[route.difficulty as keyof typeof DIFFICULTY_COLORS] || DIFFICULTY_COLORS.unrated;

        const polyline = new google.maps.Polyline({
          path,
          strokeColor: color,
          strokeWeight: 4,
          strokeOpacity: 0.9,
          map: mapRef.current,
          clickable: true,
        });

        polyline.addListener("mouseover", (e: google.maps.MapMouseEvent) => {
          polyline.setOptions({
            strokeWeight: 6,
            strokeOpacity: 1,
            zIndex: 200,
          });

          if (infoWindowRef.current && e.latLng) {
            const rideTime = Math.round((route.distance_km / 10) * 60);
            const content = `
              <div style="padding: 12px; min-width: 200px; font-family: system-ui, sans-serif;">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px;">${route.title}</div>
                <div style="display: flex; gap: 12px; font-size: 12px; color: #666;">
                  <span>📏 ${route.distance_km?.toFixed(1)} km</span>
                  <span>🐴 ${rideTime}m</span>
                </div>
                <div style="margin-top: 8px; padding: 6px; background: #3B82F6; color: white; text-align: center; border-radius: 4px; font-size: 12px; cursor: pointer;">
                  Click for details
                </div>
              </div>
            `;
            infoWindowRef.current.setContent(content);
            infoWindowRef.current.setPosition(e.latLng);
            infoWindowRef.current.open(mapRef.current);
          }
        });

        polyline.addListener("mouseout", () => {
          polyline.setOptions({
            strokeWeight: 4,
            strokeOpacity: 0.9,
            zIndex: 1,
          });
        });

        polyline.addListener("click", () => {
          infoWindowRef.current?.close();
          onRouteClick?.(route.id);
        });

        routePolylinesRef.current.push(polyline);
      });
    }, [isLoaded, routes, onRouteClick]);

    // Render waypoints for route creation (markers only - line is drawn separately)
    useEffect(() => {
      if (!mapRef.current || !isLoaded) return;

      waypointMarkersRef.current.forEach((m) => m.setMap(null));
      waypointMarkersRef.current.clear();

      if (!isCreating || waypoints.length === 0) return;

      // Create waypoint markers
      waypoints.forEach((wp, index) => {
        const isStart = index === 0;
        const isEnd = index === waypoints.length - 1 && routeType === "linear";

        const marker = new google.maps.Marker({
          position: { lat: wp.lat, lng: wp.lng },
          map: mapRef.current,
          draggable: true,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isStart || isEnd ? 12 : 8,
            fillColor: isStart ? "#10B981" : isEnd ? "#EF4444" : wp.snapped ? "#3B82F6" : "#6B7280",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
          label: isStart
            ? { text: "S", color: "white", fontSize: "11px", fontWeight: "bold" }
            : isEnd
            ? { text: "E", color: "white", fontSize: "11px", fontWeight: "bold" }
            : undefined,
          zIndex: isStart || isEnd ? 300 : 250,
        });

        // Drag handler with snapping
        marker.addListener("dragend", async () => {
          const pos = marker.getPosition();
          if (!pos) return;

          let newLat = pos.lat();
          let newLng = pos.lng();
          let snapped = false;

          if (snapEnabled) {
            const snappedPos = await snapToRoad(newLat, newLng);
            if (snappedPos.snapped) {
              newLat = snappedPos.lat;
              newLng = snappedPos.lng;
              snapped = true;
              marker.setPosition({ lat: newLat, lng: newLng });
            }
          }

          onWaypointUpdate?.(wp.id, newLat, newLng, snapped);
        });

        // Right-click to remove
        marker.addListener("rightclick", () => {
          onWaypointRemove?.(wp.id);
        });

        waypointMarkersRef.current.set(wp.id, marker);
      });
    }, [isLoaded, isCreating, waypoints, routeType, snapEnabled, onWaypointUpdate, onWaypointRemove, snapToRoad]);

    // Render property pins with zoom-responsive sizing
    useEffect(() => {
      if (!mapRef.current || !isLoaded) return;

      propertyMarkersRef.current.forEach((m) => m.setMap(null));
      propertyMarkersRef.current = [];

      // Create custom markers with price labels
      propertyPins.forEach((property) => {
        if (!property.latitude || !property.longitude) return;

        const pricePerNight = property.nightly_price_pennies 
          ? Math.round(property.nightly_price_pennies / 100) 
          : 0;

        // Create custom SVG marker with price - using simpler house icon
        const createMarkerIcon = () => {
          const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 48 56">
              <!-- Pin shape with house -->
              <path d="M24 0C10.7 0 0 10.7 0 24c0 16 24 32 24 32s24-16 24-32C48 10.7 37.3 0 24 0z" fill="#7C3AED"/>
              <path d="M24 0C10.7 0 0 10.7 0 24c0 16 24 32 24 32s24-16 24-32C48 10.7 37.3 0 24 0z" fill="url(#grad)" fill-opacity="0.3"/>
              <!-- House icon -->
              <path d="M24 12l-10 8v12h6v-6h8v6h6V20l-10-8z" fill="white"/>
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:#fff;stop-opacity:0.4"/>
                  <stop offset="100%" style="stop-color:#000;stop-opacity:0.1"/>
                </linearGradient>
              </defs>
            </svg>
          `;
          return {
            url: "data:image/svg+xml," + encodeURIComponent(svg),
            scaledSize: new google.maps.Size(36, 42),
            anchor: new google.maps.Point(18, 42),
          };
        };

        const marker = new google.maps.Marker({
          position: { lat: Number(property.latitude), lng: Number(property.longitude) },
          map: mapRef.current,
          icon: createMarkerIcon(),
          title: property.name,
          zIndex: 50,
          optimized: true,
        });

        marker.addListener("click", () => {
          if (infoWindowRef.current) {
            const rating = property.average_rating 
              ? `<div style="color: #f59e0b; font-size: 12px;">★ ${property.average_rating.toFixed(1)} (${property.review_count || 0})</div>`
              : '';
            const photoHtml = property.mainPhoto 
              ? `<img src="${property.mainPhoto}" alt="${property.name}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px 4px 0 0; margin-bottom: 8px;" />`
              : '';
            
            const content = `
              <div style="min-width: 220px; font-family: system-ui, sans-serif;">
                ${photoHtml}
                <div style="padding: ${photoHtml ? '0 12px 12px' : '12px'};">
                  <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #1a1a1a;">${property.name}</div>
                  <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${property.city || ''}, ${property.county || ''}</div>
                  ${rating}
                  <div style="font-size: 16px; color: #1d4d2b; font-weight: 700; margin: 8px 0;">
                    £${pricePerNight}<span style="font-size: 12px; font-weight: 400; color: #666;">/night</span>
                  </div>
                  <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                    🐴 Up to ${property.max_horses || 0} horses
                  </div>
                  <a href="/property/${property.id}" 
                     style="display: block; padding: 10px; background: #7C3AED; color: white; text-align: center; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">
                    View Property
                  </a>
                </div>
              </div>
            `;
            infoWindowRef.current.setContent(content);
            infoWindowRef.current.open(mapRef.current, marker);
          }
        });

        propertyMarkersRef.current.push(marker);
      });
    }, [isLoaded, propertyPins]);

    if (loadError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <p className="text-destructive">Failed to load map</p>
        </div>
      );
    }

    if (!isLoaded) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full" />
        
        {/* Loading indicator */}
        {pathsLoading && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-white/90 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading paths...</span>
            </div>
          </div>
        )}

        {/* Paths loaded indicator */}
        {!pathsLoading && pathsCount > 0 && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-white/90 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
              <Info className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">
                {pathsCount.toLocaleString()} paths loaded
              </span>
            </div>
          </div>
        )}
        
        {/* Path Error Message */}
        {pathsError && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-10">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 shadow-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Path Data Notice</p>
                  <p className="text-xs text-amber-700 mt-1">{pathsError}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

RoutesMapV2.displayName = "RoutesMapV2";
