"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useGoogleMaps } from "@/lib/hooks/use-google-maps";
import { Loader2, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Property {
  id: string;
  name: string;
  nightly_price_pennies: number;
  latitude: number;
  longitude: number;
  property_photos?: { url: string; is_cover?: boolean }[];
  county?: string;
  average_rating?: number;
  review_count?: number;
}

interface SearchMapProps {
  properties: Property[];
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  onPropertyClick?: (propertyId: string) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  searchAsYouMove?: boolean;
  onSearchAsYouMoveChange?: (enabled: boolean) => void;
}

export function SearchMap({
  properties,
  onBoundsChange,
  onPropertyClick,
  center = { lat: 52.2, lng: -2.5 }, // Default to West Midlands
  zoom = 9,
  searchAsYouMove = true,
  onSearchAsYouMoveChange,
}: SearchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const boundsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [localSearchAsYouMove, setLocalSearchAsYouMove] = useState(searchAsYouMove);

  const { isLoaded, loadError } = useGoogleMaps();

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

    mapRef.current = new google.maps.Map(mapContainerRef.current, {
      center,
      zoom,
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.TOP_RIGHT,
      },
      fullscreenControl: true,
      streetViewControl: false,
    });

    infoWindowRef.current = new google.maps.InfoWindow();

    // Listen for bounds changes
    mapRef.current.addListener("idle", () => {
      if (!mapRef.current || !localSearchAsYouMove) return;

      // Debounce bounds change
      if (boundsTimeoutRef.current) {
        clearTimeout(boundsTimeoutRef.current);
      }

      boundsTimeoutRef.current = setTimeout(() => {
        const bounds = mapRef.current?.getBounds();
        if (bounds && onBoundsChange) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          onBoundsChange({
            north: ne.lat(),
            south: sw.lat(),
            east: ne.lng(),
            west: sw.lng(),
          });
        }
      }, 500);
    });

    setIsMapReady(true);

    return () => {
      if (boundsTimeoutRef.current) {
        clearTimeout(boundsTimeoutRef.current);
      }
    };
  }, [isLoaded, center, zoom, onBoundsChange, localSearchAsYouMove]);

  // Update markers when properties change
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    // Add new markers
    properties.forEach((property) => {
      if (!property.latitude || !property.longitude) return;

      // Get cover photo
      const coverPhoto = property.property_photos?.find((p) => p.is_cover) || property.property_photos?.[0];
      const imageUrl = coverPhoto?.url;
      
      // Format price
      const pricePerNight = property.nightly_price_pennies ? Math.round(property.nightly_price_pennies / 100) : 0;

      // Create marker with custom icon (price label)
      const marker = new google.maps.Marker({
        map: mapRef.current,
        position: { lat: Number(property.latitude), lng: Number(property.longitude) },
        title: property.name,
        label: {
          text: `£${pricePerNight}`,
          color: "white",
          fontWeight: "bold",
          fontSize: "12px",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 0, // Hide default icon, we use label
          fillColor: "#1d4d2b",
          fillOpacity: 1,
          strokeWeight: 0,
        },
      });

      // Create custom marker overlay for better styling
      const icon = {
        url: "data:image/svg+xml," + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="60" height="30">
            <rect x="0" y="0" width="60" height="30" rx="15" fill="#1d4d2b"/>
            <text x="30" y="20" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="12">£${pricePerNight}</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(60, 30),
        anchor: new google.maps.Point(30, 15),
      };
      
      marker.setIcon(icon);

      // Click handler - show info window
      marker.addListener("click", () => {
        if (!infoWindowRef.current) return;

        const stars = property.average_rating
          ? "★".repeat(Math.round(property.average_rating)) +
            "☆".repeat(5 - Math.round(property.average_rating))
          : "";

        const infoContent = `
          <div style="max-width: 280px; font-family: system-ui, sans-serif;">
            ${
              imageUrl
                ? `<img src="${imageUrl}" alt="${property.name}" 
                     style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px 8px 0 0;" />`
                : `<div style="width: 100%; height: 80px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 8px 8px 0 0; color: #999;">No image</div>`
            }
            <div style="padding: 12px;">
              <h3 style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                ${property.name}
              </h3>
              ${property.county ? `<p style="margin: 0 0 8px; font-size: 13px; color: #666;">${property.county}</p>` : ""}
              ${
                stars
                  ? `<p style="margin: 0 0 8px; font-size: 14px; color: #f59e0b;">
                      ${stars} 
                      <span style="color: #666; font-size: 12px;">(${property.review_count || 0} reviews)</span>
                     </p>`
                  : ""
              }
              <p style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #1d4d2b;">
                £${pricePerNight} <span style="font-size: 13px; font-weight: 400; color: #666;">/ night</span>
              </p>
              <a href="/property/${property.id}" 
                 style="display: inline-block; background: #1d4d2b; color: white; padding: 8px 16px; 
                        border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
                View Property
              </a>
            </div>
          </div>
        `;

        infoWindowRef.current.setContent(infoContent);
        infoWindowRef.current.open(mapRef.current, marker);

        if (onPropertyClick) {
          onPropertyClick(property.id);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers if we have properties and not searching as you move
    if (properties.length > 0 && !localSearchAsYouMove && markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      properties.forEach((p) => {
        if (p.latitude && p.longitude) {
          bounds.extend({ lat: Number(p.latitude), lng: Number(p.longitude) });
        }
      });
      mapRef.current.fitBounds(bounds, { padding: 50 });
    }
  }, [properties, isMapReady, onPropertyClick, localSearchAsYouMove]);

  // Handle search as you move toggle
  const handleSearchAsYouMoveToggle = (enabled: boolean) => {
    setLocalSearchAsYouMove(enabled);
    onSearchAsYouMoveChange?.(enabled);
    
    // Trigger immediate search if enabling
    if (enabled && mapRef.current && onBoundsChange) {
      const bounds = mapRef.current.getBounds();
      if (bounds) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        onBoundsChange({
          north: ne.lat(),
          south: sw.lat(),
          east: ne.lng(),
          west: sw.lng(),
        });
      }
    }
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <p className="text-destructive">Failed to load map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full rounded-lg" />
      
      {/* Search as you move toggle */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 z-10">
        <Switch
          id="search-as-move"
          checked={localSearchAsYouMove}
          onCheckedChange={handleSearchAsYouMoveToggle}
        />
        <Label htmlFor="search-as-move" className="text-sm font-medium cursor-pointer">
          Search as I move the map
        </Label>
      </div>

      {/* Property count badge */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 z-10">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-medium">{properties.length} properties</span>
        </div>
      </div>
    </div>
  );
}

