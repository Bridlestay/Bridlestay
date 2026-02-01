"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useGoogleMaps } from "@/lib/hooks/use-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Loader2, AlertCircle, Info } from "lucide-react";
import type { Waypoint, RouteStyle, ToolMode } from "./route-creator";

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
  onRoutePreview?: (route: any) => void; // Called when pin is clicked to show preview card
  onClusterClick?: (routeIds: string[], count: number) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  propertyPins?: any[];
  highlightedRouteId?: string | null;
  selectedRouteId?: string | null; // Route to draw on map (polyline visible)
  mapType?: "roadmap" | "satellite" | "terrain" | "hybrid";
  monochrome?: boolean;
  // Route creation props
  isCreating?: boolean;
  isPlotting?: boolean;
  snapEnabled?: boolean;
  waypoints?: Waypoint[];
  routeType?: "circular" | "linear";
  routeStyle?: RouteStyle;
  toolMode?: ToolMode;
  onWaypointAdd?: (lat: number, lng: number, snapped: boolean, pathType?: string) => void;
  onWaypointUpdate?: (id: string, lat: number, lng: number, snapped: boolean) => void;
  onWaypointRemove?: (id: string) => void;
  onWaypointInsert?: (index: number, lat: number, lng: number, snapped: boolean, pathType?: string) => void;
  onCircularDetected?: () => void;
  // Path layer visibility
  pathLayers?: PathLayers;
  // Navigation mode
  userPosition?: { lat: number; lng: number; heading: number } | null;
  followUser?: boolean;
  // Recorded route (for GPS recording)
  recordedPath?: { lat: number; lng: number }[];
}

export interface RoutesMapV2Handle {
  getMap: () => google.maps.Map | null;
  panTo: (lat: number, lng: number) => void;
  setZoom: (zoom: number) => void;
  fitBounds: (coordinates: [number, number][], padding?: { top?: number; right?: number; bottom?: number; left?: number }) => void;
  highlightRoute: (routeId: string | null) => void;
  setMapType: (type: "roadmap" | "satellite" | "terrain" | "hybrid") => void;
  showPropertyInfoWindow: (propertyId: string) => void;
}

// Distance threshold for detecting circular route (in meters)
const CIRCULAR_THRESHOLD_METERS = 50;

