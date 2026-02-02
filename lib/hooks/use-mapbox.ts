"use client";

import { useState, useEffect } from "react";

/**
 * Hook to load Mapbox GL JS
 * Unlike Google Maps, Mapbox loads via npm package not script tag,
 * but we still need to handle the CSS and check it's ready
 */
export function useMapbox() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Check for access token
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!token) {
      setLoadError("Mapbox token not found. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local");
      return;
    }

    if (!token.startsWith("pk.")) {
      setLoadError("Invalid Mapbox token. Token should start with 'pk.'");
      return;
    }

    // Load Mapbox CSS if not already loaded
    const cssId = "mapbox-gl-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css";
      document.head.appendChild(link);
    }

    // Load Geocoder CSS if not already loaded
    const geocoderCssId = "mapbox-geocoder-css";
    if (!document.getElementById(geocoderCssId)) {
      const link = document.createElement("link");
      link.id = geocoderCssId;
      link.rel = "stylesheet";
      link.href = "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css";
      document.head.appendChild(link);
    }

    // Small delay to ensure CSS is loaded
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return { isLoaded, loadError };
}

/**
 * Get the Mapbox access token
 */
export function getMapboxToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
}

