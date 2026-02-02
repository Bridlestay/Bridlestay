"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { useMapbox } from "@/lib/hooks/use-mapbox";
import { Loader2, AlertCircle } from "lucide-react";
import type { Waypoint, RouteStyle, ToolMode } from "./route-creator";

// Route difficulty colors
const DIFFICULTY_COLORS = {
  unrated: "#6B7280",
  easy: "#10B981",
  moderate: "#3B82F6",
  difficult: "#F59E0B",
  severe: "#EF4444",
};

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
  center?: { lat: number; lng: number };
  zoom?: number;
  highlightedRouteId?: string | null;
  selectedRouteId?: string | null;
  // Map type - accepts both Mapbox style names and Google Maps style names for compatibility
  mapType?: "outdoors" | "streets" | "satellite" | "light" | "roadmap" | "terrain" | "hybrid";
  // Creation mode props
  isCreating?: boolean;
  isPlotting?: boolean;
  snapEnabled?: boolean; // Not yet implemented for Mapbox
  waypoints?: Waypoint[];
  routeType?: "linear" | "circular";
  routeStyle?: RouteStyle;
  toolMode?: ToolMode;
  onWaypointAdd?: (waypoint: Waypoint) => void;
  onWaypointUpdate?: (index: number, waypoint: Waypoint) => void;
  onWaypointRemove?: (index: number) => void;
  onWaypointInsert?: (index: number, waypoint: Waypoint) => void; // Not yet implemented
  onCircularDetected?: (isCircular: boolean) => void; // Not yet implemented
  // Layer settings (compatibility props - some not yet implemented)
  pathLayers?: PathLayers;
  propertyPins?: any[];
  monochrome?: boolean; // Not yet implemented
  // Navigation/recording (not yet implemented)
  userPosition?: { lat: number; lng: number; heading: number } | null;
  followUser?: boolean;
  recordedPath?: { lat: number; lng: number }[];
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
      center = { lat: 52.2, lng: -2.2 },
      zoom = 10,
      highlightedRouteId,
      selectedRouteId,
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
      monochrome = false,
      userPosition,
      followUser = false,
      recordedPath = [],
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const popupRef = useRef<mapboxgl.Popup | null>(null);
    const waypointMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
    
    const { isLoaded, loadError } = useMapbox();
    const [mapLoaded, setMapLoaded] = useState(false);

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
        
        const defaultPadding = { top: 50, bottom: 50, left: 420, right: 50 };
        mapRef.current.fitBounds(bounds, {
          padding: padding || defaultPadding,
          duration: 1000,
        });
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
    }));

    // Initialize map
    useEffect(() => {
      console.log("Mapbox init check:", { isLoaded, hasContainer: !!mapContainerRef.current, hasMap: !!mapRef.current });
      
      if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

      // Set access token right before creating the map
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      console.log("Mapbox token:", token ? `${token.substring(0, 20)}...` : "NOT FOUND");
      
      if (!token) {
        console.error("Mapbox token not found");
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

      // Add navigation controls (zoom buttons)
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "bottom-right"
      );

      // Function to add sources and layers (called on load and style change)
      const setupSourcesAndLayers = () => {
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
              "line-color": ["get", "color"],
              "line-width": ["get", "width"],
              "line-opacity": 0.8,
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
      };

      map.on("load", () => {
        console.log("Mapbox map loaded and ready!");
        setMapLoaded(true);
        setupSourcesAndLayers();
      });

      map.on("error", (e) => {
        console.error("Mapbox error:", e);
      });

      // Re-add sources when style changes
      map.on("style.load", () => {
        setupSourcesAndLayers();
      });

      // Handle click on map for adding waypoints
      map.on("click", (e) => {
        if (!isCreating || !isPlotting || toolMode !== "plot") return;
        
        const { lng, lat } = e.lngLat;
        onWaypointAdd?.({
          id: `wp-${Date.now()}`,
          lat,
          lng,
          order: waypoints.length,
        });
      });

      mapRef.current = map;
      console.log("Mapbox map created successfully");

      return () => {
        console.log("Mapbox map cleanup");
        map.remove();
        mapRef.current = null;
      };
    }, [isLoaded]);

    // Update map style when mapType changes
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;
      mapRef.current.setStyle(getMapboxStyle(mapType));
    }, [mapType, mapLoaded]);

    // Update cursor based on mode
    useEffect(() => {
      if (!mapRef.current) return;
      
      if (isCreating && isPlotting) {
        mapRef.current.getCanvas().style.cursor = toolMode === "plot" ? "crosshair" : "default";
      } else {
        mapRef.current.getCanvas().style.cursor = "grab";
      }
    }, [isCreating, isPlotting, toolMode]);

    // Add route markers (pins)
    useEffect(() => {
      if (!mapRef.current || !mapLoaded || isCreating) return;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Create markers for each route
      routes.forEach((route) => {
        if (!route.geometry?.coordinates?.length) return;

        // Use start point of route for marker
        const [lng, lat] = route.geometry.coordinates[0];

        // Create custom marker element
        const el = document.createElement("div");
        el.className = "route-marker";
        el.innerHTML = `
          <div style="
            width: 32px;
            height: 40px;
            position: relative;
          ">
            <svg viewBox="0 0 24 32" fill="${DIFFICULTY_COLORS[route.difficulty] || DIFFICULTY_COLORS.unrated}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0zm0 16c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
            </svg>
          </div>
        `;
        el.style.cursor = "pointer";

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(mapRef.current!);

        // Click handler for marker
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          
          // Show popup with route info
          const rideTimeMinutes = Math.round((route.distance_km || 0) / 8 * 60);
          const hours = Math.floor(rideTimeMinutes / 60);
          const mins = rideTimeMinutes % 60;
          const rideTimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

          const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: "320px",
            className: "route-popup",
          })
            .setLngLat([lng, lat])
            .setHTML(`
              <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif;">
                <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 600;">${route.title || "Untitled Route"}</h3>
                <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                  <span style="font-size: 14px;">🐴 ${(route.distance_km || 0).toFixed(1)} km</span>
                  <span style="font-size: 14px;">⏱️ ${rideTimeStr}</span>
                </div>
                <button 
                  id="view-route-${route.id}"
                  style="
                    width: 100%;
                    padding: 10px;
                    background: #2E8B57;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                  "
                >
                  View details
                </button>
              </div>
            `)
            .addTo(mapRef.current!);

          // Add click handler for view details button
          setTimeout(() => {
            const btn = document.getElementById(`view-route-${route.id}`);
            if (btn) {
              btn.onclick = () => {
                popup.remove();
                onRouteClick?.(route.id);
              };
            }
          }, 100);

          onRoutePreview?.(route);
        });

        markersRef.current.push(marker);
      });
    }, [routes, mapLoaded, isCreating, onRouteClick, onRoutePreview]);

    // Draw selected route polyline
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      const source = mapRef.current.getSource("routes") as mapboxgl.GeoJSONSource;
      if (!source) return;

      if (selectedRouteId) {
        const route = routes.find((r) => r.id === selectedRouteId);
        if (route?.geometry?.coordinates) {
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
        }
      } else {
        // Clear route display
        source.setData({ type: "FeatureCollection", features: [] });
      }
    }, [selectedRouteId, routes, mapLoaded]);

    // Draw creation route from waypoints
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      const source = mapRef.current.getSource("creation-route") as mapboxgl.GeoJSONSource;
      if (!source) return;

      // Clear existing waypoint markers
      waypointMarkersRef.current.forEach((m) => m.remove());
      waypointMarkersRef.current.clear();

      if (isCreating && waypoints.length > 0) {
        // Draw line connecting waypoints
        const coordinates = waypoints.map((wp) => [wp.lng, wp.lat]);
        
        // If circular, connect back to start
        if (routeType === "circular" && waypoints.length > 2) {
          coordinates.push([waypoints[0].lng, waypoints[0].lat]);
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

        // Add waypoint markers
        waypoints.forEach((wp, index) => {
          const el = document.createElement("div");
          el.className = "waypoint-marker";
          el.innerHTML = `
            <div style="
              width: 24px;
              height: 24px;
              background: ${index === 0 ? "#22C55E" : index === waypoints.length - 1 ? "#EF4444" : "#3B82F6"};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
              color: white;
            ">${index + 1}</div>
          `;
          el.style.cursor = "move";

          const marker = new mapboxgl.Marker({
            element: el,
            draggable: toolMode === "plot",
          })
            .setLngLat([wp.lng, wp.lat])
            .addTo(mapRef.current!);

          // Handle drag
          marker.on("dragend", () => {
            const lngLat = marker.getLngLat();
            onWaypointUpdate?.(index, {
              ...wp,
              lat: lngLat.lat,
              lng: lngLat.lng,
            });
          });

          // Handle click for eraser tool
          el.addEventListener("click", (e) => {
            if (toolMode === "erase") {
              e.stopPropagation();
              onWaypointRemove?.(index);
            }
          });

          waypointMarkersRef.current.set(wp.id, marker);
        });
      } else {
        source.setData({ type: "FeatureCollection", features: [] });
      }
    }, [isCreating, waypoints, routeType, toolMode, mapLoaded, onWaypointUpdate, onWaypointRemove]);

    // Update creation route style
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;
      
      const layer = mapRef.current.getLayer("creation-route-line");
      if (layer) {
        mapRef.current.setPaintProperty("creation-route-line", "line-color", routeStyle.color);
        mapRef.current.setPaintProperty("creation-route-line", "line-width", routeStyle.thickness);
        mapRef.current.setPaintProperty("creation-route-line", "line-opacity", routeStyle.opacity / 100);
      }
    }, [routeStyle, mapLoaded]);

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
        `}</style>
      </div>
    );
  }
);

RoutesMapMapbox.displayName = "RoutesMapMapbox";

