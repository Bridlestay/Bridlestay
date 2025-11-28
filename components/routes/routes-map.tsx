"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/lib/hooks/use-google-maps";
import { Loader2 } from "lucide-react";

interface RoutesMapProps {
  routes?: any[];
  onRouteClick?: (routeId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  kmlLayers?: {
    bridleways: boolean;
    boats: boolean;
    footpaths: boolean;
    permissive: boolean;
  };
  propertyPins?: any[];
  drawingMode?: boolean;
  onDrawingComplete?: (coordinates: [number, number][]) => void;
}

export function RoutesMap({
  routes = [],
  onRouteClick,
  onMapClick,
  center = { lat: 52.0, lng: -2.2 }, // Center of 3 counties
  zoom = 9,
  kmlLayers = { bridleways: false, boats: false, footpaths: false, permissive: false },
  propertyPins = [],
  drawingMode = false,
  onDrawingComplete,
}: RoutesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const polylineRefs = useRef<google.maps.Polyline[]>([]);
  const kmlLayerRefs = useRef<{ [key: string]: google.maps.KmlLayer }>({});
  const markerRefs = useRef<google.maps.Marker[]>([]);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const currentDrawingRef = useRef<google.maps.Polyline | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const { isLoaded, loadError } = useGoogleMaps();

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeId: "terrain",
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    // Add click listener if provided
    if (onMapClick) {
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng && !drawingMode) {
          onMapClick(e.latLng.lat(), e.latLng.lng());
        }
      });
    }
  }, [isLoaded, center, zoom, onMapClick, drawingMode]);

  // Handle drawing mode
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    if (drawingMode) {
      // Enable drawing manager
      if (!drawingManagerRef.current) {
        drawingManagerRef.current = new google.maps.drawing.DrawingManager({
          drawingMode: google.maps.drawing.OverlayType.POLYLINE,
          drawingControl: false,
          polylineOptions: {
            strokeColor: "#10b981",
            strokeWeight: 4,
            editable: true,
          },
        });
      }

      drawingManagerRef.current.setMap(mapInstanceRef.current);

      // Listen for polyline complete
      google.maps.event.addListener(
        drawingManagerRef.current,
        "polylinecomplete",
        (polyline: google.maps.Polyline) => {
          currentDrawingRef.current = polyline;
          
          // Extract coordinates
          const path = polyline.getPath();
          const coordinates: [number, number][] = [];
          for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            coordinates.push([point.lng(), point.lat()]);
          }

          if (onDrawingComplete) {
            onDrawingComplete(coordinates);
          }
        }
      );
    } else {
      // Disable drawing manager
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null);
      }
      if (currentDrawingRef.current) {
        currentDrawingRef.current.setMap(null);
        currentDrawingRef.current = null;
      }
    }

    return () => {
      if (drawingManagerRef.current && !drawingMode) {
        drawingManagerRef.current.setMap(null);
      }
    };
  }, [isLoaded, drawingMode, onDrawingComplete]);

  // Render routes as polylines
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Clear existing polylines
    polylineRefs.current.forEach((p) => p.setMap(null));
    polylineRefs.current = [];

    // Add new polylines
    routes.forEach((route) => {
      if (!route.geometry?.coordinates) return;

      const path = route.geometry.coordinates.map(
        (coord: [number, number]) => ({
          lat: coord[1],
          lng: coord[0],
        })
      );

      const color =
        route.difficulty === "easy"
          ? "#10b981"
          : route.difficulty === "medium"
          ? "#f59e0b"
          : "#ef4444";

      const polyline = new google.maps.Polyline({
        path,
        strokeColor: color,
        strokeWeight: 3,
        strokeOpacity: 0.8,
        map: mapInstanceRef.current,
      });

      // Create info window for hover
      if (!infoWindowRef.current) {
        infoWindowRef.current = new google.maps.InfoWindow();
      }

      // Calculate times
      const rideTimeMinutes = Math.floor((route.distance_km / 12) * 60); // 12 km/h on horseback
      const walkTimeMinutes = Math.floor((route.distance_km / 5) * 60); // 5 km/h walking
      
      // Add hover interaction
      polyline.addListener("mouseover", (e: google.maps.MapMouseEvent) => {
        // Highlight route
        polyline.setOptions({ strokeWeight: 5, strokeOpacity: 1, zIndex: 1000 });
        
        // Show info card with improved styling
        const ownerBadge = route.owner_user_id 
          ? `<span style="display: inline-block; padding: 2px 8px; background: #f3f4f6; color: #374151; border-radius: 4px; font-size: 11px;">By ${route.owner?.name || 'User'}</span>`
          : `<span style="display: inline-block; padding: 2px 8px; background: #dbeafe; color: #1e40af; border-radius: 4px; font-size: 11px; font-weight: 600;">🏛️ Official Bridleway</span>`;
        
        const conditionBadge = route.condition 
          ? `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; ${
              route.condition === 'excellent' ? 'background: #dcfce7; color: #166534;' :
              route.condition === 'good' ? 'background: #dbeafe; color: #1e40af;' :
              route.condition === 'fair' ? 'background: #fef3c7; color: #92400e;' :
              'background: #fed7aa; color: #9a3412;'
            }">${route.condition.toUpperCase()}</span>`
          : '';
        
        const content = `
          <div style="padding: 12px; min-width: 280px; font-family: system-ui, -apple-system, sans-serif;">
            <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px; color: #111827;">${route.title || 'Untitled Route'}</div>
            <div style="margin-bottom: 12px;">${ownerBadge}</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; padding: 8px; background: #f9fafb; border-radius: 6px;">
              <div>
                <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Distance</div>
                <div style="font-size: 14px; font-weight: 700; color: #111827;">${route.distance_km?.toFixed(1) || '0'} km</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Difficulty</div>
                <div style="font-size: 14px; font-weight: 700; color: #111827; text-transform: capitalize;">${route.difficulty || 'medium'}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">🐴 Ride Time</div>
                <div style="font-size: 14px; font-weight: 700; color: #2563eb;">${rideTimeMinutes}m</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">🚶 Walk Time</div>
                <div style="font-size: 14px; font-weight: 700; color: #16a34a;">${walkTimeMinutes}m</div>
              </div>
            </div>
            
            <div style="display: flex; gap: 6px; margin-bottom: 12px;">
              ${route.county ? `<span style="font-size: 11px; color: #6b7280; padding: 2px 6px; background: white; border-radius: 3px;">📍 ${route.county}</span>` : ''}
              ${conditionBadge}
            </div>
            
            <div style="text-align: center; padding: 6px; background: #3b82f6; color: white; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">
              Click to view full details →
            </div>
          </div>
        `;
        
        if (e.latLng && infoWindowRef.current) {
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.setPosition(e.latLng);
          infoWindowRef.current.open(mapInstanceRef.current);
        }
      });

      polyline.addListener("mouseout", () => {
        // Reset highlight after a delay (so user can click)
        setTimeout(() => {
          polyline.setOptions({ strokeWeight: 3, strokeOpacity: 0.8, zIndex: 1 });
        }, 300);
      });

      // Make route clickable
      polyline.addListener("click", () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
        if (onRouteClick) {
          onRouteClick(route.id);
        }
      });
      
      polyline.set('clickable', true);
      polyline.set('cursor', 'pointer');

      polylineRefs.current.push(polyline);
    });
  }, [isLoaded, routes, onRouteClick]);

  // Handle KML layers
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    const layerConfig = {
      bridleways: "/kml/bridleways.kml",
      boats: "/kml/boats.kml",
      footpaths: "/kml/footpaths.kml",
      permissive: "/kml/permissive.kml",
    };

    Object.entries(layerConfig).forEach(([key, url]) => {
      const shouldShow = kmlLayers[key as keyof typeof kmlLayers];

      if (shouldShow && !kmlLayerRefs.current[key]) {
        // Create and show layer
        const kmlLayer = new google.maps.KmlLayer({
          url: `${window.location.origin}${url}`,
          map: mapInstanceRef.current,
          preserveViewport: true,
        });
        kmlLayerRefs.current[key] = kmlLayer;
      } else if (!shouldShow && kmlLayerRefs.current[key]) {
        // Hide layer
        kmlLayerRefs.current[key].setMap(null);
        delete kmlLayerRefs.current[key];
      }
    });
  }, [isLoaded, kmlLayers]);

  // Render property pins
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Clear existing markers
    markerRefs.current.forEach((m) => m.setMap(null));
    markerRefs.current = [];

    // Add new markers
    propertyPins.forEach((property) => {
      if (!property.latitude || !property.longitude) return;

      const marker = new google.maps.Marker({
        position: { lat: property.latitude, lng: property.longitude },
        map: mapInstanceRef.current,
        title: property.name,
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 4px; font-weight: bold;">${property.name}</h3>
            <p style="margin: 0; font-size: 14px;">£${(property.nightly_price_pennies / 100).toFixed(0)}/night</p>
            <p style="margin: 4px 0 0; font-size: 12px; color: #666;">Max ${property.max_horses || 0} horses</p>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markerRefs.current.push(marker);
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

  return <div ref={mapRef} className="w-full h-full" />;
}