export const RoutesMapV2 = forwardRef<RoutesMapV2Handle, RoutesMapV2Props>(
  (
    {
      routes = [],
      onRouteClick,
      onRoutePreview,
      onClusterClick,
      center = { lat: 52.2, lng: -2.2 }, // Worcestershire center
      zoom = 10,
      propertyPins = [],
      highlightedRouteId,
      selectedRouteId,
      mapType = "terrain",
      monochrome = false,
      isCreating = false,
      isPlotting = false,
      snapEnabled = true,
      waypoints = [],
      routeType = "linear",
      routeStyle = { color: "#3B82F6", thickness: 4, opacity: 100 },
      toolMode = "plot",
      onWaypointAdd,
      onWaypointUpdate,
      onWaypointRemove,
      onWaypointInsert,
      onCircularDetected,
      pathLayers = { bridleways: true, boats: true, footpaths: true, permissive: true },
      userPosition,
      followUser = false,
      recordedPath = [],
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const routePolylinesRef = useRef<google.maps.Polyline[]>([]);
    const routeIdToPolylineRef = useRef<Map<string, google.maps.Polyline>>(new Map());
    const routeMarkersRef = useRef<google.maps.Marker[]>([]);
    const markerClustererRef = useRef<MarkerClusterer | null>(null);
    const waypointMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
    const routeLineRef = useRef<google.maps.Polyline | null>(null);
    const propertyMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
    const userMarkerRef = useRef<google.maps.Marker | null>(null);
    const recordedPolylineRef = useRef<google.maps.Polyline | null>(null);
    const [currentHighlightId, setCurrentHighlightId] = useState<string | null>(null);
    const snapPolylineRef = useRef<google.maps.Polyline | null>(null);
    const pathPolylinesRef = useRef<google.maps.Polyline[]>([]);
    const pathDataRef = useRef<{ path: google.maps.LatLng[]; type: string }[]>([]); // Store path data for snapping
    
    // Refs for creation state (so path click handlers can access latest values)
    const isCreatingRef = useRef(isCreating);
    const isPlottingRef = useRef(isPlotting);
    const toolModeRef = useRef(toolMode);
    const snapEnabledRef = useRef(snapEnabled);
    const onWaypointAddRef = useRef(onWaypointAdd);
    const onWaypointInsertRef = useRef(onWaypointInsert);
    const waypointsRef = useRef(waypoints);
    const onCircularDetectedRef = useRef(onCircularDetected);
    
    // Keep refs up to date
    useEffect(() => { isCreatingRef.current = isCreating; }, [isCreating]);
    useEffect(() => { isPlottingRef.current = isPlotting; }, [isPlotting]);
    useEffect(() => { toolModeRef.current = toolMode; }, [toolMode]);
    useEffect(() => { snapEnabledRef.current = snapEnabled; }, [snapEnabled]);
    useEffect(() => { onWaypointAddRef.current = onWaypointAdd; }, [onWaypointAdd]);
    useEffect(() => { onWaypointInsertRef.current = onWaypointInsert; }, [onWaypointInsert]);
    useEffect(() => { waypointsRef.current = waypoints; }, [waypoints]);
    useEffect(() => { onCircularDetectedRef.current = onCircularDetected; }, [onCircularDetected]);
    
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
      fitBounds: (coordinates: [number, number][], padding?: { top?: number; right?: number; bottom?: number; left?: number }) => {
        if (!mapRef.current || coordinates.length === 0) return;
        const bounds = new google.maps.LatLngBounds();
        coordinates.forEach(([lng, lat]) => {
          bounds.extend({ lat, lng });
        });
        // Use provided padding or default (leave space for left panel in route view)
        const defaultPadding = { top: 50, right: 50, bottom: 50, left: 100 };
        mapRef.current.fitBounds(bounds, padding || defaultPadding);
      },
      highlightRoute: (routeId: string | null) => {
        setCurrentHighlightId(routeId);
      },
      setMapType: (type: "roadmap" | "satellite" | "terrain" | "hybrid") => {
        mapRef.current?.setMapTypeId(type);
      },
      showPropertyInfoWindow: (propertyId: string) => {
        const marker = propertyMarkersRef.current.get(propertyId);
        if (marker && infoWindowRef.current) {
          // Trigger the click event on the marker to show its info window
          google.maps.event.trigger(marker, 'click');
        }
      },
    }));

    // Initialize map with terrain and trails visible
    useEffect(() => {
      if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

      const map = new google.maps.Map(mapContainerRef.current, {
        center,
        zoom,
        mapTypeId: "terrain", // Shows trails and paths
        // Disable all default Google UI - we use custom controls
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        rotateControl: false,
        scaleControl: true,
        keyboardShortcuts: false, // Disable keyboard shortcuts hint
        // Default cursor (not hand tool)
        draggableCursor: "default",
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
        routeMarkersRef.current.forEach((m) => m.setMap(null));
        markerClustererRef.current?.clearMarkers();
        waypointMarkersRef.current.forEach((m) => m.setMap(null));
        propertyMarkersRef.current.forEach((m) => m.setMap(null));
        propertyMarkersRef.current.clear();
        routeLineRef.current?.setMap(null);
        snapPolylineRef.current?.setMap(null);
        pathPolylinesRef.current.forEach((p) => p.setMap(null));
      };
    }, [isLoaded, center, zoom]);

    // Update cursor based on mode and tool
    useEffect(() => {
      if (!mapRef.current) return;
      
      if (isCreating && isPlotting) {
        if (toolMode === "plot" || toolMode === "insert") {
          mapRef.current.setOptions({ draggableCursor: "crosshair" });
        } else if (toolMode === "erase") {
          mapRef.current.setOptions({ draggableCursor: "not-allowed" });
        }
      } else {
        mapRef.current.setOptions({ draggableCursor: "default" });
      }
    }, [isCreating, isPlotting, toolMode]);

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

                  // Store path data for snapping (all visible path types)
                  const latLngPath = path.map((p: {lat: number, lng: number}) => 
                    new google.maps.LatLng(p.lat, p.lng)
                  );
                  pathDataRef.current.push({ path: latLngPath, type });

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

                  // Click on path to place waypoint when in plot mode
                  polyline.addListener("click", (e: google.maps.MapMouseEvent) => {
                    if (isCreatingRef.current && isPlottingRef.current && toolModeRef.current === "plot" && e.latLng && onWaypointAddRef.current) {
                      const lat = e.latLng.lat();
                      const lng = e.latLng.lng();
                      
                      // Check if clicking near start point (to make circular)
                      if (waypointsRef.current.length >= 2) {
                        const start = waypointsRef.current[0];
                        const distToStart = getDistanceMetersStatic(lat, lng, start.lat, start.lng);
                        if (distToStart < CIRCULAR_THRESHOLD_METERS) {
                          // Close the loop - trigger circular detection
                          onCircularDetectedRef.current?.();
                          return;
                        }
                      }
                      
                      // Place waypoint at the exact click location on the path
                      onWaypointAddRef.current(lat, lng, true, type);
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

    // Static helper for distance calculation (used in callbacks)
    const getDistanceMetersStatic = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371000; // Earth's radius in meters
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Helper: Calculate distance between two points (Haversine formula in meters)
    const getDistanceMeters = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
      return getDistanceMetersStatic(lat1, lng1, lat2, lng2);
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

    // Snap to any public path (bridleways, footpaths, byways, etc.) - finds nearest point
    const snapToPath = useCallback((lat: number, lng: number): { lat: number; lng: number; snapped: boolean; pathType?: string } => {
      const SNAP_THRESHOLD_METERS = 50; // Snap if within 50 meters of a path
      
      let nearestDist = Infinity;
      let nearestPoint = { lat, lng };
      let snapped = false;
      let snappedPathType: string | undefined;

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
            snappedPathType = type;
          }
        }
      }

      return { ...nearestPoint, snapped, pathType: snappedPathType };
    }, [getDistanceMeters, nearestPointOnSegment]);

    // Snap to roads using Google's Roads API / Directions (fallback if not near public path)
    const snapToRoad = useCallback(async (lat: number, lng: number): Promise<{lat: number, lng: number, snapped: boolean, pathType?: string}> => {
      if (!snapEnabled) {
        return { lat, lng, snapped: false };
      }

      // First, try to snap to any public path (bridleway, footpath, etc.)
      const pathSnap = snapToPath(lat, lng);
      if (pathSnap.snapped) {
        return pathSnap;
      }

      // If not near a public path and we have waypoints, try Google Directions
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
    }, [snapEnabled, waypoints, snapToPath]);

    // Find which segment a click is nearest to (for insert mode)
    const findNearestSegment = useCallback((lat: number, lng: number): number => {
      if (waypoints.length < 2) return -1;
      
      let nearestIdx = -1;
      let nearestDist = Infinity;
      
      for (let i = 0; i < waypoints.length - 1; i++) {
        const a = waypoints[i];
        const b = waypoints[i + 1];
        
        const nearest = nearestPointOnSegment(
          lng, lat,
          a.lng, a.lat,
          b.lng, b.lat
        );
        
        const dist = getDistanceMeters(lat, lng, nearest.y, nearest.x);
        
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i + 1; // Insert after index i
        }
      }
      
      return nearestIdx;
    }, [waypoints, getDistanceMeters, nearestPointOnSegment]);

    // Handle map clicks for route creation
    useEffect(() => {
      if (!mapRef.current || !isLoaded) return;

      const clickListener = mapRef.current.addListener(
        "click",
        async (e: google.maps.MapMouseEvent) => {
          if (!isCreating || !isPlotting || !e.latLng) return;

          const lat = e.latLng.lat();
          const lng = e.latLng.lng();

          // Handle different tool modes
          if (toolMode === "plot") {
            // Check if clicking near start point (to make circular)
            if (waypoints.length >= 2) {
              const start = waypoints[0];
              const distToStart = getDistanceMeters(lat, lng, start.lat, start.lng);
              if (distToStart < CIRCULAR_THRESHOLD_METERS) {
                // Close the loop - trigger circular detection
                onCircularDetected?.();
                return;
              }
            }

            if (snapEnabled) {
              // Always try to snap to nearest path (works for first point too!)
              const pathSnap = snapToPath(lat, lng);
              if (pathSnap.snapped) {
                onWaypointAdd?.(pathSnap.lat, pathSnap.lng, true, pathSnap.pathType);
              } else if (waypoints.length > 0) {
                // Only try road snapping if we have previous waypoints
                const snapped = await snapToRoad(lat, lng);
                onWaypointAdd?.(snapped.lat, snapped.lng, snapped.snapped, snapped.pathType);
              } else {
                // First point, not near a path - place unsnapped
                onWaypointAdd?.(lat, lng, false);
              }
            } else {
              onWaypointAdd?.(lat, lng, false);
            }
          } else if (toolMode === "insert") {
            // Find nearest segment and insert
            const insertIdx = findNearestSegment(lat, lng);
            if (insertIdx > 0) {
              if (snapEnabled) {
                const pathSnap = snapToPath(lat, lng);
                if (pathSnap.snapped) {
                  onWaypointInsert?.(insertIdx, pathSnap.lat, pathSnap.lng, true, pathSnap.pathType);
                } else {
                  onWaypointInsert?.(insertIdx, lat, lng, false);
                }
              } else {
                onWaypointInsert?.(insertIdx, lat, lng, false);
              }
            }
          }
          // Erase mode is handled by marker clicks, not map clicks
        }
      );

      return () => {
        google.maps.event.removeListener(clickListener);
      };
    }, [isLoaded, isCreating, isPlotting, snapEnabled, toolMode, onWaypointAdd, onWaypointInsert, onCircularDetected, waypoints, snapToRoad, snapToPath, getDistanceMeters, findNearestSegment]);

    // Helper: Find path along any public right of way between two points
    const findBridlewayPath = useCallback((
      fromLat: number, fromLng: number, 
      toLat: number, toLng: number
    ): google.maps.LatLng[] => {
      const SEARCH_RADIUS_METERS = 100;
      let bestPath: google.maps.LatLng[] = [];
      let bestDist = Infinity;

      // Look for public path segments that connect these points
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

        // If both points are near this path, extract the segment
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

      // Build the full path, trying to follow public rights of way
      // Snap only affects segments where BOTH endpoints were snapped (respects per-point snap state)
      const buildRoutePath = () => {
        const fullPath: google.maps.LatLng[] = [];
        
        for (let i = 0; i < waypoints.length - 1; i++) {
          const from = waypoints[i];
          const to = waypoints[i + 1];
          
          // Add the starting point
          if (i === 0) {
            fullPath.push(new google.maps.LatLng(from.lat, from.lng));
          }
          
          // Try to find a public path between these points ONLY if both points were snapped
          // This means toggling snap only affects future segments, not existing ones
          if (from.snapped && to.snapped) {
            const publicPath = findBridlewayPath(from.lat, from.lng, to.lat, to.lng);
            
            if (publicPath.length > 0) {
              // Add public path (skip first point as it's already added)
              publicPath.slice(1).forEach(p => fullPath.push(p));
            }
          }
          
          // Always add the destination point
          fullPath.push(new google.maps.LatLng(to.lat, to.lng));
        }
        
        // Close the loop for circular routes
        if (routeType === "circular" && waypoints.length > 2) {
          const first = waypoints[0];
          const last = waypoints[waypoints.length - 1];
          
          // Only follow path for closing segment if both endpoints were snapped
          if (first.snapped && last.snapped) {
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
      
      // Draw the route line (clickable for insert mode)
      // Use a thicker invisible stroke for better click detection
      routeLineRef.current = new google.maps.Polyline({
        path,
        strokeColor: routeStyle.color,
        strokeWeight: routeStyle.thickness,
        strokeOpacity: routeStyle.opacity / 100,
        map: mapRef.current,
        zIndex: 100,
        clickable: true,
      });

      // Create an invisible thicker polyline for better click detection in insert mode
      const clickableOverlay = new google.maps.Polyline({
        path,
        strokeColor: "transparent",
        strokeWeight: 20, // Much thicker for easy clicking
        strokeOpacity: 0,
        map: mapRef.current,
        zIndex: 99,
        clickable: true,
      });

      // Helper to find nearest segment from click position
      const findSegmentAtClick = (lat: number, lng: number): number => {
        const wps = waypointsRef.current;
        if (wps.length < 2) return -1;
        
        let nearestIdx = -1;
        let nearestDist = Infinity;
        
        for (let i = 0; i < wps.length - 1; i++) {
          const a = wps[i];
          const b = wps[i + 1];
          
          // Find nearest point on this segment
          const dx = b.lng - a.lng;
          const dy = b.lat - a.lat;
          const t = Math.max(0, Math.min(1, ((lng - a.lng) * dx + (lat - a.lat) * dy) / (dx * dx + dy * dy || 1)));
          const nearestX = a.lng + t * dx;
          const nearestY = a.lat + t * dy;
          
          // Calculate distance
          const R = 6371000;
          const dLat = (lat - nearestY) * Math.PI / 180;
          const dLng = (lng - nearestX) * Math.PI / 180;
          const aCalc = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat * Math.PI / 180) * Math.cos(nearestY * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
          const dist = R * c;
          
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i + 1; // Insert after index i
          }
        }
        
        return nearestIdx;
      };

      // Click handler for insert mode (using refs for current state)
      const handleLineClick = (e: google.maps.MapMouseEvent) => {
        if (!isPlottingRef.current || toolModeRef.current !== "insert" || !e.latLng) return;
        
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const insertIdx = findSegmentAtClick(lat, lng);
        
        if (insertIdx > 0 && onWaypointInsertRef.current) {
          if (snapEnabledRef.current) {
            // Try to snap to path
            const SNAP_THRESHOLD_METERS = 50;
            let snapped = false;
            let snappedLat = lat;
            let snappedLng = lng;
            let snappedPathType: string | undefined;

            for (const { path: pathData, type } of pathDataRef.current) {
              for (let i = 0; i < pathData.length - 1; i++) {
                const pa = pathData[i];
                const pb = pathData[i + 1];
                
                const pdx = pb.lng() - pa.lng();
                const pdy = pb.lat() - pa.lat();
                const pt = Math.max(0, Math.min(1, ((lng - pa.lng()) * pdx + (lat - pa.lat()) * pdy) / (pdx * pdx + pdy * pdy || 1)));
                const nearestX = pa.lng() + pt * pdx;
                const nearestY = pa.lat() + pt * pdy;
                
                const R = 6371000;
                const dLat = (lat - nearestY) * Math.PI / 180;
                const dLng = (lng - nearestX) * Math.PI / 180;
                const aCalc = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat * Math.PI / 180) * Math.cos(nearestY * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
                const dist = R * c;
                
                if (dist < SNAP_THRESHOLD_METERS) {
                  snapped = true;
                  snappedLat = nearestY;
                  snappedLng = nearestX;
                  snappedPathType = type;
                  break;
                }
              }
              if (snapped) break;
            }
            
            onWaypointInsertRef.current(insertIdx, snappedLat, snappedLng, snapped, snappedPathType);
          } else {
            onWaypointInsertRef.current(insertIdx, lat, lng, false);
          }
        }
      };

      // Add click handler to both polylines
      routeLineRef.current.addListener("click", handleLineClick);
      clickableOverlay.addListener("click", handleLineClick);

      // Store reference for cleanup
      const overlayRef = clickableOverlay;

      return () => {
        overlayRef.setMap(null);
      };
    }, [isLoaded, isCreating, waypoints, routeStyle, routeType, findBridlewayPath]);

    // Render user routes with clustering - pins only, polylines drawn for selected route
    useEffect(() => {
      if (!mapRef.current || !isLoaded) return;

      // Clean up previous routes
      routePolylinesRef.current.forEach((p) => p.setMap(null));
      routePolylinesRef.current = [];
      routeIdToPolylineRef.current.clear();
      routeMarkersRef.current.forEach((m) => m.setMap(null));
      routeMarkersRef.current = [];
      markerClustererRef.current?.clearMarkers();

      const markers: google.maps.Marker[] = [];
      const routesMap = new Map(routes.map(r => [r.id, r]));

      routes.forEach((route) => {
        if (!route.geometry?.coordinates) return;

        const path = route.geometry.coordinates.map(
          (coord: [number, number]) => ({
            lat: coord[1],
            lng: coord[0],
          })
        );

        const color = DIFFICULTY_COLORS[route.difficulty as keyof typeof DIFFICULTY_COLORS] || DIFFICULTY_COLORS.unrated;
        const isSelected = route.id === selectedRouteId;

        // Only create polyline for selected route - with arrows and start/finish markers
        if (isSelected && path.length > 0) {
          // Create main route polyline with direction arrows
          const polyline = new google.maps.Polyline({
            path,
            strokeColor: "#4338CA", // Deep indigo like OS Maps
            strokeWeight: 5,
            strokeOpacity: 1,
            map: mapRef.current,
            clickable: true,
            zIndex: 100,
            geodesic: true, // Smooth curved lines
            icons: [{
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                strokeColor: "#ffffff",
                strokeWeight: 1,
                fillColor: "#4338CA",
                fillOpacity: 1,
              },
              offset: "0",
              repeat: "100px", // Arrow every 100px
            }],
          });

          polyline.addListener("click", () => {
            onRouteClick?.(route.id);
          });

          routePolylinesRef.current.push(polyline);
          routeIdToPolylineRef.current.set(route.id, polyline);

          // Start marker (green circle with flag)
          const startMarker = new google.maps.Marker({
            position: path[0],
            map: mapRef.current,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#22C55E", // Green
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
            title: "Start",
            zIndex: 200,
          });
          routeMarkersRef.current.push(startMarker);

          // Finish marker (red/orange circle with checkered flag appearance)
          const endMarker = new google.maps.Marker({
            position: path[path.length - 1],
            map: mapRef.current,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#EF4444", // Red
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
            title: "Finish",
            zIndex: 200,
          });
          routeMarkersRef.current.push(endMarker);
        }

        // Create route pin marker for clustering
        if (path.length > 0) {
          const startPoint = path[0];
          
          // Use custom pin icon
          const marker = new google.maps.Marker({
            position: startPoint,
            icon: {
              path: "M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z",
              fillColor: isSelected ? "#2E8B57" : "#4338CA",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: isSelected ? 1.8 : 1.4,
              anchor: new google.maps.Point(12, 21),
            },
            title: route.title,
            zIndex: isSelected ? 1000 : 1,
          });

          // Attach route data to marker
          (marker as any).routeId = route.id;
          (marker as any).routeData = route;

          // Click marker to show preview card - OS Maps style with route thumbnail
          marker.addListener("click", () => {
            const clickedRoute = routesMap.get(route.id);
            if (!clickedRoute) return;

            // Calculate ride time estimate (8 km/h average for horse riding)
            const rideTimeMinutes = Math.round((clickedRoute.distance_km || 0) / 8 * 60);
            const hours = Math.floor(rideTimeMinutes / 60);
            const mins = rideTimeMinutes % 60;
            const rideTimeStr = hours > 0 ? `${hours} h ${mins} min` : `${mins} min`;

            // Difficulty badge colors - muted, elegant
            const difficultyStyles: Record<string, { bg: string; text: string }> = {
              easy: { bg: "#DCFCE7", text: "#166534" },
              moderate: { bg: "#FEF9C3", text: "#854D0E" },
              difficult: { bg: "#FED7AA", text: "#9A3412" },
              severe: { bg: "#FECACA", text: "#991B1B" },
              unrated: { bg: "#F3F4F6", text: "#374151" },
            };
            const diffStyle = difficultyStyles[clickedRoute.difficulty] || difficultyStyles.unrated;

            // Generate static map URL with route path
            let staticMapUrl = "";
            try {
              const geometry = clickedRoute.geometry;
              if (geometry && geometry.coordinates && geometry.coordinates.length > 0) {
                // Simplify path for URL (take every Nth point to stay under URL limit)
                const coords = geometry.coordinates;
                const step = Math.max(1, Math.floor(coords.length / 30));
                const simplifiedPath = coords
                  .filter((_: any, i: number) => i % step === 0 || i === coords.length - 1)
                  .map((c: number[]) => `${c[1]},${c[0]}`)
                  .join("|");
                
                // Calculate center from first coordinate
                const centerLat = coords[Math.floor(coords.length / 2)][1];
                const centerLng = coords[Math.floor(coords.length / 2)][0];
                
                staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=100x100&scale=2&maptype=terrain&path=color:0x4338CA|weight:3|${simplifiedPath}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
              }
            } catch (e) {
              console.error("Error generating static map:", e);
            }

            // Fallback placeholder if no route image
            const mapThumbnail = staticMapUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23e5e7eb' width='100' height='100'/%3E%3Cpath d='M20 60 Q 35 30, 50 50 T 80 40' stroke='%234338CA' stroke-width='3' fill='none'/%3E%3C/svg%3E";

            // Create OS Maps style card with thumbnail
            const content = `
              <div style="
                width: 300px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
              ">
                <!-- Header: Title & Creator -->
                <div style="padding: 14px 14px 10px;">
                  <h3 style="
                    margin: 0 0 4px 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #1f2937;
                    line-height: 1.25;
                  ">${clickedRoute.title || "Untitled Route"}</h3>
                  ${clickedRoute.owner?.name ? `
                    <div style="
                      display: flex;
                      align-items: center;
                      gap: 5px;
                      color: #2E8B57;
                      font-size: 13px;
                    ">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E8B57" stroke-width="2.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      ${clickedRoute.owner.name}
                    </div>
                  ` : ""}
                </div>
                
                <!-- Main content: Thumbnail + Stats -->
                <div style="
                  display: flex;
                  padding: 0 14px 14px;
                  gap: 14px;
                ">
                  <!-- Route Thumbnail -->
                  <div style="
                    width: 90px;
                    height: 90px;
                    border-radius: 8px;
                    overflow: hidden;
                    flex-shrink: 0;
                    background: #f3f4f6;
                  ">
                    <img 
                      src="${mapThumbnail}" 
                      alt="Route preview"
                      style="width: 100%; height: 100%; object-fit: cover;"
                      onerror="this.style.display='none'"
                    />
                  </div>
                  
                  <!-- Stats -->
                  <div style="
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 6px;
                  ">
                    <!-- Distance -->
                    <div style="
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      color: #374151;
                      font-size: 14px;
                    ">
                      <span style="font-size: 16px;">🐴</span>
                      <span style="font-weight: 500;">${(clickedRoute.distance_km || 0).toFixed(2)} km</span>
                    </div>
                    
                    <!-- Time -->
                    <div style="
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      color: #374151;
                      font-size: 14px;
                    ">
                      <span style="font-size: 14px;">⏱️</span>
                      <span>${rideTimeStr}</span>
                    </div>
                    
                    <!-- Difficulty Badge -->
                    <div style="margin-top: 4px;">
                      <span style="
                        display: inline-block;
                        padding: 4px 12px;
                        background: ${diffStyle.bg};
                        color: ${diffStyle.text};
                        border-radius: 16px;
                        font-size: 12px;
                        font-weight: 600;
                        text-transform: capitalize;
                      ">${clickedRoute.difficulty || "Unrated"}</span>
                    </div>
                  </div>
                </div>
                
                <!-- View Details Link -->
                <div 
                  id="route-preview-btn-${route.id}"
                  style="
                    display: block;
                    padding: 12px 14px;
                    border-top: 1px solid #e5e7eb;
                    color: #2E8B57;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    text-align: center;
                    background: #fafafa;
                  "
                  onmouseover="this.style.background='#f0fdf4'"
                  onmouseout="this.style.background='#fafafa'"
                >
                  View details
                </div>
              </div>
            `;

            infoWindowRef.current?.close();
            infoWindowRef.current?.setContent(content);
            infoWindowRef.current?.setPosition(marker.getPosition()!);
            infoWindowRef.current?.open(mapRef.current);

            // Call preview callback
            onRoutePreview?.(clickedRoute);

            // Add click listener for "View details" after content is set
            setTimeout(() => {
              const btn = document.getElementById(`route-preview-btn-${route.id}`);
              if (btn) {
                btn.onclick = () => {
                  infoWindowRef.current?.close();
                  onRouteClick?.(route.id);
                };
              }
            }, 100);
          });

          markers.push(marker);
          routeMarkersRef.current.push(marker);
        }
      });

      // Create or update marker clusterer
      if (markers.length > 0 && mapRef.current) {
        markerClustererRef.current = new MarkerClusterer({
          map: mapRef.current,
          markers,
          onClusterClick: (event, cluster, map) => {
            // Get all route IDs in this cluster
            const clusterMarkers = cluster.markers;
            if (clusterMarkers && clusterMarkers.length > 0) {
              const clusterRoutes = clusterMarkers
                .map((m) => (m as any).routeData)
                .filter(Boolean);
              const routeIds = clusterRoutes.map((r: any) => r.id);
              
              if (onClusterClick && routeIds.length > 1) {
                onClusterClick(routeIds, routeIds.length);
              } else if (routeIds.length === 1) {
                // Single route, show preview
                onRoutePreview?.(clusterRoutes[0]);
              } else {
                // Default behavior - zoom in
                const bounds = new google.maps.LatLngBounds();
                clusterMarkers.forEach((m) => {
                  const pos = m.getPosition?.();
                  if (pos) bounds.extend(pos);
                });
                map.fitBounds(bounds);
              }
            }
          },
          renderer: {
            render: ({ count, position }) => {
              // Custom cluster marker styling - like OS Maps
              return new google.maps.Marker({
                position,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 20 + Math.min(count, 15),
                  fillColor: "#4338CA",
                  fillOpacity: 0.95,
                  strokeColor: "#ffffff",
                  strokeWeight: 3,
                },
                label: {
                  text: String(count),
                  color: "#ffffff",
                  fontWeight: "bold",
                  fontSize: "13px",
                },
                zIndex: 500,
              });
            },
          },
        });
      }
    }, [isLoaded, routes, selectedRouteId, onRouteClick, onRoutePreview, onClusterClick]);

    // Route highlighting effect
    useEffect(() => {
      const highlightId = highlightedRouteId || currentHighlightId;
      
      routeIdToPolylineRef.current.forEach((polyline, routeId) => {
        const isHighlighted = routeId === highlightId;
        polyline.setOptions({
          strokeWeight: isHighlighted ? 8 : 4,
          strokeOpacity: isHighlighted ? 1 : 0.9,
          zIndex: isHighlighted ? 500 : 1,
        });
      });
    }, [highlightedRouteId, currentHighlightId]);

    // Map type switching effect
    useEffect(() => {
      if (!mapRef.current) return;
      
      mapRef.current.setMapTypeId(mapType);
      
      // Apply monochrome styling if enabled
      if (monochrome) {
        mapRef.current.setOptions({
          styles: [
            { elementType: "geometry", stylers: [{ saturation: -100 }] },
            { elementType: "labels.text.fill", stylers: [{ saturation: -100 }] },
            { elementType: "labels.text.stroke", stylers: [{ saturation: -100 }] },
          ],
        });
      } else {
        mapRef.current.setOptions({ styles: [] });
      }
    }, [mapType, monochrome]);

    // User position marker for navigation
    useEffect(() => {
      if (!mapRef.current || !isLoaded) return;

      if (!userPosition) {
        userMarkerRef.current?.setMap(null);
        userMarkerRef.current = null;
        return;
      }

      if (!userMarkerRef.current) {
        userMarkerRef.current = new google.maps.Marker({
          position: userPosition,
          map: mapRef.current,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 8,
            fillColor: "#3B82F6",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            rotation: userPosition.heading || 0,
          },
          zIndex: 1000,
        });
      } else {
        userMarkerRef.current.setPosition(userPosition);
        userMarkerRef.current.setIcon({
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 8,
          fillColor: "#3B82F6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          rotation: userPosition.heading || 0,
        });
      }

      // Follow user if enabled
      if (followUser) {
        mapRef.current.panTo(userPosition);
      }
    }, [isLoaded, userPosition, followUser]);

    // Recorded path polyline for route recording
    useEffect(() => {
      if (!mapRef.current || !isLoaded) return;

      if (recordedPath.length === 0) {
        recordedPolylineRef.current?.setMap(null);
        recordedPolylineRef.current = null;
        return;
      }

      if (!recordedPolylineRef.current) {
        recordedPolylineRef.current = new google.maps.Polyline({
          path: recordedPath,
          strokeColor: "#EF4444",
          strokeWeight: 5,
          strokeOpacity: 0.9,
          map: mapRef.current,
          zIndex: 100,
        });
      } else {
        recordedPolylineRef.current.setPath(recordedPath);
      }
    }, [isLoaded, recordedPath]);

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
          cursor: toolMode === "erase" ? "pointer" : "move",
        });

        // Drag handler with snapping (only in non-erase mode)
        marker.addListener("dragend", async () => {
          if (toolMode === "erase") return;
          
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

        // Click to remove in erase mode
        marker.addListener("click", () => {
          if (toolMode === "erase") {
            onWaypointRemove?.(wp.id);
          }
        });

        // Update cursor on hover in erase mode
        marker.addListener("mouseover", () => {
          if (toolMode === "erase") {
            marker.setCursor("pointer");
          }
        });

        waypointMarkersRef.current.set(wp.id, marker);
      });
    }, [isLoaded, isCreating, waypoints, routeType, snapEnabled, toolMode, onWaypointUpdate, onWaypointRemove, snapToRoad]);

    // Render property pins with zoom-responsive sizing
    useEffect(() => {
      if (!mapRef.current || !isLoaded) return;

      propertyMarkersRef.current.forEach((m) => m.setMap(null));
      propertyMarkersRef.current.clear();

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

        // Store property data on marker for info window
        (marker as any).propertyData = property;

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

        // Store marker by property ID
        propertyMarkersRef.current.set(property.id, marker);
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
        
        {/* Loading indicator - positioned below terrain controls */}
        {pathsLoading && (
          <div className="absolute top-16 left-2 z-10">
            <div className="bg-white/90 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading paths...</span>
            </div>
          </div>
        )}

        {/* Paths loaded indicator - positioned below terrain controls */}
        {!pathsLoading && pathsCount > 0 && (
          <div className="absolute top-16 left-2 z-10">
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
