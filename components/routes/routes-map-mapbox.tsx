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
const UK_BOUNDS = {
  north: 60.86,  // Shetland
  south: 49.86,  // Channel Islands
  east: 1.77,    // Lowestoft
  west: -8.65,   // Western Ireland/Scotland
};

// Check if coordinates are within UK
function isWithinUK(lng: number, lat: number): boolean {
  return lat >= UK_BOUNDS.south && 
         lat <= UK_BOUNDS.north && 
         lng >= UK_BOUNDS.west && 
         lng <= UK_BOUNDS.east;
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
  // Route display styling
  displayRouteColor?: string;
  displayRouteThickness?: number;
  displayRouteOpacity?: number;
  // Navigation/recording (not yet implemented)
  userPosition?: { lat: number; lng: number; heading: number } | null;
  followUser?: boolean;
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
      monochrome = false,
      displayRouteColor = "#3B82F6",
      displayRouteThickness = 4,
      displayRouteOpacity = 80,
      userPosition,
      followUser = false,
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
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const pinMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
    const poiMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const popupRef = useRef<mapboxgl.Popup | null>(null);
    const waypointMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
    const routeWaypointMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const routeWaypointPopupsRef = useRef<mapboxgl.Popup[]>([]);
    const hazardMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const hazardPopupsRef = useRef<mapboxgl.Popup[]>([]);
    const placementMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const startEndMarkersRef = useRef<mapboxgl.Marker[]>([]);

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
        
        // Use smaller padding for mobile to avoid "cannot fit" error
        const isMobile = window.innerWidth < 768;
        const defaultPadding = isMobile 
          ? { top: 100, bottom: 150, left: 40, right: 40 }
          : { top: 80, bottom: 80, left: 450, right: 80 };
        
        try {
          mapRef.current.fitBounds(bounds, {
            padding: padding || defaultPadding,
            duration: 1000,
            maxZoom: 14,
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

      // Handle click on map for adding waypoints (UK only)
      map.on("click", (e) => {
        if (!isCreating || !isPlotting || toolMode !== "plot") return;
        
        const { lng, lat } = e.lngLat;
        
        // Check if point is within UK bounds
        if (!isWithinUK(lng, lat)) {
          toast.error("Routes can only be created within the UK & Ireland");
          return;
        }
        
        onWaypointAdd?.({
          id: `wp-${Date.now()}`,
          lat,
          lng,
          order: waypoints.length,
        });
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, [isLoaded]);

    // Track style load count to trigger re-renders of sources/layers
    const [styleLoadCount, setStyleLoadCount] = useState(0);

    // Update map style when mapType changes
    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;
      
      const map = mapRef.current;
      
      // Listen for style load completion to re-add sources/layers
      const handleStyleLoad = () => {
        // Increment style load count to trigger re-renders of all useEffects
        // that depend on sources/layers existing
        setStyleLoadCount(prev => prev + 1);
      };
      
      map.once("style.load", handleStyleLoad);
      map.setStyle(getMapboxStyle(mapType));
      
      return () => {
        map.off("style.load", handleStyleLoad);
      };
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

    // Store routes data for click handlers
    const routesDataRef = useRef<Map<string, any>>(new Map());

    // Add clustered route pins using Mapbox native clustering
    useEffect(() => {
      if (!mapRef.current || !mapLoaded || isCreating) return;

      const map = mapRef.current;

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
        existingSource.setData({
          type: "FeatureCollection",
          features,
        });
      } else {
        // Add source with clustering
        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features,
          },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Cluster circles (dark green - Padoq brand)
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: sourceId,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": PIN_COLOR,
            "circle-radius": [
              "step",
              ["get", "point_count"],
              22,   // size for count < 10
              10, 26, // size for count >= 10
              30, 32, // size for count >= 30
            ],
            "circle-stroke-width": 3,
            "circle-stroke-color": PIN_BORDER,
          },
        });

        // Cluster count labels
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: sourceId,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 14,
          },
          paint: {
            "text-color": "#ffffff",
          },
        });

        // Individual route pins (unclustered) - dark green pin markers
        // We'll use HTML markers for these instead of a layer
        // This layer is just for hit detection
        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: sourceId,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "transparent",
            "circle-radius": 20,
          },
        });


        // Click on cluster to zoom
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

      // Function to update pin markers for unclustered points
      const updatePinMarkers = () => {
        if (!map.isStyleLoaded()) return;
        
        const features = map.querySourceFeatures(sourceId, {
          filter: ["!", ["has", "point_count"]],
        });

        // Track which markers we've seen
        const seenIds = new Set<string>();

        features.forEach((feature) => {
          const id = feature.properties?.id;
          if (!id) return;
          seenIds.add(id);

          // Skip if marker already exists
          if (pinMarkersRef.current.has(id)) return;

          const coords = (feature.geometry as any).coordinates;
          
          // Create pin marker element (OS Maps–inspired: thick white outline, green fill, white dot)
          const el = document.createElement("div");
          el.innerHTML = `
            <div style="cursor: pointer; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              <svg width="32" height="42" viewBox="-2 -2 28 36" fill="none">
                <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${PIN_COLOR}" stroke="${PIN_BORDER}" stroke-width="3"/>
                <circle cx="12" cy="11" r="4" fill="${PIN_BORDER}"/>
              </svg>
            </div>
          `;

          const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat(coords)
            .addTo(map);

          pinMarkersRef.current.set(id, marker);
        });

        // Remove markers that are no longer visible (clustered)
        pinMarkersRef.current.forEach((marker, id) => {
          if (!seenIds.has(id)) {
            marker.remove();
            pinMarkersRef.current.delete(id);
          }
        });
      };

      // Update markers when map moves or zooms
      map.on("moveend", updatePinMarkers);
      map.on("data", (e) => {
        if (e.sourceId === sourceId && e.isSourceLoaded) {
          updatePinMarkers();
        }
      });

      // Initial update
      setTimeout(updatePinMarkers, 500);

      return () => {
        // Clean up pin markers
        pinMarkersRef.current.forEach((marker) => marker.remove());
        pinMarkersRef.current.clear();
      };
    }, [routes, mapLoaded, isCreating, onRouteClick, onRoutePreview, styleLoadCount]);

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

        // Click handler — open drawer waypoints panel or fallback to popup
        el.addEventListener("click", (e) => {
          e.stopPropagation();
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

          // Add START marker (green)
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
      } else {
        // Clear route display
        source.setData({ type: "FeatureCollection", features: [] });
      }
    }, [selectedRouteId, selectedRouteData, routes, mapLoaded, styleLoadCount]);

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
    }, [isCreating, waypoints, routeType, toolMode, mapLoaded, onWaypointUpdate, onWaypointRemove, styleLoadCount, routeStyle]);

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

