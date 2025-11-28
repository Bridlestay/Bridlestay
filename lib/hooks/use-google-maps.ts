/**
 * Hook to load Google Maps API
 */

import { useEffect, useState } from "react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    // Debug: Check what we're getting
    console.log("[Google Maps] Checking API key...");
    console.log("[Google Maps] Key exists:", !!GOOGLE_MAPS_API_KEY);
    console.log("[Google Maps] Key length:", GOOGLE_MAPS_API_KEY?.length || 0);
    console.log("[Google Maps] Key starts with:", GOOGLE_MAPS_API_KEY?.substring(0, 10) || "N/A");
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("[Google Maps] API key not found in environment variables");
      console.error("[Google Maps] Make sure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is in .env.local");
      console.error("[Google Maps] IMPORTANT: You MUST restart the dev server (npm run dev) after adding env vars!");
      setLoadError(new Error("Google Maps API key not found"));
      return;
    }

    console.log("[Google Maps] API key found, loading script...");

    // Check if already loaded
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    
    if (existingScript) {
      existingScript.addEventListener("load", () => setIsLoaded(true));
      return;
    }

    // Load script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,drawing,geometry`;
    script.async = true;
    script.defer = true;

    script.addEventListener("load", () => {
      console.log("[Google Maps] Script loaded successfully");
      setIsLoaded(true);
    });

    script.addEventListener("error", (e) => {
      console.error("[Google Maps] Script failed to load:", e);
      setLoadError(new Error("Failed to load Google Maps - check API key and browser console"));
    });

    document.head.appendChild(script);
  }, []);

  return { isLoaded, loadError };
}

declare global {
  interface Window {
    google: typeof google;
  }
}

