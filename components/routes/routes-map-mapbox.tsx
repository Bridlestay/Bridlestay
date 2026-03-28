"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { useMapbox } from "@/lib/hooks/use-mapbox";
import { Loader2, AlertCircle } from "lucide-react";
import type { Waypoint, RouteStyle, ToolMode } from "./route-creator";
import { toast } from "sonner";

// Route difficulty colors
const DIFFICULTY_COLORS = {
  unrated: "#6B7280",
  easy: "#10B981",
  moderate: "#3B82F6",
  difficult: "#F59E0B",
  severe: "#EF4444",
};

// Brand colors for pins (Padoq green, OS Maps–inspired style)
const PIN_COLOR = "#16A34A"; // Green-600 — brand accent
const PIN_BORDER = "#ffffff";

// UK bounds for route creation restriction
// Great Britain bounds (England, Scotland, Wales — excludes Ireland)
const GB_BOUNDS = {
  north: 60.86,  // Shetland
  south: 49.95,  // Isles of Scilly
  east: 1.77,    // Lowestoft
  west: -5.75,   // St Kilda / western Scotland coast
};

// Haversine distance in km (for circular route detection)
function haversineDistanceSimple(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Check if a Directions API route is unreasonably long compared to straight-line
// distance (the "routing all the way around" problem). Returns true if detour.
function isRouteDetour(
  routeDistanceM: number,
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): boolean {
  const straightLineM = haversineDistanceSimple(fromLat, fromLng, toLat, toLng) * 1000;
  if (straightLineM < 10) return false; // Too short to judge
  const ratio = routeDistanceM / straightLineM;
  if (ratio > 5) {
    console.warn(
      `Snap: route detour ${ratio.toFixed(1)}x (${Math.round(routeDistanceM)}m route vs ${Math.round(straightLineM)}m straight) — using straight line`
    );
    return true;
  }
  return false;
}

// Find nearest point on a line segment (returns lng/lat of closest point)
function nearestPointOnSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): { lng: number; lat: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { lng: ax, lat: ay };
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { lng: ax + t * dx, lat: ay + t * dy };
}

// Compute cumulative distance along route coords up to the nearest projection of a point
function distanceAlongRoute(
  pointLng: number, pointLat: number,
  routeCoords: [number, number][]
): number {
  let cumDist = 0;
  let minProjDist = Infinity;
  let distAtProjection = 0;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [aLng, aLat] = routeCoords[i];
    const [bLng, bLat] = routeCoords[i + 1];
    const nearest = nearestPointOnSegment(pointLng, pointLat, aLng, aLat, bLng, bLat);
    const projDist = haversineDistanceSimple(pointLat, pointLng, nearest.lat, nearest.lng);
    if (projDist < minProjDist) {
      minProjDist = projDist;
      const segToNearest = haversineDistanceSimple(aLat, aLng, nearest.lat, nearest.lng);
      distAtProjection = cumDist + segToNearest;
    }
    cumDist += haversineDistanceSimple(aLat, aLng, bLat, bLng);
  }
  return distAtProjection;
}

// Re-index snapped segments when a waypoint is removed.
// Segment i connects waypoint[i] to waypoint[i+1], so removing waypoint at
// Deep-copy snapped segments for undo history (before mutations)
function snapshotSegments(
  segments: Map<number, [number, number][]>
): Map<number, [number, number][]> {
  return new Map(
    Array.from(segments.entries()).map(
      ([k, v]) => [k, [...v]] as [number, [number, number][]]
    )
  );
}

// removedIndex invalidates segments removedIndex-1 and removedIndex,
// and all later segments shift down by 1.
function reindexSegmentsOnRemove(
  removedIndex: number,
  segments: Map<number, [number, number][]>
) {
  // Delete the segment BEFORE the removed waypoint (prev → removed)
  if (removedIndex > 0) segments.delete(removedIndex - 1);
  // Delete the segment AT the removed waypoint (removed → next)
  segments.delete(removedIndex);

  // Build new map with shifted indices
  const shifted = new Map<number, [number, number][]>();
  for (const [key, value] of segments) {
    if (key < removedIndex) {
      shifted.set(key, value);
    } else {
      // key > removedIndex (we already deleted key === removedIndex)
      shifted.set(key - 1, value);
    }
  }

  segments.clear();
  for (const [key, value] of shifted) {
    segments.set(key, value);
  }
}

// Build the full rendered route line coordinates from snapped segments + spine waypoints
function getRenderedRouteCoords(
  waypoints: Array<{ lng: number; lat: number }>,
  segments: Map<number, [number, number][]>
): [number, number][] {
  if (waypoints.length < 2) return waypoints.map((w) => [w.lng, w.lat]);
  if (segments.size === 0) return waypoints.map((w) => [w.lng, w.lat]);

  const coords: [number, number][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const seg = segments.get(i);
    if (seg && seg.length > 0) {
      if (coords.length === 0) {
        coords.push(...seg);
      } else {
        coords.push(...seg.slice(1));
      }
    } else {
      if (coords.length === 0) {
        coords.push([waypoints[i].lng, waypoints[i].lat]);
      }
      coords.push([waypoints[i + 1].lng, waypoints[i + 1].lat]);
    }
  }
  return coords;
}

// Check if coordinates are within Great Britain (England, Scotland, Wales)
function isWithinGB(lng: number, lat: number): boolean {
  return lat >= GB_BOUNDS.south &&
         lat <= GB_BOUNDS.north &&
         lng >= GB_BOUNDS.west &&
         lng <= GB_BOUNDS.east;
}

// Check if a point is on water by querying ALL rendered features at that point
function isOnWater(map: mapboxgl.Map, point: mapboxgl.Point): boolean {
  const features = map.queryRenderedFeatures(point);
  if (features.length === 0) return false;
  // Check all features — water may be beneath labels, roads, etc.
  for (const feature of features) {
    const layerId = feature.layer?.id || "";
    const sourceLayer = feature.sourceLayer || "";
    if (
      layerId.includes("water") ||
      sourceLayer === "water" ||
      feature.properties?.class === "ocean" ||
      feature.properties?.class === "lake" ||
      feature.properties?.class === "river" ||
      feature.properties?.class === "sea"
    ) {
      return true;
    }
  }
  return false;
}

// POI waypoint icon SVGs (used in creation mode markers)
const POI_ICON_SVGS: Record<string, string> = {
  viewpoint: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><circle cx="8" cy="6" r="3" fill="none" stroke="white" stroke-width="1.5"/><path d="M1 13c2-4 5-6 7-6s5 2 7 6" fill="none" stroke="white" stroke-width="1.5"/></svg>`,
  water: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><path d="M8 2C8 2 4 7 4 10a4 4 0 008 0c0-3-4-8-4-8z" fill="white"/></svg>`,
  hazard: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><path d="M8 1L1 15h14L8 1z" fill="none" stroke="white" stroke-width="1.5"/><text x="8" y="13" text-anchor="middle" fill="white" font-size="8" font-weight="bold">!</text></svg>`,
  parking: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><text x="8" y="13" text-anchor="middle" fill="white" font-size="13" font-weight="bold">P</text></svg>`,
  pub: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><path d="M4 2h8v5c0 2-1.5 3-4 3s-4-1-4-3V2z" fill="none" stroke="white" stroke-width="1.3"/><line x1="8" y1="10" x2="8" y2="13" stroke="white" stroke-width="1.3"/><line x1="5" y1="13" x2="11" y2="13" stroke="white" stroke-width="1.3"/></svg>`,
  gate: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><rect x="2" y="3" width="12" height="10" rx="1" fill="none" stroke="white" stroke-width="1.3"/><line x1="8" y1="3" x2="8" y2="13" stroke="white" stroke-width="1.3"/></svg>`,
  rest: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><path d="M2 10h12M4 10V6c0-1 1-2 2-2h0c1 0 2 1 2 2v4M10 10V8c0-1 1-1.5 2-1.5s2 .5 2 1.5v2" fill="none" stroke="white" stroke-width="1.3"/></svg>`,
  historic: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><path d="M3 14V6l5-4 5 4v8H3z" fill="none" stroke="white" stroke-width="1.3"/><rect x="6" y="9" width="4" height="5" fill="none" stroke="white" stroke-width="1"/></svg>`,
  wildlife: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><circle cx="8" cy="8" r="6" fill="none" stroke="white" stroke-width="1.3"/><circle cx="6" cy="7" r="1" fill="white"/><circle cx="10" cy="7" r="1" fill="white"/></svg>`,
  bridge: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><path d="M1 10c3-4 4-4 7-4s4 0 7 4" fill="none" stroke="white" stroke-width="1.5"/><line x1="4" y1="6" x2="4" y2="14" stroke="white" stroke-width="1.3"/><line x1="12" y1="6" x2="12" y2="14" stroke="white" stroke-width="1.3"/></svg>`,
  ford: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><path d="M1 8h14" stroke="white" stroke-width="1.5"/><path d="M1 11c2-1 4 1 6 0s4 1 6 0" fill="none" stroke="white" stroke-width="1.3"/></svg>`,
  stile: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><line x1="4" y1="2" x2="4" y2="14" stroke="white" stroke-width="1.5"/><line x1="12" y1="2" x2="12" y2="14" stroke="white" stroke-width="1.5"/><line x1="4" y1="8" x2="12" y2="8" stroke="white" stroke-width="1.5"/></svg>`,
  other: `<svg viewBox="0 0 16 16" fill="white" width="12" height="12"><circle cx="8" cy="6" r="2.5" fill="none" stroke="white" stroke-width="1.5"/><path d="M8 9v3" stroke="white" stroke-width="1.5"/><circle cx="8" cy="14" r="1" fill="white"/></svg>`,
};

// Cluster colours
const CLUSTER_COLOR = "#2D6A3F"; // Dark green inner
const CLUSTER_GLOW = "rgba(62, 120, 80, 0.45)"; // Lighter green outer glow

// Draw a cluster image with count baked in (dark green circle + glow border)
// Returns {width, height, data} for map.addImage()
function createClusterImage(
  count: number,
  radius: number
): { width: number; height: number; data: Uint8Array } {
  const glowPad = 8;
  const size = (radius + glowPad) * 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;

  // Outer glow ring
  ctx.beginPath();
  ctx.arc(cx, cx, radius + 4, 0, Math.PI * 2);
  ctx.fillStyle = CLUSTER_GLOW;
  ctx.fill();

  // Inner dark green circle
  ctx.beginPath();
  ctx.arc(cx, cx, radius - 2, 0, Math.PI * 2);
  ctx.fillStyle = CLUSTER_COLOR;
  ctx.fill();

  // Count text
  const label = count >= 1000 ? `${Math.round(count / 1000)}k` : String(count);
  const fontSize = label.length > 2 ? radius * 0.7 : radius * 0.85;
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cx + 1);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: new Uint8Array(imageData.data.buffer) };
}

// Pre-generate cluster images for all needed counts and register them on the map
function ensureClusterImages(map: mapboxgl.Map, counts: number[]) {
  for (const count of counts) {
    const id = `cluster-${count}`;
    if (map.hasImage(id)) continue;
    // Scale radius by count
    const radius = count < 10 ? 54 : count < 30 ? 63 : count < 100 ? 72 : 81;
    const img = createClusterImage(count, radius);
    map.addImage(id, img, { pixelRatio: 2 });
  }
}

