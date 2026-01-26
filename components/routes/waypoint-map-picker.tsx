"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useGoogleMaps } from "@/lib/hooks/use-google-maps";
import { Button } from "@/components/ui/button";
import { MapPin, Crosshair, AlertTriangle } from "lucide-react";

interface WaypointMapPickerProps {
  routeGeometry: any; // GeoJSON LineString or array of coords
  existingWaypoints?: { lat: number; lng: number }[];
  selectedLocation: { lat: number; lng: number } | null;
  onLocationSelect: (location: { lat: number; lng: number } | null) => void;
  center?: { lat: number; lng: number };
  maxDistanceFromRoute?: number; // Max distance in meters from route (default 30m)
}

// Calculate distance from a point to the nearest point on the route
function distanceToRoute(
  point: { lat: number; lng: number },
  routeCoords: { lat: number; lng: number }[]
): number {
  if (routeCoords.length === 0) return Infinity;
  
  let minDistance = Infinity;
  
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const start = routeCoords[i];
    const end = routeCoords[i + 1];
    const dist = distanceToSegment(point, start, end);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  
  return minDistance;
}

// Distance from point to line segment (in meters)
function distanceToSegment(
  point: { lat: number; lng: number },
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth radius in meters
  
  // Convert to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const lat1 = toRad(start.lat);
  const lng1 = toRad(start.lng);
  const lat2 = toRad(end.lat);
  const lng2 = toRad(end.lng);
  const lat3 = toRad(point.lat);
  const lng3 = toRad(point.lng);
  
  // Vector from start to end
  const dLat12 = lat2 - lat1;
  const dLng12 = lng2 - lng1;
  
  // Vector from start to point
  const dLat13 = lat3 - lat1;
  const dLng13 = lng3 - lng1;
  
  // Project point onto line
  const lenSq = dLat12 * dLat12 + dLng12 * dLng12;
  
  if (lenSq === 0) {
    // Start and end are the same point
    return haversine(point, start);
  }
  
  let t = (dLat13 * dLat12 + dLng13 * dLng12) / lenSq;
  t = Math.max(0, Math.min(1, t));
  
  const nearestLat = start.lat + t * (end.lat - start.lat);
  const nearestLng = start.lng + t * (end.lng - start.lng);
  
  return haversine(point, { lat: nearestLat, lng: nearestLng });
}

