"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useGoogleMaps } from "@/lib/hooks/use-google-maps";
import { Loader2, AlertCircle } from "lucide-react";
import type { Waypoint, RouteStyle } from "./route-creator";

// Route difficulty colors
const DIFFICULTY_COLORS = {
  unrated: "#6B7280",
  easy: "#10B981",
  moderate: "#3B82F6",
  difficult: "#F59E0B",
  severe: "#EF4444",
};

// Path layer visibility
export interface PathLayers {
  bridleways: boolean;
  boats: boolean;
  footpaths: boolean;
  permissive: boolean;
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
      center = { lat: 52.2, lng: -2.5 },
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
    const kmlLayerRef = useRef<google.maps.KmlLayer | null>(null);
    const [kmlError, setKmlError] = useState<string | null>(null);

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
        kmlLayerRef.current?.setMap(null);
      };
    }, [isLoaded, center, zoom]);

    // Load KML layer for rights of way
    useEffect(() => {
      if (!mapRef.current || !isLoaded) return;

      // Clean up existing KML layer
      kmlLayerRef.current?.setMap(null);
      setKmlError(null);

      // Check if any path layers are enabled
      const anyLayerEnabled = pathLayers.bridleways || pathLayers.boats || 
                              pathLayers.footpaths || pathLayers.permissive;
      
      if (!anyLayerEnabled) return;

      // For KML to work with Google Maps, it needs to be served from a public URL
      // In development, this won't work directly. The KML needs to be hosted publicly.
      // For now, we'll use the local path and show a helpful message if it fails.
      
      // Build the KML URL - in production this should be a public URL
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const kmlUrl = `${baseUrl}/kml/augmented.kml`;

      try {
        const kmlLayer = new google.maps.KmlLayer({
          url: kmlUrl,
          map: mapRef.current,
          preserveViewport: true,
          suppressInfoWindows: false,
        });

        kmlLayer.addListener('status_changed', () => {
          const status = kmlLayer.getStatus();
          if (status !== google.maps.KmlLayerStatus.OK) {
            console.warn('KML Layer status:', status);
            if (status === google.maps.KmlLayerStatus.FETCH_ERROR) {
              setKmlError('KML file must be hosted on a public URL for Google Maps to load it. For local development, the paths will not display.');
            } else if (status === google.maps.KmlLayerStatus.TIMED_OUT) {
              setKmlError('KML file is too large and timed out. Consider splitting into smaller files.');
            } else {
              setKmlError(`KML loading failed: ${status}`);
            }
          } else {
            setKmlError(null);
          }
        });

        kmlLayerRef.current = kmlLayer;
      } catch (error) {
        console.error('Failed to create KML layer:', error);
        setKmlError('Failed to load path data');
      }
    }, [isLoaded, pathLayers]);

    // Snap to roads using Google's Roads API / Directions
    const snapToRoad = useCallback(async (lat: number, lng: number): Promise<{lat: number, lng: number, snapped: boolean}> => {
      if (!snapEnabled || !directionsServiceRef.current || waypoints.length === 0) {
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
          };
        }
      } catch (error) {
        console.error("Snap to road failed:", error);
      }

      return { lat, lng, snapped: false };
    }, [snapEnabled, waypoints]);

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

    // Draw snapped route line between waypoints using Directions API
    useEffect(() => {
      if (!mapRef.current || !isLoaded || !isCreating) return;
      
      snapPolylineRef.current?.setMap(null);
      
      if (waypoints.length < 2 || !snapEnabled) return;

      // Use Directions API to get the actual road path
      const drawSnappedRoute = async () => {
        if (!directionsServiceRef.current) return;

        const waypts = waypoints.slice(1, -1).map(wp => ({
          location: new google.maps.LatLng(wp.lat, wp.lng),
          stopover: false,
        }));

        try {
          const result = await new Promise<google.maps.DirectionsResult | null>((resolve) => {
            directionsServiceRef.current!.route(
              {
                origin: { lat: waypoints[0].lat, lng: waypoints[0].lng },
                destination: { lat: waypoints[waypoints.length - 1].lat, lng: waypoints[waypoints.length - 1].lng },
                waypoints: waypts,
                travelMode: google.maps.TravelMode.WALKING,
                optimizeWaypoints: false,
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

          if (result && result.routes[0]) {
            const path = result.routes[0].overview_path;
            
            snapPolylineRef.current = new google.maps.Polyline({
              path,
              strokeColor: routeStyle.color,
              strokeWeight: routeStyle.thickness,
              strokeOpacity: routeStyle.opacity / 100,
              map: mapRef.current,
              zIndex: 100,
            });
          }
        } catch (error) {
          console.error("Failed to draw snapped route:", error);
        }
      };

      drawSnappedRoute();
    }, [isLoaded, isCreating, waypoints, snapEnabled, routeStyle]);

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

    // Render waypoints for route creation
    useEffect(() => {
      if (!mapRef.current || !isLoaded) return;

      waypointMarkersRef.current.forEach((m) => m.setMap(null));
      waypointMarkersRef.current.clear();

      // Only clear the non-snapped route line if we're not using snap
      if (!snapEnabled) {
        routeLineRef.current?.setMap(null);
      }

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

      // Draw simple line if not using snap (for visual feedback while snapped route loads)
      if (!snapEnabled && waypoints.length >= 2) {
        const path = waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng }));

        if (routeType === "circular" && waypoints.length > 2) {
          path.push({ lat: waypoints[0].lat, lng: waypoints[0].lng });
        }

        routeLineRef.current = new google.maps.Polyline({
          path,
          strokeColor: routeStyle.color,
          strokeWeight: routeStyle.thickness,
          strokeOpacity: routeStyle.opacity / 100,
          map: mapRef.current,
          zIndex: 100,
        });
      }
    }, [isLoaded, isCreating, waypoints, routeType, snapEnabled, routeStyle, onWaypointUpdate, onWaypointRemove, snapToRoad]);

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
        
        {/* KML Error Message */}
        {kmlError && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-10">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 shadow-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Path Data Notice</p>
                  <p className="text-xs text-amber-700 mt-1">{kmlError}</p>
                  <p className="text-xs text-amber-600 mt-2">
                    Tip: For production, host the KML file on a public CDN or use a tile server for large datasets.
                  </p>
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