// Map style options
const MAP_STYLES = {
  outdoors: "mapbox://styles/mapbox/outdoors-v12", // Shows trails!
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  light: "mapbox://styles/mapbox/light-v11",
};

// Path layer visibility (compatibility with Google Maps version)
export interface PathLayers {
  bridleways: boolean;
  boats: boolean;
  footpaths: boolean;
  permissive: boolean;
}

export interface RoutesMapMapboxProps {
  routes?: any[];
  onRouteClick?: (routeId: string) => void;
  onRoutePreview?: (route: any) => void;
  onClusterClick?: (routeIds: string[], count: number) => void;
  onVisibleRoutesChange?: (routeIds: string[]) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  highlightedRouteId?: string | null;
  selectedRouteId?: string | null;
  // Direct route data for selected route (used when route may not be in routes array)
  selectedRouteData?: any;
  // Map type - accepts both Mapbox style names and Google Maps style names for compatibility
  mapType?: "outdoors" | "streets" | "satellite" | "light" | "roadmap" | "terrain" | "hybrid";
  // Creation mode props
  isCreating?: boolean;
  isPlotting?: boolean;
  snapEnabled?: boolean;
  waypoints?: Waypoint[];
  routeType?: "linear" | "circular";
  routeStyle?: RouteStyle;
  toolMode?: ToolMode;
  onWaypointAdd?: (lat: number, lng: number, snapped?: boolean, pathType?: string) => void;
  onWaypointUpdate?: (id: string, lat: number, lng: number, snapped?: boolean, segmentsSnapshot?: Map<number, [number, number][]>) => void;
  onWaypointRemove?: (id: string, segmentsSnapshot?: Map<number, [number, number][]>) => void;
  onWaypointInsert?: (index: number, lat: number, lng: number, snapped?: boolean, pathType?: string) => void;
  onCircularDetected?: (isCircular: boolean) => void;
  // Layer settings (compatibility props - some not yet implemented)
  pathLayers?: PathLayers;
  propertyPins?: any[];
  // Route display styling
  displayRouteColor?: string;
  displayRouteThickness?: number;
  displayRouteOpacity?: number;
  // Navigation/recording
  userPosition?: { lat: number; lng: number; heading: number } | null;
  followUser?: boolean;
  navSegmentIndex?: number;
  recordedPath?: { lat: number; lng: number }[];
  // POI (Points of Interest)
  pois?: Array<{
    id: string;
    name: string;
    category: string;
    coordinates: { lat: number; lng: number };
    address?: string;
    distance?: number;
  }>;
  onPoiClick?: (poi: any) => void;
  // Waypoint markers for selected route
  routeWaypoints?: Array<{
    id: string;
    lat: number;
    lng: number;
    name?: string | null;
    description?: string | null;
    icon_type?: string | null;
    tag?: string | null;
    order_index: number;
  }>;
  showWaypoints?: boolean;
  onWaypointClick?: (waypointId: string) => void;
  // Hazard markers for selected route
  routeHazards?: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string;
    hazard_type: string;
    severity: string;
    description?: string;
    status: string;
  }>;
  showHazards?: boolean;
  onHazardResolve?: (hazardId: string) => void;
  isAuthenticated?: boolean;
  // Hazard placement mode
  placingHazard?: boolean;
  onHazardPlaced?: (lat: number, lng: number) => void;
  // Route waypoint placement mode (for adding waypoints during route creation)
  placingRouteWaypoint?: boolean;
  onRouteWaypointPlaced?: (lat: number, lng: number) => void;
  // POI waypoints during route creation (temporary, not yet saved)
  creationPOIs?: Array<{
    id: string;
    lat: number;
    lng: number;
    name: string;
    icon_type?: string;
    tag?: string;
  }>;
  onCreationPOIAdd?: (lat: number, lng: number) => void;
  onCreationPOIUpdate?: (id: string, lat: number, lng: number) => void;
  onCreationPOIRemove?: (id: string) => void;
  onCreationPOIEdit?: (id: string) => void;
}

export interface RoutesMapMapboxHandle {
  panTo: (lat: number, lng: number) => void;
  setZoom: (zoom: number) => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitBounds: (coordinates: [number, number][], padding?: { top?: number; right?: number; bottom?: number; left?: number }) => void;
  getMap: () => mapboxgl.Map | null;
  highlightRoute: (routeId: string | null) => void;
  setMapType: (type: string) => void;
  showPropertyInfoWindow: (propertyId: string) => void;
  getRouteGeometry: () => [number, number][];
  clearSnappedSegments: () => void;
  getSnappedSegments: () => Map<number, [number, number][]>;
  restoreSnappedSegments: (segments: Map<number, [number, number][]>) => void;
}

// Convert Google Maps map types to Mapbox styles
function getMapboxStyle(mapType: string): string {
  const styleMap: Record<string, string> = {
    // Mapbox native styles
    outdoors: "mapbox://styles/mapbox/outdoors-v12",
    streets: "mapbox://styles/mapbox/streets-v12",
    satellite: "mapbox://styles/mapbox/satellite-streets-v12",
    light: "mapbox://styles/mapbox/light-v11",
    // Google Maps style names -> Mapbox equivalents
    roadmap: "mapbox://styles/mapbox/streets-v12",
    terrain: "mapbox://styles/mapbox/outdoors-v12", // Outdoors is best for terrain
    hybrid: "mapbox://styles/mapbox/satellite-streets-v12",
  };
  return styleMap[mapType] || MAP_STYLES.outdoors;
}