// Haversine distance between two points
function haversine(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

export function WaypointMapPicker({
  routeGeometry,
  existingWaypoints = [],
  selectedLocation,
  onLocationSelect,
  center,
  maxDistanceFromRoute = 30, // Default 30 meters
}: WaypointMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const routeLineRef = useRef<google.maps.Polyline | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const existingMarkersRef = useRef<google.maps.Marker[]>([]);
  const startFinishMarkersRef = useRef<google.maps.Marker[]>([]);
  const [distanceWarning, setDistanceWarning] = useState<string | null>(null);
  const routeCoordsRef = useRef<{ lat: number; lng: number }[]>([]);
  
  const { isLoaded, loadError } = useGoogleMaps();

  // Extract coordinates from geometry
  const getCoordinates = useCallback(() => {
    if (!routeGeometry) {
      console.log("[WaypointMapPicker] No routeGeometry provided");
      return [];
    }
    
    console.log("[WaypointMapPicker] Parsing geometry:", typeof routeGeometry, routeGeometry);
    
    // Handle GeoJSON LineString
    if (routeGeometry.type === "LineString" && routeGeometry.coordinates) {
      const coords = routeGeometry.coordinates.map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0],
      }));
      console.log("[WaypointMapPicker] Parsed LineString coords:", coords.length);
      return coords;
    }
    
    // Handle GeoJSON geometry object that might be stringified
    if (typeof routeGeometry === "string") {
      try {
        const parsed = JSON.parse(routeGeometry);
        if (parsed.type === "LineString" && parsed.coordinates) {
          const coords = parsed.coordinates.map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0],
          }));
          console.log("[WaypointMapPicker] Parsed string LineString coords:", coords.length);
          return coords;
        }
      } catch (e) {
        console.error("[WaypointMapPicker] Failed to parse geometry string:", e);
      }
    }
    
    // Handle array of {lat, lng}
    if (Array.isArray(routeGeometry)) {
      const coords = routeGeometry.map((p: any) => ({
        lat: p.lat || p[1],
        lng: p.lng || p[0],
      }));
      console.log("[WaypointMapPicker] Parsed array coords:", coords.length);
      return coords;
    }
    
    console.log("[WaypointMapPicker] Could not parse geometry format");
    return [];
  }, [routeGeometry]);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

    const coords = getCoordinates();
    routeCoordsRef.current = coords;
    
    const defaultCenter = center || (coords.length > 0 
      ? coords[Math.floor(coords.length / 2)]
      : { lat: 52.4862, lng: -1.8904 }); // Default to UK

    const map = new google.maps.Map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 15, // Closer zoom for better waypoint placement
      mapTypeId: "terrain",
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.TOP_RIGHT,
      },
    });

    mapRef.current = map;

    // Add click listener with distance validation
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const location = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };
        
        // Validate distance from route
        const distance = distanceToRoute(location, routeCoordsRef.current);
        
        if (distance > maxDistanceFromRoute) {
          setDistanceWarning(
            `Point is ${Math.round(distance)}m from route. Please place waypoint within ${maxDistanceFromRoute}m of the route.`
          );
          onLocationSelect(null);
        } else {
          setDistanceWarning(null);
          onLocationSelect(location);
        }
      }
    });

    return () => {
      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(mapRef.current);
      }
    };
  }, [isLoaded, center, getCoordinates, onLocationSelect, maxDistanceFromRoute]);

  // Draw route line - use routeGeometry directly as dependency
  useEffect(() => {
    if (!mapRef.current || !isLoaded) {
      console.log("[WaypointMapPicker] Map not ready yet, skipping route draw");
      return;
    }

    // Clear existing route line
    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }

    const coords = getCoordinates();
    console.log("[WaypointMapPicker] Drawing route with", coords.length, "coordinates");
    routeCoordsRef.current = coords; // Store for distance validation
    
    if (coords.length === 0) {
      console.log("[WaypointMapPicker] No coordinates to draw");
      return;
    }

    // Draw a thicker, more visible route line
    routeLineRef.current = new google.maps.Polyline({
      path: coords.map((c) => new google.maps.LatLng(c.lat, c.lng)),
      geodesic: true,
      strokeColor: "#22c55e", // Bright green
      strokeOpacity: 1,
      strokeWeight: 6, // Thicker for better visibility
      map: mapRef.current,
      clickable: true, // Make route clickable
      zIndex: 1000, // Ensure route is on top
    });

    console.log("[WaypointMapPicker] Route line created successfully");

    // Also add a click listener to the route itself for easier placement
    routeLineRef.current.addListener("click", (e: google.maps.PolyMouseEvent) => {
      if (e.latLng) {
        const location = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };
        setDistanceWarning(null);
        onLocationSelect(location);
      }
    });

    // Clear existing start/finish markers
    startFinishMarkersRef.current.forEach((m) => m.setMap(null));
    startFinishMarkersRef.current = [];

    // Add Start marker
    if (coords.length > 0) {
      const startMarker = new google.maps.Marker({
        position: coords[0],
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#16a34a", // Green
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        },
        label: {
          text: "S",
          color: "#fff",
          fontSize: "10px",
          fontWeight: "bold",
        },
        title: "Start",
        zIndex: 1001,
      });
      startFinishMarkersRef.current.push(startMarker);
    }

    // Add Finish marker
    if (coords.length > 1) {
      const endMarker = new google.maps.Marker({
        position: coords[coords.length - 1],
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#dc2626", // Red
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        },
        label: {
          text: "F",
          color: "#fff",
          fontSize: "10px",
          fontWeight: "bold",
        },
        title: "Finish",
        zIndex: 1001,
      });
      startFinishMarkersRef.current.push(endMarker);
    }

    // Fit bounds to route with padding
    const bounds = new google.maps.LatLngBounds();
    coords.forEach((coord) => {
      bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
    });
    mapRef.current.fitBounds(bounds, 60);
  }, [routeGeometry, isLoaded, getCoordinates, onLocationSelect]);

  // Draw existing waypoints
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    existingMarkersRef.current.forEach((m) => m.setMap(null));
    existingMarkersRef.current = [];

    existingWaypoints.forEach((wp, idx) => {
      const marker = new google.maps.Marker({
        position: { lat: wp.lat, lng: wp.lng },
        map: mapRef.current!,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        label: {
          text: String(idx + 1),
          color: "#fff",
          fontSize: "10px",
          fontWeight: "bold",
        },
        title: `Waypoint ${idx + 1}`,
      });
      existingMarkersRef.current.push(marker);
    });
  }, [existingWaypoints]);

  // Update selected location marker
  useEffect(() => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    if (selectedLocation) {
      markerRef.current = new google.maps.Marker({
        position: selectedLocation,
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        },
        animation: google.maps.Animation.DROP,
        title: "New waypoint",
        draggable: true,
      });

      // Update location when dragged with distance validation
      markerRef.current.addListener("dragend", () => {
        const pos = markerRef.current?.getPosition();
        if (pos) {
          const location = {
            lat: pos.lat(),
            lng: pos.lng(),
          };
          
          const distance = distanceToRoute(location, routeCoordsRef.current);
          
          if (distance > maxDistanceFromRoute) {
            setDistanceWarning(
              `Point is ${Math.round(distance)}m from route. Please place waypoint within ${maxDistanceFromRoute}m of the route.`
            );
            onLocationSelect(null);
            // Move marker back or remove it
            markerRef.current?.setMap(null);
          } else {
            setDistanceWarning(null);
            onLocationSelect(location);
          }
        }
      });
    }
  }, [selectedLocation, onLocationSelect, maxDistanceFromRoute]);

  if (loadError) {
    return (
      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-64 bg-muted rounded-lg flex items-center justify-center animate-pulse">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={mapContainerRef}
        className="h-[40vh] min-h-[300px] max-h-[500px] w-full rounded-lg border overflow-hidden"
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
        <MapPin className="h-3 w-3 shrink-0" />
        <span>
          Click directly on the <span className="text-green-600 font-medium">green route line</span> to place a waypoint. 
          Must be within {maxDistanceFromRoute}m of the route.
        </span>
      </div>
      
      {distanceWarning && (
        <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 p-2 rounded">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{distanceWarning}</span>
        </div>
      )}
      
      {selectedLocation && !distanceWarning && (
        <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 text-green-700 p-2 rounded">
          <Crosshair className="h-4 w-4 shrink-0" />
          <span>
            Selected: {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
          </span>
        </div>
      )}
    </div>
  );
}