export const RoutesMapMapbox = forwardRef<RoutesMapMapboxHandle, RoutesMapMapboxProps>(
  (
    {
      routes = [],
      onRouteClick,
      onRoutePreview,
      onClusterClick,
      onVisibleRoutesChange,
      center = { lat: 52.2, lng: -2.2 },
      zoom = 10,
      highlightedRouteId,
      selectedRouteId,
      selectedRouteData,
      mapType = "outdoors",
      isCreating = false,
      isPlotting = false,
      snapEnabled = false,
      waypoints = [],
      routeType = "linear",
      routeStyle = { color: "#3B82F6", thickness: 4, opacity: 100 },
      toolMode = "plot",
      onWaypointAdd,
      onWaypointUpdate,
      onWaypointRemove,
      onWaypointInsert,
      onCircularDetected,
      pathLayers,
      propertyPins = [],
      displayRouteColor = "#3B82F6",
      displayRouteThickness = 4,
      displayRouteOpacity = 80,
      userPosition,
      followUser = false,
      navSegmentIndex,
      recordedPath = [],
      pois = [],
      onPoiClick,
      routeWaypoints = [],
      showWaypoints = false,
      onWaypointClick,
      routeHazards = [],
      showHazards = false,
      onHazardResolve,
      isAuthenticated = false,
      placingHazard = false,
      onHazardPlaced,
      placingRouteWaypoint = false,
      onRouteWaypointPlaced,
      creationPOIs = [],
      onCreationPOIAdd,
      onCreationPOIUpdate,
      onCreationPOIRemove,
      onCreationPOIEdit,
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const poiMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const propertyMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const popupRef = useRef<mapboxgl.Popup | null>(null);
    const waypointMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
    const routeWaypointMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const routeWaypointPopupsRef = useRef<mapboxgl.Popup[]>([]);
    const hazardMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const hazardPopupsRef = useRef<mapboxgl.Popup[]>([]);
    const placementMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const startEndMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const userDotMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const userFollowingRef = useRef(false);
    // Flag to prevent map click from firing when a marker was clicked
    const markerClickedRef = useRef(false);
    // Snapped route segments: stores road-following geometry per segment
    // Key: "wpIndex" (0, 1, 2...), Value: array of [lng, lat] coordinates for that segment
    const snappedSegmentsRef = useRef<Map<number, [number, number][]>>(new Map());

    const { isLoaded, loadError } = useMapbox();
    const [mapLoaded, setMapLoaded] = useState(false);

    // Refs to avoid stale closures in map event handlers
    const isCreatingRef = useRef(isCreating);
    const isPlottingRef = useRef(isPlotting);
    const toolModeRef = useRef(toolMode);
    const snapEnabledRef = useRef(snapEnabled);
    const onWaypointAddRef = useRef(onWaypointAdd);
    const onWaypointUpdateRef = useRef(onWaypointUpdate);
    const onWaypointRemoveRef = useRef(onWaypointRemove);
    const onWaypointInsertRef = useRef(onWaypointInsert);
    const onCircularDetectedRef = useRef(onCircularDetected);
    const waypointsRef = useRef(waypoints);
    const onCreationPOIAddRef = useRef(onCreationPOIAdd);
    const onCreationPOIUpdateRef = useRef(onCreationPOIUpdate);
    const onCreationPOIRemoveRef = useRef(onCreationPOIRemove);
    const onCreationPOIEditRef = useRef(onCreationPOIEdit);
    const creationPOIMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
    isCreatingRef.current = isCreating;
    isPlottingRef.current = isPlotting;
    toolModeRef.current = toolMode;
    snapEnabledRef.current = snapEnabled;
    onWaypointAddRef.current = onWaypointAdd;
    onWaypointUpdateRef.current = onWaypointUpdate;
    onWaypointRemoveRef.current = onWaypointRemove;
    onWaypointInsertRef.current = onWaypointInsert;
    onCircularDetectedRef.current = onCircularDetected;
    waypointsRef.current = waypoints;
    const onClusterClickRef = useRef(onClusterClick);
    onClusterClickRef.current = onClusterClick;
    const onVisibleRoutesChangeRef = useRef(onVisibleRoutesChange);
    onVisibleRoutesChangeRef.current = onVisibleRoutesChange;
    onCreationPOIAddRef.current = onCreationPOIAdd;
    onCreationPOIUpdateRef.current = onCreationPOIUpdate;
    onCreationPOIRemoveRef.current = onCreationPOIRemove;
    onCreationPOIEditRef.current = onCreationPOIEdit;

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      panTo: (lat: number, lng: number) => {
        mapRef.current?.panTo([lng, lat]);
      },
      setZoom: (zoom: number) => {
        mapRef.current?.setZoom(zoom);
      },
      flyTo: (lat: number, lng: number, zoom?: number) => {
        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: zoom || mapRef.current.getZoom(),
          duration: 1500,
          essential: true,
        });
      },
      fitBounds: (coordinates: [number, number][], padding?: { top?: number; right?: number; bottom?: number; left?: number }) => {
        if (!mapRef.current || coordinates.length === 0) return;

        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));

        // Generous padding — bottom accounts for mini card + iOS browser chrome
        const isMobile = window.innerWidth < 768;
        const defaultPadding = isMobile
          ? { top: 80, bottom: 320, left: 40, right: 40 }
          : { top: 80, bottom: 220, left: 100, right: 100 };

        try {
          mapRef.current.fitBounds(bounds, {
            padding: padding || defaultPadding,
            duration: 1000,
            maxZoom: 15,
          });
        } catch (e) {
          // Fallback: just fly to center of bounds
          const center = bounds.getCenter();
          mapRef.current.flyTo({ center, zoom: 13, duration: 1000 });
        }
      },
      getMap: () => mapRef.current,
      highlightRoute: (routeId: string | null) => {
        // TODO: Implement route highlighting
        console.log("highlightRoute called:", routeId);
      },
      setMapType: (type: string) => {
        mapRef.current?.setStyle(getMapboxStyle(type));
      },
      showPropertyInfoWindow: (propertyId: string) => {
        // TODO: Implement property info window
        console.log("showPropertyInfoWindow called:", propertyId);
      },
      // Clear all snapped segments and trigger re-snap
      clearSnappedSegments: () => {
        snappedSegmentsRef.current.clear();
        setResnapTrigger(prev => prev + 1);
      },
      // Snapshot current snapped segments (deep copy for undo history)
      getSnappedSegments: () => {
        return snapshotSegments(snappedSegmentsRef.current);
      },
      // Restore snapped segments from a previous snapshot
      restoreSnappedSegments: (segments: Map<number, [number, number][]>) => {
        snappedSegmentsRef.current.clear();
        segments.forEach((coords, key) => {
          snappedSegmentsRef.current.set(key, coords);
        });
        // Trigger re-render to update the displayed line
        setStyleLoadCount(prev => prev + 1);
      },
      // Get the full route geometry (snapped if available, straight-line fallback)
      getRouteGeometry: (): [number, number][] => {
        const wps = waypointsRef.current;
        if (wps.length < 2) return wps.map(wp => [wp.lng, wp.lat]);

        const segments = snappedSegmentsRef.current;
        if (segments.size === 0) {
          const coords = wps.map(wp => [wp.lng, wp.lat] as [number, number]);
          // Include closing segment for circular routes
          if (routeType === "circular" && wps.length > 2) {
            coords.push([wps[0].lng, wps[0].lat]);
          }
          return coords;
        }

        // Build full geometry from snapped segments
        const coords: [number, number][] = [];
        for (let i = 0; i < wps.length - 1; i++) {
          const seg = segments.get(i);
          if (seg && seg.length > 0) {
            if (coords.length === 0) {
              coords.push(...seg);
            } else {
              coords.push(...seg.slice(1));
            }
          } else {
            if (coords.length === 0) {
              coords.push([wps[i].lng, wps[i].lat]);
            }
            coords.push([wps[i + 1].lng, wps[i + 1].lat]);
          }
        }

        // Include closing segment for circular routes
        if (routeType === "circular" && wps.length > 2) {
          const closingSeg = segments.get(wps.length - 1);
          if (closingSeg && closingSeg.length > 0) {
            coords.push(...closingSeg.slice(1));
          } else {
            coords.push([wps[0].lng, wps[0].lat]);
          }
        }

        return coords;
      },
    }));

    // Initialize map
    useEffect(() => {
      if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

      // Set access token right before creating the map
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) {
        console.error("Mapbox token not found in environment variables");
        return;
      }
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: getMapboxStyle(mapType),
        center: [center.lng, center.lat],
        zoom: zoom,
        // Performance optimizations
        antialias: true,
        // Disable default controls (we'll add custom ones)
        attributionControl: false,
      });

      // Add minimal attribution (required by Mapbox)
      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right"
      );

      // Don't add NavigationControl - we use our own custom controls

      // Function to add sources and layers (called on load and style change)
      const setupSourcesAndLayers = () => {
        // Load custom pin images (survives style reloads)
        if (!map.hasImage("route-pin")) {
          map.loadImage("/Pins/route-pin.png", (err, img) => {
            if (!err && img && !map.hasImage("route-pin")) {
              map.addImage("route-pin", img, { pixelRatio: 2 });
            }
          });
        }
        if (!map.hasImage("property-pin")) {
          map.loadImage("/Pins/property-pin.png", (err, img) => {
            if (!err && img && !map.hasImage("property-pin")) {
              map.addImage("property-pin", img, { pixelRatio: 2 });
            }
          });
        }

        if (!map.getSource("routes")) {
          map.addSource("routes", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        if (!map.getLayer("routes-line")) {
          map.addLayer({
            id: "routes-line",
            type: "line",
            source: "routes",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": displayRouteColor,
              "line-width": displayRouteThickness,
              "line-opacity": displayRouteOpacity / 100,
            },
          });
        }

        if (!map.getSource("creation-route")) {
          map.addSource("creation-route", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        if (!map.getLayer("creation-route-line")) {
          map.addLayer({
            id: "creation-route-line",
            type: "line",
            source: "creation-route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": routeStyle.color,
              "line-width": routeStyle.thickness,
              "line-opacity": routeStyle.opacity / 100,
            },
          });
        }

        // Invisible wider hit area for insert mode clicking on route line
        if (!map.getLayer("creation-route-line-hitarea")) {
          map.addLayer({
            id: "creation-route-line-hitarea",
            type: "line",
            source: "creation-route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "transparent", "line-width": 20 },
          });
        }
      };

      map.on("load", () => {
        setMapLoaded(true);
        setupSourcesAndLayers();
      });

      map.on("error", (e) => {
        console.error("Mapbox map error:", e.error);
      });

      // Re-add sources when style changes
      map.on("style.load", () => {
        setupSourcesAndLayers();
      });

      // Handle click on map for adding waypoints (Great Britain only, not water)
      // Uses refs to avoid stale closures since this runs once on mount
      map.on("click", async (e) => {
        if (!isCreatingRef.current || !isPlottingRef.current) return;

        // Skip if a marker was just clicked (flag set by marker click handler)
        if (markerClickedRef.current) {
          markerClickedRef.current = false;
          return;
        }

        const mode = toolModeRef.current;

        // --- INSERT MODE (POI Waypoint) ---
        if (mode === "insert") {
          const { lng, lat } = e.lngLat;
          const wps = waypointsRef.current;
          if (wps.length < 2) {
            toast.error("Plot at least 2 route points before adding waypoints");
            return;
          }

          // Build the actual rendered route line coordinates (snapped road geometry)
          const routeCoords = getRenderedRouteCoords(wps, snappedSegmentsRef.current);

          // Find nearest point on the rendered route line
          let minDistKm = Infinity;
          let snapLng = lng;
          let snapLat = lat;
          for (let i = 0; i < routeCoords.length - 1; i++) {
            const nearest = nearestPointOnSegment(lng, lat, routeCoords[i][0], routeCoords[i][1], routeCoords[i + 1][0], routeCoords[i + 1][1]);
            const distKm = haversineDistanceSimple(lat, lng, nearest.lat, nearest.lng);
            if (distKm < minDistKm) {
              minDistKm = distKm;
              snapLng = nearest.lng;
              snapLat = nearest.lat;
            }
          }

          // Snap tolerance scales with zoom — 50m when zoomed in, up to 200m zoomed out
          const zoom = map.getZoom();
          const snapToleranceKm = zoom >= 14 ? 0.05 : zoom >= 12 ? 0.1 : 0.2;
          if (minDistKm > snapToleranceKm) {
            const distM = Math.round(minDistKm * 1000);
            const toleranceM = Math.round(snapToleranceKm * 1000);
            toast.error(
              `Too far from the route line (${distM}m away). Click within ${toleranceM}m of the route to place a waypoint.`
            );
            return;
          }

          // Snap the POI to the nearest point on the actual line
          onCreationPOIAddRef.current?.(snapLat, snapLng);
          return;
        }

        // --- PLOT MODE ---
        if (mode !== "plot") return;

        const { lng, lat } = e.lngLat;

        // Check if point is within Great Britain bounds
        if (!isWithinGB(lng, lat)) {
          toast.error("Routes can only be created within England, Scotland & Wales");
          return;
        }

        // Check if point is on water (sea, lakes, rivers)
        if (isOnWater(map, e.point)) {
          toast.error("Waypoints cannot be placed on water");
          return;
        }

        // Block waypoints closer than 7.5m to any existing waypoint
        const wps = waypointsRef.current;
        for (const wp of wps) {
          const distKm = haversineDistanceSimple(wp.lat, wp.lng, lat, lng);
          if (distKm < 0.0075) { // 7.5m = 0.0075km
            toast.error("Too close to an existing waypoint (min 7.5m apart)");
            return;
          }
        }

        // Circular route detection: if user clicks near the start point
        // after plotting 3+ waypoints, close the loop
        if (wps.length >= 3) {
          const first = wps[0];
          const distToStart = haversineDistanceSimple(first.lat, first.lng, lat, lng);
          if (distToStart < 0.015) { // Within ~15m of start
            onCircularDetectedRef.current?.(true);
            return;
          }
        }

        if (snapEnabledRef.current) {
          if (wps.length === 0) {
            // First waypoint — snap to nearest road using a tiny-offset
            // Directions call so the start marker sits on a road/path
            try {
              const offset = 0.00005; // ~5m offset
              const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/walking/${lng},${lat};${lng + offset},${lat}?access_token=${mapboxgl.accessToken}&geometries=geojson&overview=full`
              );
              const data = await response.json();
              if (data.routes?.[0]?.geometry?.coordinates) {
                const coords = data.routes[0].geometry.coordinates as [number, number][];
                const snappedStart = coords[0];
                const snappedLat = snappedStart[1];
                const snappedLng = snappedStart[0];

                // Check if snapped point is too far from click (>25m = off-road)
                const snapDrift = haversineDistanceSimple(lat, lng, snappedLat, snappedLng);
                if (snapDrift > 0.025) {
                  console.warn("Snap: first point too far from road (", Math.round(snapDrift * 1000), "m), placing unsnapped");
                  onWaypointAddRef.current?.(lat, lng, false);
                  return;
                }

                onWaypointAddRef.current?.(snappedLat, snappedLng, true, "road");
                return;
              }
              console.warn("Snap: no route found for first waypoint, placing unsnapped");
              onWaypointAddRef.current?.(lat, lng, false);
            } catch (err) {
              console.warn("Snap: API error for first waypoint", err);
              onWaypointAddRef.current?.(lat, lng, false);
            }
          } else {
            // Subsequent waypoints — route from last waypoint and snap
            try {
              const prev = wps[wps.length - 1];
              const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/walking/${prev.lng},${prev.lat};${lng},${lat}?access_token=${mapboxgl.accessToken}&geometries=geojson&overview=full`
              );
              const data = await response.json();
              if (data.routes?.[0]?.geometry?.coordinates) {
                const routeCoords = data.routes[0].geometry.coordinates as [number, number][];
                const snappedPoint = routeCoords[routeCoords.length - 1];
                const snappedLat = snappedPoint[1];
                const snappedLng = snappedPoint[0];

                // Check if snapped destination is too far from click (>25m)
                // If so, the user clicked off-road — place unsnapped instead
                const snapDrift = haversineDistanceSimple(lat, lng, snappedLat, snappedLng);
                if (snapDrift > 0.025) {
                  console.warn("Snap: destination too far from road (", Math.round(snapDrift * 1000), "m), placing unsnapped");
                  onWaypointAddRef.current?.(lat, lng, false);
                  return;
                }

                // Check snapped position against existing waypoints (7.5m min)
                let tooClose = false;
                for (const wp of wps) {
                  if (haversineDistanceSimple(wp.lat, wp.lng, snappedLat, snappedLng) < 0.0075) {
                    tooClose = true;
                    break;
                  }
                }
                if (tooClose) {
                  toast.error("Too close to an existing waypoint (min 7.5m apart)");
                  return;
                }

                // Route detour sanity check — if walking route is >5x the
                // straight-line distance, the API is routing "all the way
                // around". Still snap the point but use a straight line.
                const detour = isRouteDetour(
                  data.routes[0].distance || 0,
                  prev.lat, prev.lng, snappedLat, snappedLng
                );

                // For the first segment (wp0→wp1), keep wp0's actual position
                // as the start of the segment so the line starts at the marker
                if (wps.length === 1) {
                  routeCoords[0] = [prev.lng, prev.lat];
                }

                // Store road-following geometry only if route is reasonable
                if (!detour) {
                  const segIndex = wps.length - 1;
                  snappedSegmentsRef.current.set(segIndex, routeCoords);
                }
                onWaypointAddRef.current?.(snappedLat, snappedLng, true, "road");
                return;
              }
              // Directions failed — fall back to unsnapped
              console.warn("Snap: no route found for segment, placing unsnapped");
              onWaypointAddRef.current?.(lat, lng, false);
            } catch (err) {
              console.warn("Snap: API error for segment", err);
              onWaypointAddRef.current?.(lat, lng, false);
            }
          }
        } else {
          // Snap disabled — place directly
          onWaypointAddRef.current?.(lat, lng);
        }
      });

      // Cursor changes for insert mode on route line
      map.on("mouseenter", "creation-route-line-hitarea", () => {
        if (toolModeRef.current === "insert") {
          map.getCanvas().style.cursor = "copy";
        }
      });
      map.on("mouseleave", "creation-route-line-hitarea", () => {
        if (isCreatingRef.current && isPlottingRef.current) {
          map.getCanvas().style.cursor = toolModeRef.current === "plot" ? "crosshair" : "default";
        }
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, [isLoaded]);

    // Track style load count to trigger re-renders of sources/layers
    const [styleLoadCount, setStyleLoadCount] = useState(0);
    // Counter to trigger re-snapping after segments are cleared (e.g. undo)
    const [resnapTrigger, setResnapTrigger] = useState(0);

    // Update map style when mapType changes
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      const map = mapRef.current;

      // Listen for style load completion to re-add sources/layers
      const handleStyleLoad = () => {
        setStyleLoadCount(prev => prev + 1);
      };

      map.once("style.load", handleStyleLoad);
      map.setStyle(getMapboxStyle(mapType));

      return () => {
        map.off("style.load", handleStyleLoad);
      };
    }, [mapType, mapLoaded]);

    // Update cursor based on mode — use mousemove handler to enforce it
    // because Mapbox internally resets cursor on hover/drag events
    useEffect(() => {
      if (!mapRef.current) return;
      const map = mapRef.current;

      if (isCreating && isPlotting) {
        const cursors: Record<string, string> = { plot: "crosshair", erase: "not-allowed", insert: "copy" };
        const cursor = cursors[toolMode] || "default";
        map.getCanvas().style.cursor = cursor;
        // Continuously enforce cursor on mousemove to prevent Mapbox overriding it
        const enforceCursor = () => { map.getCanvas().style.cursor = cursor; };
        map.on("mousemove", enforceCursor);
        return () => { map.off("mousemove", enforceCursor); };
      } else {
        map.getCanvas().style.cursor = "";
      }
    }, [isCreating, isPlotting, toolMode]);

    // Store routes data for click handlers
    const routesDataRef = useRef<Map<string, any>>(new Map());

    // Add clustered route pins using Mapbox native clustering + symbol layers
    // All pins are rendered as native GL layers (no HTML DOM markers) for snappy performance
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      const pinLayers = ["clusters", "unclustered-point"];

      // Hide all route pins/clusters when entering creation mode or navigating
      if (isCreating || followUser) {
        const map = mapRef.current;
        for (const layer of pinLayers) {
          if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", "none");
        }
        return;
      }

      // Restore cluster layer visibility when leaving creation mode
      const map = mapRef.current;
      for (const layer of pinLayers) {
        if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", "visible");
      }

      // Store routes data for later lookup
      routesDataRef.current.clear();
      routes.forEach(r => routesDataRef.current.set(r.id, r));

      // Create GeoJSON features for clustering
      const features = routes
        .filter(route => route.geometry?.coordinates?.length > 0)
        .map(route => ({
          type: "Feature" as const,
          properties: {
            id: route.id,
            title: route.title || "Untitled Route",
            difficulty: route.difficulty || "unrated",
            distance_km: route.distance_km || 0,
          },
          geometry: {
            type: "Point" as const,
            coordinates: route.geometry.coordinates[0],
          },
        }));

      // Add or update the clustered source
      const sourceId = "route-pins";
      const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource;

      if (existingSource) {
        // Silent update — just swap the data, native layers auto-sync
        existingSource.setData({
          type: "FeatureCollection",
          features,
        });
        // Generate cluster images + notify visible routes after data settles
        map.once("idle", () => {
          if (map.isStyleLoaded()) {
            const clusterFeatures = map.querySourceFeatures(sourceId, { filter: ["has", "point_count"] });
            const counts: number[] = [];
            clusterFeatures.forEach((f) => {
              const c = f.properties?.point_count;
              if (c && !map.hasImage(`cluster-${c}`)) counts.push(c);
            });
            if (counts.length > 0) ensureClusterImages(map, counts);
          }
          notifyVisibleRoutes(map, sourceId);
        });
        return; // Skip re-adding layers/listeners
      } else {
        // Add source with clustering
        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features,
          },
          cluster: true,
          clusterMaxZoom: 11,
          clusterRadius: 80,
        });

        // Cluster layer — single symbol layer with canvas-drawn images (circle + count baked in)
        map.addLayer({
          id: "clusters",
          type: "symbol",
          source: sourceId,
          filter: ["has", "point_count"],
          layout: {
            "icon-image": ["concat", "cluster-", ["get", "point_count"]],
            "icon-size": 1.0,
            "icon-allow-overlap": true,
            "symbol-sort-key": 1,
          },
          paint: {
            "icon-opacity-transition": { duration: 600, delay: 0 },
          },
        });

        // Individual route pins (unclustered) — custom PNG pin image
        map.addLayer({
          id: "unclustered-point",
          type: "symbol",
          source: sourceId,
          filter: ["!", ["has", "point_count"]],
          layout: {
            "icon-image": "route-pin",
            "icon-size": 0.6,
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
          },
          paint: {
            "icon-opacity-transition": { duration: 600, delay: 0 },
          },
        });

        // Click on cluster to zoom + show route cards
        map.on("click", "clusters", (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
          const clusterId = features[0].properties?.cluster_id;
          const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom,
            });
          });

          // Get all routes in this cluster for the navigation quick card
          source.getClusterLeaves(clusterId, 100, 0, (err, leaves) => {
            if (err || !leaves) return;
            const routeIds = leaves
              .map((l: any) => l.properties?.id)
              .filter(Boolean) as string[];
            if (routeIds.length > 0) {
              onClusterClickRef.current?.(routeIds, routeIds.length);
            }
          });
        });

        // Click on individual pin - directly show route + trigger preview (no popup card)
        map.on("click", "unclustered-point", (e) => {
          if (!e.features?.[0]) return;
          const props = e.features[0].properties;
          const route = routesDataRef.current.get(props?.id);

          if (!route) return;

          // Close any existing popup
          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }

          // Directly trigger route preview - parent will draw route + show quick card
          onRoutePreview?.(route);
        });

        // Change cursor on hover
        map.on("mouseenter", "clusters", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "clusters", () => {
          map.getCanvas().style.cursor = "";
        });
        map.on("mouseenter", "unclustered-point", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "unclustered-point", () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // Gather visible route IDs from unclustered pins + cluster leaves
      const notifyVisibleRoutes = (map: mapboxgl.Map, srcId: string) => {
        if (!map.isStyleLoaded()) return;
        const allIds = new Set<string>();

        // Unclustered pins visible on screen
        const unclusteredFeatures = map.querySourceFeatures(srcId, {
          filter: ["!", ["has", "point_count"]],
        });
        unclusteredFeatures.forEach((f) => {
          if (f.properties?.id) allIds.add(f.properties.id);
        });

        // Expand visible clusters
        const source = map.getSource(srcId) as mapboxgl.GeoJSONSource;
        const clusterFeatures = map.queryRenderedFeatures(undefined, { layers: ["clusters"] });
        if (clusterFeatures.length === 0) {
          if (allIds.size > 0) onVisibleRoutesChangeRef.current?.(Array.from(allIds));
          return;
        }
        let pending = clusterFeatures.length;
        for (const cf of clusterFeatures) {
          const clusterId = cf.properties?.cluster_id;
          if (!clusterId) { pending--; continue; }
          source.getClusterLeaves(clusterId, 100, 0, (_err, leaves) => {
            if (leaves) {
              for (const leaf of leaves) {
                if (leaf.properties?.id) allIds.add(leaf.properties.id);
              }
            }
            pending--;
            if (pending === 0 && allIds.size > 0) {
              onVisibleRoutesChangeRef.current?.(Array.from(allIds));
            }
          });
        }
      };

      // Generate cluster images on the fly for any counts that appear
      const generateMissingClusterImages = () => {
        if (!map.isStyleLoaded()) return;
        const clusterFeatures = map.querySourceFeatures(sourceId, {
          filter: ["has", "point_count"],
        });
        const counts = new Set<number>();
        clusterFeatures.forEach((f) => {
          const count = f.properties?.point_count;
          if (count && !map.hasImage(`cluster-${count}`)) counts.add(count);
        });
        if (counts.size > 0) ensureClusterImages(map, Array.from(counts));
      };

      // Combined idle handler: generate cluster images + notify visible routes
      const onIdle = () => {
        generateMissingClusterImages();
        notifyVisibleRoutes(map, sourceId);
      };
      map.on("idle", onIdle);

      // Also generate on data source load for faster image availability during zoom
      const onData = (e: any) => {
        if (e.sourceId === sourceId && e.isSourceLoaded) generateMissingClusterImages();
      };
      map.on("data", onData);

      // Initial run
      map.once("idle", onIdle);

      return () => {
        map.off("idle", onIdle);
        map.off("data", onData);
      };
    }, [routes, mapLoaded, isCreating, followUser, onRouteClick, onRoutePreview, styleLoadCount]);

    // Display POI markers
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      const map = mapRef.current;

      // Clear existing POI markers
      poiMarkersRef.current.forEach((marker) => marker.remove());
      poiMarkersRef.current = [];

      if (!pois || pois.length === 0) return;

      // Add POI markers
      pois.forEach((poi) => {
        const el = document.createElement("div");
        el.className = "mapbox-poi-marker";
        el.innerHTML = `
          <div style="
            width: 28px;
            height: 28px;
            background: #f97316;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="3" fill="white"/>
            </svg>
          </div>
        `;
        el.style.cursor = "pointer";

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([poi.coordinates.lng, poi.coordinates.lat])
          .addTo(map);

        // Add click handler
        el.addEventListener("click", () => {
          // Show popup with POI info
          if (popupRef.current) {
            popupRef.current.remove();
          }

          const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: "280px",
            offset: 15,
          });

          popup.setLngLat([poi.coordinates.lng, poi.coordinates.lat])
            .setHTML(`
              <div style="
                padding: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              ">
                <h3 style="
                  margin: 0 0 4px 0;
                  font-size: 15px;
                  font-weight: 600;
                  color: #1f2937;
                ">${poi.name}</h3>
                <p style="
                  margin: 0 0 8px 0;
                  font-size: 12px;
                  color: #f97316;
                  text-transform: capitalize;
                ">${poi.category}</p>
                ${poi.address ? `
                  <p style="
                    margin: 0 0 8px 0;
                    font-size: 13px;
                    color: #6b7280;
                  ">${poi.address}</p>
                ` : ''}
                ${poi.distance !== undefined ? `
                  <p style="
                    margin: 0;
                    font-size: 12px;
                    color: #10b981;
                  ">${poi.distance < 1 
                      ? (poi.distance * 1000).toFixed(0) + 'm away' 
                      : poi.distance.toFixed(1) + 'km away'
                    }</p>
                ` : ''}
              </div>
            `)
            .addTo(map);

          popupRef.current = popup;
          onPoiClick?.(poi);
        });

        poiMarkersRef.current.push(marker);
      });

      return () => {
        poiMarkersRef.current.forEach((marker) => marker.remove());
        poiMarkersRef.current = [];
      };
    }, [pois, mapLoaded, onPoiClick]);

    // Draw property pin markers
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;
      const map = mapRef.current;

      // Clear existing property markers
      propertyMarkersRef.current.forEach((marker) => marker.remove());
      propertyMarkersRef.current = [];

      if (!propertyPins || propertyPins.length === 0) return;

      propertyPins.forEach((property) => {
        if (!property.latitude || !property.longitude) return;

        const el = document.createElement("div");
        el.className = "mapbox-property-marker";
        el.innerHTML = `<img src="/Pins/property-pin.png" style="width: 36px; height: auto; cursor: pointer; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25));" alt="" />`;
        el.style.cursor = "pointer";

        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([property.longitude, property.latitude])
          .addTo(map);

        // Add click handler with popup
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (popupRef.current) popupRef.current.remove();

          const priceDisplay = property.nightly_price_pennies
            ? `£${(property.nightly_price_pennies / 100).toFixed(0)}/night`
            : "";
          const ratingDisplay = property.average_rating
            ? `★ ${property.average_rating.toFixed(1)}${property.review_count ? ` (${property.review_count})` : ""}`
            : "";

          const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: "260px",
            offset: 20,
          });

          popup.setLngLat([property.longitude, property.latitude])
            .setHTML(`
              <div style="
                padding: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              ">
                <h3 style="
                  margin: 0 0 4px 0;
                  font-size: 15px;
                  font-weight: 600;
                  color: #1f2937;
                ">${property.name}</h3>
                ${property.city ? `
                  <p style="
                    margin: 0 0 6px 0;
                    font-size: 13px;
                    color: #6b7280;
                  ">${property.city}${property.county ? `, ${property.county}` : ""}</p>
                ` : ""}
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  ${priceDisplay ? `<span style="font-size: 14px; font-weight: 600; color: #2E8B57;">${priceDisplay}</span>` : ""}
                  ${ratingDisplay ? `<span style="font-size: 13px; color: #f59e0b;">${ratingDisplay}</span>` : ""}
                </div>
                ${property.max_horses ? `
                  <p style="
                    margin: 6px 0 0 0;
                    font-size: 12px;
                    color: #6b7280;
                  ">Up to ${property.max_horses} horse${property.max_horses > 1 ? "s" : ""}</p>
                ` : ""}
              </div>
            `)
            .addTo(map);

          popupRef.current = popup;
        });

        propertyMarkersRef.current.push(marker);
      });

      return () => {
        propertyMarkersRef.current.forEach((marker) => marker.remove());
        propertyMarkersRef.current = [];
      };
    }, [propertyPins, mapLoaded]);

    // Draw route waypoint markers (from selected route)
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      // Clean up existing markers and popups
      routeWaypointPopupsRef.current.forEach((p) => p.remove());
      routeWaypointPopupsRef.current = [];
      routeWaypointMarkersRef.current.forEach((m) => m.remove());
      routeWaypointMarkersRef.current = [];

      if (!showWaypoints || routeWaypoints.length === 0) return;

      const sorted = [...routeWaypoints].sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0)
      );

      const TAG_COLORS: Record<string, string> = {
        instruction: "#3B82F6",
        poi: "#A855F7",
        caution: "#F59E0B",
        note: "#6B7280",
      };

      sorted.forEach((wp, index) => {
        const markerColor = TAG_COLORS[wp.tag || "note"] || TAG_COLORS.note;
        const el = document.createElement("div");
        el.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background: ${markerColor};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: white;
            cursor: pointer;
          ">${index + 1}</div>
        `;

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([wp.lng, wp.lat])
          .addTo(mapRef.current!);

        // Hover popup with name/description
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 15,
        }).setHTML(`
          <div style="padding: 8px; max-width: 200px;">
            <strong>${wp.name || "Waypoint " + (index + 1)}</strong>
            ${wp.description ? '<div style="font-size: 12px; color: #666; margin-top: 4px;">' + wp.description + "</div>" : ""}
          </div>
        `);

        el.addEventListener("mouseenter", () => {
          popup.setLngLat([wp.lng, wp.lat]).addTo(mapRef.current!);
        });
        el.addEventListener("mouseleave", () => {
          popup.remove();
        });

        // Click handler — scroll to waypoint in panel (dismiss popup)
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          popup.remove();
          if (onWaypointClick) {
            onWaypointClick(wp.id);
          }
        });

        routeWaypointMarkersRef.current.push(marker);
        routeWaypointPopupsRef.current.push(popup);
      });

      return () => {
        routeWaypointPopupsRef.current.forEach((p) => p.remove());
        routeWaypointPopupsRef.current = [];
        routeWaypointMarkersRef.current.forEach((m) => m.remove());
        routeWaypointMarkersRef.current = [];
      };
    }, [routeWaypoints, showWaypoints, mapLoaded, onWaypointClick]);

    // Hide waypoint markers when zoomed out (prevents overlap with clusters)
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      const WAYPOINT_HIDE_ZOOM = 11; // Hide waypoints below this zoom level

      const handleZoom = () => {
        const zoom = map.getZoom();
        const shouldShow = zoom >= WAYPOINT_HIDE_ZOOM;
        routeWaypointMarkersRef.current.forEach((m) => {
          const el = m.getElement();
          if (el) el.style.display = shouldShow ? "" : "none";
        });
        hazardMarkersRef.current.forEach((m) => {
          const el = m.getElement();
          if (el) el.style.display = shouldShow ? "" : "none";
        });
      };

      map.on("zoom", handleZoom);
      // Run once on mount to set initial visibility
      handleZoom();

      return () => {
        map.off("zoom", handleZoom);
      };
    }, [mapLoaded, routeWaypoints, showWaypoints]);

    // Hazard markers for selected route
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      hazardPopupsRef.current.forEach((p) => p.remove());
      hazardPopupsRef.current = [];
      hazardMarkersRef.current.forEach((m) => m.remove());
      hazardMarkersRef.current = [];

      if (!showHazards || routeHazards.length === 0) return;

      const severityColor: Record<string, string> = {
        low: "#3B82F6",
        medium: "#F59E0B",
        high: "#F97316",
        critical: "#EF4444",
      };

      routeHazards.forEach((hazard) => {
        if (!hazard.lat || !hazard.lng) return;

        const el = document.createElement("div");
        el.innerHTML = `
          <div style="
            width: 28px;
            height: 28px;
            background: ${severityColor[hazard.severity] || "#F59E0B"};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
          ">&#9888;</div>
        `;

        const resolveButtonHtml = isAuthenticated && hazard.status === "active"
          ? `<button id="resolve-hazard-${hazard.id}" style="
              margin-top: 8px; padding: 4px 12px; font-size: 12px;
              background: #16a34a; color: white; border: none; border-radius: 6px;
              cursor: pointer; width: 100%;
            ">&#10003; Mark as Cleared</button>`
          : "";

        const popup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          offset: 15,
        }).setHTML(`
          <div style="padding: 8px; max-width: 240px;">
            <strong>${hazard.title}</strong>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              ${hazard.hazard_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
              ${hazard.description ? "<br/>" + hazard.description : ""}
            </div>
            ${resolveButtonHtml}
          </div>
        `);

        const attachResolveListener = () => {
          if (!isAuthenticated || hazard.status !== "active") return;
          const btn = document.getElementById(`resolve-hazard-${hazard.id}`);
          if (btn) {
            btn.addEventListener("click", () => {
              onHazardResolve?.(hazard.id);
              popup.remove();
            });
          }
        };

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([hazard.lng, hazard.lat])
          .addTo(mapRef.current!);

        let popupCloseTimer: ReturnType<typeof setTimeout> | null = null;
        const showPopup = () => {
          if (popupCloseTimer) { clearTimeout(popupCloseTimer); popupCloseTimer = null; }
          popup.setLngLat([hazard.lng, hazard.lat]).addTo(mapRef.current!);
          setTimeout(() => {
            attachResolveListener();
            // Keep popup open while hovering over it
            const popupEl = popup.getElement();
            if (popupEl) {
              popupEl.addEventListener("mouseenter", () => {
                if (popupCloseTimer) { clearTimeout(popupCloseTimer); popupCloseTimer = null; }
              });
              popupEl.addEventListener("mouseleave", () => {
                popupCloseTimer = setTimeout(() => popup.remove(), 200);
              });
            }
          }, 50);
        };

        el.addEventListener("mouseenter", showPopup);
        el.addEventListener("mouseleave", () => {
          popupCloseTimer = setTimeout(() => popup.remove(), 200);
        });

        // Click also shows popup (for mobile touch)
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          showPopup();
        });

        hazardMarkersRef.current.push(marker);
        hazardPopupsRef.current.push(popup);
      });

      return () => {
        hazardPopupsRef.current.forEach((p) => p.remove());
        hazardPopupsRef.current = [];
        hazardMarkersRef.current.forEach((m) => m.remove());
        hazardMarkersRef.current = [];
      };
    }, [routeHazards, showHazards, mapLoaded, onHazardResolve, isAuthenticated]);

    // Hazard placement mode — click on/near route to place hazard
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;
      const map = mapRef.current;

      // Clean up placement marker when exiting placement mode
      if (!placingHazard) {
        placementMarkerRef.current?.remove();
        placementMarkerRef.current = null;
        map.getCanvas().style.cursor = "";
        return;
      }

      // Set crosshair cursor
      map.getCanvas().style.cursor = "crosshair";

      // Point-to-line-segment distance in meters (flat earth approx, fine at 10m scale)
      const distToSegment = (
        pLat: number, pLng: number,
        aLat: number, aLng: number,
        bLat: number, bLng: number
      ): number => {
        const latF = 111320;
        const lngF = 111320 * Math.cos((pLat * Math.PI) / 180);
        const px = pLat * latF, py = pLng * lngF;
        const ax = aLat * latF, ay = aLng * lngF;
        const bx = bLat * latF, by = bLng * lngF;
        const dx = bx - ax, dy = by - ay;
        if (dx === 0 && dy === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
        return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
      };

      const distToPolyline = (lat: number, lng: number, coords: [number, number][]): number => {
        let min = Infinity;
        for (let i = 0; i < coords.length - 1; i++) {
          const d = distToSegment(lat, lng, coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
          if (d < min) min = d;
        }
        return min;
      };

      const handleClick = (e: mapboxgl.MapMouseEvent) => {
        const { lat, lng } = e.lngLat;

        // Get route coordinates from the selected route
        const route = routes.find((r) => r.id === selectedRouteId) || selectedRouteData;
        const coords: [number, number][] = route?.geometry?.coordinates;

        if (!coords || coords.length < 2) {
          toast.error("No route geometry found");
          return;
        }

        const dist = distToPolyline(lat, lng, coords);
        if (dist > 10) {
          toast.error(`Too far from the route (${Math.round(dist)}m away). Click within 10m of the route line.`);
          return;
        }

        // Place a temporary marker
        placementMarkerRef.current?.remove();
        const el = document.createElement("div");
        el.innerHTML = `
          <div style="
            width: 32px; height: 32px; background: #EF4444;
            border: 3px solid white; border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; color: white; animation: pulse 1s infinite;
          ">&#9888;</div>
        `;
        placementMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        // Callback to parent
        onHazardPlaced?.(lat, lng);
      };

      map.on("click", handleClick);

      return () => {
        map.off("click", handleClick);
        map.getCanvas().style.cursor = "";
        placementMarkerRef.current?.remove();
        placementMarkerRef.current = null;
      };
    }, [placingHazard, mapLoaded, selectedRouteId, selectedRouteData, routes, onHazardPlaced]);

    // Route waypoint placement mode — click anywhere on map to place waypoint
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;
      const map = mapRef.current;

      // Clean up when exiting placement mode
      if (!placingRouteWaypoint) {
        map.getCanvas().style.cursor = "";
        return;
      }

      // Set crosshair cursor
      map.getCanvas().style.cursor = "crosshair";

      const handleClick = (e: mapboxgl.MapMouseEvent) => {
        const { lat, lng } = e.lngLat;
        onRouteWaypointPlaced?.(lat, lng);
      };

      map.on("click", handleClick);

      return () => {
        map.off("click", handleClick);
        map.getCanvas().style.cursor = "";
      };
    }, [placingRouteWaypoint, mapLoaded, onRouteWaypointPlaced]);

    // Draw selected route polyline with start/end markers
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      const map = mapRef.current;

      // Ensure the routes source exists
      let source = map.getSource("routes") as mapboxgl.GeoJSONSource;
      if (!source) {
        map.addSource("routes", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "routes-line",
          type: "line",
          source: "routes",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": displayRouteColor,
            "line-width": displayRouteThickness,
            "line-opacity": displayRouteOpacity / 100,
          },
        });
        source = map.getSource("routes") as mapboxgl.GeoJSONSource;
      }

      // Clear existing start/end markers
      startEndMarkersRef.current.forEach((m) => m.remove());
      startEndMarkersRef.current = [];

      if (selectedRouteId) {
        // Try to find route in routes array, or use selectedRouteData directly
        const route = routes.find((r) => r.id === selectedRouteId) || selectedRouteData;
        if (route?.geometry?.coordinates && route.geometry.coordinates.length >= 2) {
          const coords = route.geometry.coordinates;
          
          // Draw the route line
          source.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {
                  color: DIFFICULTY_COLORS[route.difficulty] || "#5E35B1",
                  width: 5,
                },
                geometry: route.geometry,
              },
            ],
          });

          // Add START/END markers only when NOT navigating
          if (!followUser) {
            const startEl = document.createElement("div");
            startEl.innerHTML = `
              <div style="
                width: 28px;
                height: 28px;
                background: #22C55E;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                color: white;
              ">S</div>
            `;
            const startMarker = new mapboxgl.Marker({ element: startEl })
              .setLngLat([coords[0][0], coords[0][1]])
              .addTo(mapRef.current!);
            startEndMarkersRef.current.push(startMarker);

            // Add END marker (red) - only if different from start
            const endCoord = coords[coords.length - 1];
            const startCoord = coords[0];
            const isSamePoint = Math.abs(endCoord[0] - startCoord[0]) < 0.0001 &&
                               Math.abs(endCoord[1] - startCoord[1]) < 0.0001;

            if (!isSamePoint) {
              const endEl = document.createElement("div");
              endEl.innerHTML = `
                <div style="
                  width: 28px;
                  height: 28px;
                  background: #EF4444;
                  border: 3px solid white;
                  border-radius: 50%;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  font-weight: bold;
                  color: white;
                ">E</div>
              `;
              const endMarker = new mapboxgl.Marker({ element: endEl })
                .setLngLat([endCoord[0], endCoord[1]])
                .addTo(mapRef.current!);
              startEndMarkersRef.current.push(endMarker);
            }
          }
        }
      } else {
        // Clear route display
        source.setData({ type: "FeatureCollection", features: [] });
      }
    }, [selectedRouteId, selectedRouteData, routes, mapLoaded, styleLoadCount, followUser]);

    // Draw creation route from waypoints
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      const map = mapRef.current;
      
      // Ensure creation-route source and layer exist (they may be removed on style change)
      let source = map.getSource("creation-route") as mapboxgl.GeoJSONSource;
      if (!source) {
        map.addSource("creation-route", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "creation-route-line",
          type: "line",
          source: "creation-route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": routeStyle.color,
            "line-width": routeStyle.thickness,
            "line-opacity": routeStyle.opacity / 100,
          },
        });
        source = map.getSource("creation-route") as mapboxgl.GeoJSONSource;
      }
      
      if (!source) return;

      // Clear existing waypoint markers
      waypointMarkersRef.current.forEach((m) => m.remove());
      waypointMarkersRef.current.clear();

      if (isCreating && waypoints.length > 0) {
        // Build route line — use snapped segments when available
        let coordinates: [number, number][];
        const segments = snappedSegmentsRef.current;

        if (segments.size > 0 && waypoints.length >= 2) {
          // Build from snapped segments
          coordinates = [];
          for (let i = 0; i < waypoints.length - 1; i++) {
            const seg = segments.get(i);
            if (seg && seg.length > 0) {
              // Add segment (skip first point after first segment to avoid dups)
              if (coordinates.length === 0) {
                coordinates.push(...seg);
              } else {
                coordinates.push(...seg.slice(1));
              }
            } else {
              // No snapped data for this segment — straight line
              if (coordinates.length === 0) {
                coordinates.push([waypoints[i].lng, waypoints[i].lat]);
              }
              coordinates.push([waypoints[i + 1].lng, waypoints[i + 1].lat]);
            }
          }
        } else {
          // No snapped data — straight lines between waypoints
          coordinates = waypoints.map((wp) => [wp.lng, wp.lat]);
        }

        // If circular, connect back to start (use snapped closing segment if available)
        if (routeType === "circular" && waypoints.length > 2) {
          const closingSeg = snappedSegmentsRef.current.get(waypoints.length - 1);
          if (closingSeg && closingSeg.length > 0) {
            coordinates.push(...closingSeg.slice(1));
          } else {
            coordinates.push([waypoints[0].lng, waypoints[0].lat]);
          }
        }

        source.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates,
              },
            },
          ],
        });

        // Add spine point markers (small dots for intermediate, labeled for S/F)
        waypoints.forEach((wp, index) => {
          const el = document.createElement("div");
          el.className = "waypoint-marker";
          const isStart = index === 0;
          // Don't show F marker for circular routes — start = finish
          const isFinish = index === waypoints.length - 1 && waypoints.length > 1 && routeType !== "circular";
          if (isStart || isFinish) {
            el.innerHTML = `
              <div style="
                width: 26px;
                height: 26px;
                background: ${isStart ? "#22C55E" : "#EF4444"};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: bold;
                color: white;
              ">${isStart ? "S" : "F"}</div>
            `;
          } else {
            el.innerHTML = `
              <div style="
                width: 8px;
                height: 8px;
                background: #3B82F6;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 1px 2px rgba(0,0,0,0.25);
              "></div>
            `;
          }
          el.style.cursor = toolMode === "erase" ? "pointer" : "move";

          const marker = new mapboxgl.Marker({
            element: el,
            draggable: toolMode === "plot" || toolMode === "insert",
          })
            .setLngLat([wp.lng, wp.lat])
            .addTo(mapRef.current!);

          // Handle drag — snap to road if close, re-fetch segments, update position
          marker.on("dragend", async () => {
            const lngLat = marker.getLngLat();
            const wps = waypointsRef.current;
            const wpIdx = wps.findIndex(w => w.id === wp.id);

            // Snapshot segments BEFORE any mutation so undo captures pre-drag state
            const preDragSegments = snapshotSegments(snappedSegmentsRef.current);

            // Drag-to-close: if the last waypoint is dragged within 15m of the start,
            // snap it onto the start and trigger circular route detection
            if (wpIdx === wps.length - 1 && wps.length >= 3 && wpIdx > 0) {
              const first = wps[0];
              const distToStart = haversineDistanceSimple(lngLat.lat, lngLat.lng, first.lat, first.lng);
              if (distToStart < 0.015) { // 15m
                // Animate the F marker snapping to S position
                marker.setLngLat([first.lng, first.lat]);

                // If snap is enabled, fetch the road-following segment from the
                // previous waypoint to the start so the closing line follows the road
                if (snapEnabledRef.current) {
                  const token = mapboxgl.accessToken;
                  if (token) {
                    const prev = wps[wpIdx - 1];
                    try {
                      const res = await fetch(
                        `https://api.mapbox.com/directions/v5/mapbox/walking/${prev.lng},${prev.lat};${first.lng},${first.lat}?access_token=${token}&geometries=geojson&overview=full`
                      );
                      const data = await res.json();
                      if (data.routes?.[0]?.geometry?.coordinates) {
                        const coords = data.routes[0].geometry.coordinates as [number, number][];
                        if (!isRouteDetour(data.routes[0].distance || 0, prev.lat, prev.lng, first.lat, first.lng)) {
                          // Store as the segment from prev → last (which is now at start position)
                          snappedSegmentsRef.current.set(wpIdx - 1, coords);
                        }
                      }
                    } catch { /* proceed without snapped segment */ }
                  }
                }

                // Update waypoint to start position then trigger circular
                onWaypointUpdateRef.current?.(wp.id, first.lat, first.lng, wp.snapped, preDragSegments);
                // Small delay so the snap animation is visible before circular triggers
                setTimeout(() => {
                  onCircularDetectedRef.current?.(true);
                }, 150);
                return;
              }
            }

            if (snapEnabledRef.current && wpIdx >= 0) {
              const token = mapboxgl.accessToken;
              if (!token) {
                onWaypointUpdateRef.current?.(wp.id, lngLat.lat, lngLat.lng, false, preDragSegments);
                return;
              }

              // Clear stale segments immediately so the line redraws correctly
              if (wpIdx > 0) snappedSegmentsRef.current.delete(wpIdx - 1);
              if (wpIdx < wps.length - 1) snappedSegmentsRef.current.delete(wpIdx);

              // Try to snap the dragged position to a nearby road
              // Use a short directions call from/to the same point area
              let finalLat = lngLat.lat;
              let finalLng = lngLat.lng;
              let snappedToRoad = false;

              // Check if there's a neighbor to route from to snap the position
              const neighbor = wpIdx > 0 ? wps[wpIdx - 1] : (wpIdx < wps.length - 1 ? wps[wpIdx + 1] : null);
              if (neighbor) {
                try {
                  const res = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/walking/${neighbor.lng},${neighbor.lat};${lngLat.lng},${lngLat.lat}?access_token=${token}&geometries=geojson&overview=full`
                  );
                  const data = await res.json();
                  if (data.routes?.[0]?.geometry?.coordinates) {
                    const coords = data.routes[0].geometry.coordinates as [number, number][];
                    const snappedEnd = coords[coords.length - 1];
                    // Check if snapped point is reasonably close to dragged position
                    const snapDist = haversineDistanceSimple(lngLat.lat, lngLat.lng, snappedEnd[1], snappedEnd[0]);
                    if (snapDist < 0.15) { // 150m — generous for rural areas
                      finalLat = snappedEnd[1];
                      finalLng = snappedEnd[0];
                      snappedToRoad = true;
                    }
                  }
                } catch { /* keep unsnapped */ }
              }

              // Fallback: if neighbor-routing didn't snap (point dragged off-road),
              // try a self-snap — find the nearest road at the dragged position
              if (!snappedToRoad) {
                try {
                  const offsetLng = lngLat.lng + 0.00005;
                  const res = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/walking/${lngLat.lng},${lngLat.lat};${offsetLng},${lngLat.lat}?access_token=${token}&geometries=geojson&overview=simplified`
                  );
                  const data = await res.json();
                  if (data.routes?.[0]?.geometry?.coordinates) {
                    const coords = data.routes[0].geometry.coordinates as [number, number][];
                    const snappedStart = coords[0];
                    const selfSnapDist = haversineDistanceSimple(lngLat.lat, lngLat.lng, snappedStart[1], snappedStart[0]);
                    if (selfSnapDist < 0.3) { // 300m — find nearest road in rural areas
                      finalLat = snappedStart[1];
                      finalLng = snappedStart[0];
                      snappedToRoad = true;
                    }
                  }
                } catch { /* keep unsnapped */ }
              }

              // If snap is on but all attempts failed, revert to original position
              if (!snappedToRoad) {
                marker.setLngLat([wp.lng, wp.lat]);
                // Restore the segments we cleared
                // (they'll be re-fetched on next render from existing waypoint positions)
                return;
              }

              // Move marker to snapped position immediately for visual feedback
              marker.setLngLat([finalLng, finalLat]);

              // Re-fetch both affected segments BEFORE triggering state update
              // so the route redraws with snapped geometry, not straight lines.
              if (wpIdx > 0) {
                try {
                  const prev = wps[wpIdx - 1];
                  const res = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/walking/${prev.lng},${prev.lat};${finalLng},${finalLat}?access_token=${token}&geometries=geojson&overview=full`
                  );
                  const data = await res.json();
                  if (data.routes?.[0]?.geometry?.coordinates) {
                    const coords = data.routes[0].geometry.coordinates as [number, number][];
                    if (!isRouteDetour(data.routes[0].distance || 0, prev.lat, prev.lng, finalLat, finalLng)) {
                      if (wpIdx - 1 === 0) coords[0] = [prev.lng, prev.lat];
                      snappedSegmentsRef.current.set(wpIdx - 1, coords);
                    }
                  }
                } catch { /* skip */ }
              }
              if (wpIdx < wps.length - 1) {
                try {
                  const next = wps[wpIdx + 1];
                  const res = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/walking/${finalLng},${finalLat};${next.lng},${next.lat}?access_token=${token}&geometries=geojson&overview=full`
                  );
                  const data = await res.json();
                  if (data.routes?.[0]?.geometry?.coordinates) {
                    const coords = data.routes[0].geometry.coordinates as [number, number][];
                    if (!isRouteDetour(data.routes[0].distance || 0, finalLat, finalLng, next.lat, next.lng)) {
                      if (wpIdx === 0) coords[0] = [finalLng, finalLat];
                      snappedSegmentsRef.current.set(wpIdx, coords);
                    }
                  }
                } catch { /* skip */ }
              }

              // NOW update waypoint position — triggers re-render with segments already in place
              onWaypointUpdateRef.current?.(wp.id, finalLat, finalLng, snappedToRoad, preDragSegments);
            } else {
              // Snap off or waypoint not found — clear adjacent snapped segments
              // so the route line falls back to straight lines through the new position.
              // Without this, the old snapped geometry still references the old position.
              const wpsSnap = waypointsRef.current;
              const snapIdx = wpsSnap.findIndex(w => w.id === wp.id);
              if (snapIdx >= 0) {
                if (snapIdx > 0) snappedSegmentsRef.current.delete(snapIdx - 1);
                if (snapIdx < wpsSnap.length - 1) snappedSegmentsRef.current.delete(snapIdx);
              }
              onWaypointUpdateRef.current?.(wp.id, lngLat.lat, lngLat.lng, false, preDragSegments);
            }
          });

          // Handle click on marker — always set flag to prevent map click from
          // adding a new waypoint on top. In erase mode, remove the waypoint.
          el.addEventListener("click", async (e) => {
            e.stopPropagation();
            markerClickedRef.current = true;
            if (toolModeRef.current === "erase") {
              const wps = waypointsRef.current;
              const wpIdx = wps.findIndex((w) => w.id === wp.id);

              // Snapshot segments BEFORE mutation so undo history
              // captures the exact pre-erase state
              const preEraseSegments = snapshotSegments(snappedSegmentsRef.current);

              // Re-index snapped segments BEFORE removing the waypoint so
              // the route line rebuilds correctly with the remaining waypoints.
              reindexSegmentsOnRemove(
                wpIdx >= 0 ? wpIdx : index,
                snappedSegmentsRef.current
              );

              // Save neighbor refs before removal for async segment fetch
              const prevWp = wpIdx > 0 ? wps[wpIdx - 1] : null;
              const nextWp = wpIdx < wps.length - 1 ? wps[wpIdx + 1] : null;

              // Remove waypoint IMMEDIATELY to prevent race condition:
              // if user clicks undo while async fetch is in progress,
              // the old handler must not re-remove the restored waypoint.
              // Pass pre-erase segments so undo history stores the correct state.
              onWaypointRemoveRef.current?.(wp.id, preEraseSegments);

              // Re-fetch connecting segment async (after removal)
              if (snapEnabledRef.current && prevWp && nextWp) {
                const token = mapboxgl.accessToken;
                try {
                  const res = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/walking/${prevWp.lng},${prevWp.lat};${nextWp.lng},${nextWp.lat}?access_token=${token}&geometries=geojson&overview=full`
                  );
                  const data = await res.json();
                  if (data.routes?.[0]?.geometry?.coordinates) {
                    // Verify waypoints haven't changed (undo may have fired)
                    const currentWps = waypointsRef.current;
                    const stillValid =
                      currentWps.some((w) => w.id === prevWp.id) &&
                      currentWps.some((w) => w.id === nextWp.id) &&
                      !currentWps.some((w) => w.id === wp.id);
                    if (stillValid) {
                      const coords = data.routes[0].geometry
                        .coordinates as [number, number][];
                      if (!isRouteDetour(data.routes[0].distance || 0, prevWp.lat, prevWp.lng, nextWp.lat, nextWp.lng)) {
                        const prevIdx = currentWps.findIndex((w) => w.id === prevWp.id);
                        snappedSegmentsRef.current.set(prevIdx, coords);
                        setStyleLoadCount((prev) => prev + 1);
                      }
                    }
                  }
                } catch {
                  /* fall back to straight line */
                }
              }
            }
          });

          waypointMarkersRef.current.set(wp.id, marker);
        });
      } else {
        source.setData({ type: "FeatureCollection", features: [] });
      }
    }, [isCreating, waypoints, routeType, toolMode, mapLoaded, styleLoadCount, routeStyle]);

    // Draw POI waypoint markers during creation (amber pins with icons)
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      // Clear existing POI markers
      creationPOIMarkersRef.current.forEach((m) => m.remove());
      creationPOIMarkersRef.current.clear();

      if (!isCreating || creationPOIs.length === 0) return;

      // Sort POIs by distance along route from start for numbering
      const routeCoords = getRenderedRouteCoords(waypointsRef.current, snappedSegmentsRef.current);
      const poisWithDist = creationPOIs.map((poi) => ({
        ...poi,
        _routeDist: routeCoords.length >= 2 ? distanceAlongRoute(poi.lng, poi.lat, routeCoords) : 0,
      }));
      poisWithDist.sort((a, b) => a._routeDist - b._routeDist);

      // Build index lookup: poi.id -> sorted position
      const sortedIndexMap = new Map<string, number>();
      poisWithDist.forEach((p, i) => sortedIndexMap.set(p.id, i));

      creationPOIs.forEach((poi) => {
        const index = sortedIndexMap.get(poi.id) ?? 0;
        const el = document.createElement("div");
        el.className = "creation-poi-marker";
        const iconSvg = poi.icon_type ? (POI_ICON_SVGS[poi.icon_type] || POI_ICON_SVGS.other) : POI_ICON_SVGS.other;
        el.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            pointer-events: auto;
          ">
            <div style="
              margin-bottom: 2px;
              background: #D97706;
              color: white;
              font-size: 9px;
              font-weight: 700;
              padding: 1px 5px;
              border-radius: 6px;
              white-space: nowrap;
              box-shadow: 0 1px 3px rgba(0,0,0,0.2);
              max-width: 80px;
              overflow: hidden;
              text-overflow: ellipsis;
            ">W${index + 1}</div>
            <div style="
              width: 24px;
              height: 24px;
              background: #D97706;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
            ">${iconSvg}</div>
          </div>
        `;
        el.style.cursor = toolModeRef.current === "erase" ? "pointer" : "move";

        const marker = new mapboxgl.Marker({
          element: el,
          draggable: true,
          anchor: "bottom",
          offset: [0, 12], // Shift down so circle center (not bottom edge) sits on the line
        })
          .setLngLat([poi.lng, poi.lat])
          .addTo(mapRef.current!);

        // Handle drag — snap to nearest point on the actual rendered route line
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          const wps = waypointsRef.current;
          if (wps.length >= 2) {
            const routeCoords = getRenderedRouteCoords(wps, snappedSegmentsRef.current);
            let minDist = Infinity;
            let snapLng = lngLat.lng;
            let snapLat = lngLat.lat;
            for (let i = 0; i < routeCoords.length - 1; i++) {
              const nearest = nearestPointOnSegment(lngLat.lng, lngLat.lat, routeCoords[i][0], routeCoords[i][1], routeCoords[i + 1][0], routeCoords[i + 1][1]);
              const d = haversineDistanceSimple(lngLat.lat, lngLat.lng, nearest.lat, nearest.lng);
              if (d < minDist) { minDist = d; snapLng = nearest.lng; snapLat = nearest.lat; }
            }
            marker.setLngLat([snapLng, snapLat]);
            onCreationPOIUpdateRef.current?.(poi.id, snapLat, snapLng);
          } else {
            onCreationPOIUpdateRef.current?.(poi.id, lngLat.lat, lngLat.lng);
          }
        });

        // Handle click — erase mode removes, otherwise open edit dialog
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          markerClickedRef.current = true;
          if (toolModeRef.current === "erase") {
            onCreationPOIRemoveRef.current?.(poi.id);
          } else {
            onCreationPOIEditRef.current?.(poi.id);
          }
        });

        creationPOIMarkersRef.current.set(poi.id, marker);
      });
    }, [isCreating, creationPOIs, mapLoaded, styleLoadCount]);

    // Clean up snapped segments when waypoints change
    // NOTE: Turning snap OFF no longer clears existing segments — previously
    // snapped points stay snapped. Only new points placed with snap off are unsnapped.
    useEffect(() => {
      // Remove segments for indices that no longer exist
      const maxIdx = waypoints.length - 2; // max valid segment index
      // For circular routes, also allow the closing segment at key (waypoints.length - 1)
      const maxAllowed = routeType === "circular" && waypoints.length > 2
        ? waypoints.length - 1
        : maxIdx;
      const segments = snappedSegmentsRef.current;
      for (const key of Array.from(segments.keys())) {
        if (key > maxAllowed) {
          segments.delete(key);
        }
      }
      // If waypoints were cleared entirely, clear all segments
      if (waypoints.length < 2) {
        segments.clear();
      }
    }, [waypoints, routeType]);

    // When snap is toggled ON with existing waypoints, fetch all segments
    useEffect(() => {
      if (!snapEnabled || waypoints.length < 2) return;

      // Check if we already have segments — if so, don't re-fetch
      if (snappedSegmentsRef.current.size > 0) return;

      const fetchAllSegments = async () => {
        const token = mapboxgl.accessToken;
        if (!token) return;

        for (let i = 0; i < waypoints.length - 1; i++) {
          const from = waypoints[i];
          const to = waypoints[i + 1];
          try {
            const response = await fetch(
              `https://api.mapbox.com/directions/v5/mapbox/walking/${from.lng},${from.lat};${to.lng},${to.lat}?access_token=${token}&geometries=geojson&overview=full`
            );
            const data = await response.json();
            if (data.routes?.[0]?.geometry?.coordinates) {
              const coords = data.routes[0].geometry.coordinates as [number, number][];
              if (!isRouteDetour(data.routes[0].distance || 0, from.lat, from.lng, to.lat, to.lng)) {
                // Pin wp0's actual position for the first segment
                if (i === 0) coords[0] = [from.lng, from.lat];
                snappedSegmentsRef.current.set(i, coords);
              }
            }
          } catch {
            // Skip failed segments
          }
        }
        // Trigger a re-render to update the displayed line
        setStyleLoadCount(prev => prev + 1);
      };

      fetchAllSegments();
    }, [snapEnabled, resnapTrigger]);

    // Fetch closing segment for circular routes (last waypoint → first waypoint)
    useEffect(() => {
      if (routeType !== "circular" || waypoints.length < 3) return;

      const closingKey = waypoints.length - 1;
      let cancelled = false;

      const fetchClosingSegment = async () => {
        const token = mapboxgl.accessToken;
        if (!token) return;

        const last = waypoints[waypoints.length - 1];
        const first = waypoints[0];
        try {
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/walking/${last.lng},${last.lat};${first.lng},${first.lat}?access_token=${token}&geometries=geojson&overview=full`
          );
          if (cancelled) return;
          const data = await response.json();
          if (cancelled) return;
          if (data.routes?.[0]?.geometry?.coordinates) {
            const coords = data.routes[0].geometry.coordinates as [number, number][];
            snappedSegmentsRef.current.set(closingKey, coords);
            setStyleLoadCount(prev => prev + 1);
          }
        } catch {
          // If fetch fails, the straight-line fallback will be used
        }
      };

      fetchClosingSegment();

      return () => { cancelled = true; };
    }, [routeType, waypoints, resnapTrigger]);

    // Update creation route style
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      const layer = mapRef.current.getLayer("creation-route-line");
      if (layer) {
        mapRef.current.setPaintProperty("creation-route-line", "line-color", routeStyle.color);
        mapRef.current.setPaintProperty("creation-route-line", "line-width", routeStyle.thickness);
        mapRef.current.setPaintProperty("creation-route-line", "line-opacity", routeStyle.opacity / 100);
      }
    }, [routeStyle, mapLoaded, styleLoadCount]);

    // Update displayed routes style from layer settings
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      const layer = mapRef.current.getLayer("routes-line");
      if (layer) {
        mapRef.current.setPaintProperty("routes-line", "line-color", displayRouteColor);
        mapRef.current.setPaintProperty("routes-line", "line-width", displayRouteThickness);
        mapRef.current.setPaintProperty("routes-line", "line-opacity", displayRouteOpacity / 100);
      }
    }, [displayRouteColor, displayRouteThickness, displayRouteOpacity, mapLoaded, styleLoadCount]);

    // User position dot + follow mode
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      if (!userPosition) {
        // Remove dot if position cleared
        if (userDotMarkerRef.current) {
          userDotMarkerRef.current.remove();
          userDotMarkerRef.current = null;
        }
        return;
      }

      const { lat, lng, heading } = userPosition;

      // Scale user marker based on zoom level
      const scaleUserMarker = (zoom: number, el: HTMLElement) => {
        let scale = 1;
        if (zoom < 7) scale = 0.4;
        else if (zoom < 10) scale = 0.6;
        else if (zoom < 13) scale = 0.8;
        el.style.transform = `scale(${scale})`;
      };

      // Create or update user arrow marker
      if (!userDotMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "user-location-arrow";
        el.style.transition = "transform 0.3s ease";
        el.innerHTML = `
          <div style="position: relative; width: 60px; height: 60px;">
            <div class="user-arrow-pulse" style="
              position: absolute; inset: 0;
              border: 3px solid rgba(59,130,246,0.25);
              border-radius: 50%;
              animation: userDotPulse 2s ease-out infinite;
            "></div>
            <div class="user-arrow-body" style="
              position: absolute; inset: 6px;
              display: flex; align-items: center; justify-content: center;
            ">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="21" fill="#3B82F6" stroke="white" stroke-width="4"/>
                <path d="M24 8 L34 32 L24 26 L14 32 Z" fill="white"/>
              </svg>
            </div>
          </div>
        `;

        // Scale on zoom changes
        const handleZoom = () => {
          if (mapRef.current) scaleUserMarker(mapRef.current.getZoom(), el);
        };
        mapRef.current!.on("zoom", handleZoom);
        scaleUserMarker(mapRef.current!.getZoom(), el);

        userDotMarkerRef.current = new mapboxgl.Marker({
          element: el,
          rotationAlignment: "map",
          pitchAlignment: "map",
        })
          .setLngLat([lng, lat])
          .setRotation(heading || 0)
          .addTo(mapRef.current!);
      } else {
        userDotMarkerRef.current.setLngLat([lng, lat]);
        userDotMarkerRef.current.setRotation(heading || 0);
        // Update scale for current zoom
        const el = userDotMarkerRef.current.getElement();
        if (el && mapRef.current) scaleUserMarker(mapRef.current.getZoom(), el);
      }

      // Follow mode — centre map on user, rotate to heading, tilt 45°
      if (followUser) {
        userFollowingRef.current = true;
        mapRef.current.easeTo({
          center: [lng, lat],
          bearing: heading || 0,
          pitch: 45,
          zoom: Math.max(mapRef.current.getZoom(), 17),
          duration: 500,
        });
      }
    }, [userPosition, followUser, mapLoaded]);

    // Thicken route line during navigation (followUser)
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      // Thicken route line with outline during navigation
      const map = mapRef.current;
      if (followUser) {
        // Add outline layer behind the main route line
        if (!map.getLayer("routes-line-outline") && map.getSource("routes")) {
          map.addLayer(
            {
              id: "routes-line-outline",
              type: "line",
              source: "routes",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-color": "#1E40AF",
                "line-width": 14,
                "line-opacity": 0.8,
              },
            },
            "routes-line"
          );
        }
        // Thicken the main route line
        if (map.getLayer("routes-line")) {
          map.setPaintProperty("routes-line", "line-width", 10);
          map.setPaintProperty("routes-line", "line-color", "#3B82F6");
          map.setPaintProperty("routes-line", "line-opacity", 1);
        }
      } else {
        // Remove outline and restore line style
        if (map.getLayer("routes-line-outline")) {
          map.removeLayer("routes-line-outline");
        }
        // Remove traveled layer
        if (map.getLayer("routes-traveled-line")) {
          map.removeLayer("routes-traveled-line");
        }
        if (map.getSource("routes-traveled")) {
          map.removeSource("routes-traveled");
        }
        if (map.getLayer("routes-line")) {
          map.setPaintProperty("routes-line", "line-width", displayRouteThickness);
          map.setPaintProperty("routes-line", "line-color", displayRouteColor);
          map.setPaintProperty("routes-line", "line-opacity", displayRouteOpacity / 100);
        }
        // Reset pitch when leaving follow mode
        map.easeTo({ pitch: 0, duration: 500 });
      }
    }, [followUser, mapLoaded, displayRouteThickness, displayRouteColor, displayRouteOpacity]);

    // Route progress — grey out traveled portion during navigation
    useEffect(() => {
      if (!mapRef.current || !mapLoaded || !followUser || navSegmentIndex === undefined || !userPosition) return;

      const map = mapRef.current;

      // Get the route coordinates from the "routes" source
      const routesSource = map.getSource("routes") as mapboxgl.GeoJSONSource | undefined;
      if (!routesSource) return;

      // We need the actual route geometry — get it from the routes prop
      const routeData = routes?.[0];
      if (!routeData?.geometry?.coordinates) return;

      const coords = routeData.geometry.coordinates as [number, number][];
      if (navSegmentIndex >= coords.length - 1) return;

      // Build traveled portion: coords[0..segmentIndex] + snapped user position
      const traveledCoords = coords.slice(0, navSegmentIndex + 1);
      traveledCoords.push([userPosition.lng, userPosition.lat]);

      const traveledGeoJSON = {
        type: "FeatureCollection" as const,
        features: [{
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: traveledCoords,
          },
        }],
      };

      // Create or update the traveled source/layer
      if (map.getSource("routes-traveled")) {
        (map.getSource("routes-traveled") as mapboxgl.GeoJSONSource).setData(traveledGeoJSON);
      } else {
        map.addSource("routes-traveled", {
          type: "geojson",
          data: traveledGeoJSON,
        });
        map.addLayer({
          id: "routes-traveled-line",
          type: "line",
          source: "routes-traveled",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#9CA3AF",
            "line-width": 10,
            "line-opacity": 0.7,
          },
        });
      }
    }, [followUser, navSegmentIndex, userPosition, mapLoaded, routes]);

    // Loading state
    if (loadError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-center p-6 max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Map Failed to Load</h3>
            <p className="text-gray-600 text-sm mb-4">{loadError}</p>
            <p className="text-xs text-gray-500">
              Check NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
            </p>
          </div>
        </div>
      );
    }

    if (!isLoaded) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full" style={{ minHeight: "100vh" }}>
        <div 
          ref={mapContainerRef} 
          className="absolute inset-0"
          style={{ width: "100%", height: "100%" }}
        />
        
        {/* Custom styles for Mapbox */}
        <style jsx global>{`
          .mapboxgl-map {
            width: 100% !important;
            height: 100% !important;
          }
          .mapboxgl-canvas {
            width: 100% !important;
            height: 100% !important;
          }
          .mapboxgl-popup-content {
            padding: 0 !important;
            border-radius: 12px !important;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
          }
          .mapboxgl-popup-close-button {
            font-size: 18px;
            padding: 4px 8px;
            color: #666;
          }
          .mapboxgl-popup-close-button:hover {
            background: #f3f4f6;
          }
          @keyframes userDotPulse {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(2.5); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }
);

RoutesMapMapbox.displayName = "RoutesMapMapbox";

