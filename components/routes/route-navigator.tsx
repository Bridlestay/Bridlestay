"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertTriangle,
  Volume2,
  VolumeX,
  MapPin,
  Pause,
  Play,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon_type?: string;
}

interface Hazard {
  id: string;
  title: string;
  hazard_type: string;
  severity: string;
  lat: number;
  lng: number;
}

interface RouteNavigatorProps {
  route: {
    id: string;
    title: string;
    geometry: { coordinates: [number, number][] };
    distance_km: number;
    waypoints?: Waypoint[];
    hazards?: Hazard[];
  };
  isActive: boolean;
  onClose: () => void;
  onComplete: (stats: { distance_km: number; duration_seconds: number; avg_speed_kmh: number }) => void;
  onPositionUpdate?: (lat: number, lng: number, heading: number) => void;
}

interface NavigationSettings {
  audioEnabled: boolean;
  hazardAlerts: boolean;
  waypointAlerts: boolean;
  offRouteAlerts: boolean;
}

const HAZARD_ICONS: Record<string, string> = {
  tree_fall: "🌲",
  flooding: "🌊",
  erosion: "⚠️",
  livestock: "🐄",
  closure: "🚫",
  poor_visibility: "🌫️",
  ice_snow: "❄️",
  overgrown: "🌿",
  damaged_path: "🔧",
  dangerous_crossing: "⚡",
  other: "⚠️",
};

export function RouteNavigator({
  route,
  isActive,
  onClose,
  onComplete,
  onPositionUpdate,
}: RouteNavigatorProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number; heading: number } | null>(null);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [nextWaypoint, setNextWaypoint] = useState<Waypoint | null>(null);
  const [distanceToNextWaypoint, setDistanceToNextWaypoint] = useState<number | null>(null);
  const [nearbyHazard, setNearbyHazard] = useState<Hazard | null>(null);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pausedTime, setPausedTime] = useState(0);

  const [settings, setSettings] = useState<NavigationSettings>({
    audioEnabled: true,
    hazardAlerts: true,
    waypointAlerts: true,
    offRouteAlerts: true,
  });
  const [isOffline, setIsOffline] = useState(false);
  const [completed, setCompleted] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pauseStartRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastHeadingRef = useRef<number>(0);
  const announcedHazardsRef = useRef<Set<string>>(new Set());
  const announcedWaypointsRef = useRef<Set<string>>(new Set());

  // Calculate distance between two points (metres)
  const getDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Find distance to route
  const getDistanceToRoute = useCallback((lat: number, lng: number) => {
    if (!route.geometry?.coordinates) return Infinity;
    let minDist = Infinity;
    for (const coord of route.geometry.coordinates) {
      const dist = getDistance(lat, lng, coord[1], coord[0]);
      if (dist < minDist) minDist = dist;
    }
    return minDist;
  }, [route.geometry, getDistance]);

  // Speak announcement
  const speak = useCallback((text: string) => {
    if (!settings.audioEnabled) return;
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, [settings.audioEnabled]);

  // Play alert sound
  const playAlert = useCallback(() => {
    if (!settings.audioEnabled || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }, [settings.audioEnabled]);

  // Handle position update
  const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
    if (isPaused) return;

    const { latitude, longitude, heading } = position.coords;
    // Use last known heading if current heading is null/0 (stationary)
    const effectiveHeading = heading && heading > 0 ? heading : lastHeadingRef.current;
    if (heading && heading > 0) lastHeadingRef.current = heading;

    setUserPosition({ lat: latitude, lng: longitude, heading: effectiveHeading });
    onPositionUpdate?.(latitude, longitude, effectiveHeading);

    // Calculate distance traveled
    if (lastPositionRef.current) {
      const dist = getDistance(
        lastPositionRef.current.lat,
        lastPositionRef.current.lng,
        latitude,
        longitude
      );
      if (dist > 5) {
        setDistanceTraveled((prev) => prev + dist);
        lastPositionRef.current = { lat: latitude, lng: longitude };
      }
    } else {
      lastPositionRef.current = { lat: latitude, lng: longitude };
    }

    // Check if off route
    const distToRoute = getDistanceToRoute(latitude, longitude);
    const wasOffRoute = isOffRoute;
    const nowOffRoute = distToRoute > 50;
    setIsOffRoute(nowOffRoute);

    if (nowOffRoute && !wasOffRoute && settings.offRouteAlerts) {
      playAlert();
      speak("You appear to be off the route. Please return to the marked path.");
    }

    // Check for nearby hazards
    if (route.hazards && settings.hazardAlerts) {
      const nearby = route.hazards.filter((h) => {
        const dist = getDistance(latitude, longitude, h.lat, h.lng);
        return dist < 200 && !announcedHazardsRef.current.has(h.id);
      });

      if (nearby.length > 0) {
        setNearbyHazard(nearby[0]);
        nearby.forEach((h) => {
          announcedHazardsRef.current.add(h.id);
          playAlert();
          speak(`Hazard ahead: ${h.title}`);
        });
      } else if (nearbyHazard) {
        // Clear hazard when rider is past it
        const hazardDist = getDistance(latitude, longitude, nearbyHazard.lat, nearbyHazard.lng);
        if (hazardDist > 250) setNearbyHazard(null);
      }
    }

    // Check for upcoming waypoints
    if (route.waypoints && settings.waypointAlerts) {
      const upcoming = route.waypoints.filter((w) => {
        const dist = getDistance(latitude, longitude, w.lat, w.lng);
        return dist < 150 && !announcedWaypointsRef.current.has(w.id);
      });

      if (upcoming.length > 0) {
        upcoming.forEach((w) => {
          announcedWaypointsRef.current.add(w.id);
          speak(`Approaching ${w.name}`);
        });
      }

      // Update next waypoint
      const next = route.waypoints
        .filter((w) => !announcedWaypointsRef.current.has(w.id))
        .sort((a, b) => {
          const distA = getDistance(latitude, longitude, a.lat, a.lng);
          const distB = getDistance(latitude, longitude, b.lat, b.lng);
          return distA - distB;
        })[0];

      if (next) {
        setNextWaypoint(next);
        setDistanceToNextWaypoint(getDistance(latitude, longitude, next.lat, next.lng));
      } else {
        setNextWaypoint(null);
        setDistanceToNextWaypoint(null);
      }
    }

    // Check if completed (near end point)
    const endCoord = route.geometry.coordinates[route.geometry.coordinates.length - 1];
    const distToEnd = getDistance(latitude, longitude, endCoord[1], endCoord[0]);
    if (distToEnd < 30 && !completed) {
      setCompleted(true);
      speak("You have arrived at your destination. Well done!");

      // Auto-log ride tally
      fetch(`/api/routes/${route.id}/ride`, { method: "POST" }).catch(() => {});

      const durationSecs = Math.floor((Date.now() - startTimeRef.current - pausedTime) / 1000);
      const distKm = distanceTraveled / 1000;
      const avgSpeed = durationSecs > 0 ? (distKm / durationSecs) * 3600 : 0;
      onComplete({
        distance_km: distKm,
        duration_seconds: durationSecs,
        avg_speed_kmh: avgSpeed,
      });
    }
  }, [isPaused, getDistance, getDistanceToRoute, isOffRoute, route, settings, speak, playAlert, onPositionUpdate, onComplete, completed, distanceTraveled, nearbyHazard, pausedTime]);

  // Pause/resume tracking
  const togglePause = useCallback(() => {
    if (isPaused) {
      // Resuming — add paused duration
      if (pauseStartRef.current) {
        setPausedTime((prev) => prev + (Date.now() - pauseStartRef.current!));
        pauseStartRef.current = null;
      }
    } else {
      // Pausing — record when pause started
      pauseStartRef.current = Date.now();
    }
    setIsPaused(!isPaused);
  }, [isPaused]);

  // Start GPS tracking + wake lock + offline detection
  useEffect(() => {
    if (!isActive) return;

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your device");
      return;
    }

    startTimeRef.current = Date.now();
    setPausedTime(0);
    setCompleted(false);

    // Request wake lock to keep screen on
    if ("wakeLock" in navigator) {
      (navigator as any).wakeLock.request("screen")
        .then((lock: any) => { wakeLockRef.current = lock; })
        .catch(() => {});
    }

    // Offline detection
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    setIsOffline(!navigator.onLine);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      (error) => {
        console.error("GPS error:", error);
        toast.error("GPS signal lost. Please ensure location services are enabled.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    // Elapsed time timer
    const timer = setInterval(() => {
      if (!isPaused) {
        const totalPaused = pausedTime + (pauseStartRef.current ? Date.now() - pauseStartRef.current : 0);
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current - totalPaused) / 1000));
      }
    }, 1000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearInterval(timer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isActive, handlePositionUpdate, isPaused, pausedTime]);

  // Format time
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Format distance
  const formatDistance = (metres: number) => {
    if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
    return `${Math.round(metres)}m`;
  };

  const distanceRemaining = Math.max(0, route.distance_km * 1000 - distanceTraveled);

  if (!isActive) return null;

  // Determine top banner content — priority: hazard > off-route > offline > waypoint
  let bannerContent: { text: string; subtext?: string; bg: string; icon: React.ReactNode } | null = null;

  if (nearbyHazard) {
    bannerContent = {
      text: `${HAZARD_ICONS[nearbyHazard.hazard_type] || "⚠️"} ${nearbyHazard.title}`,
      subtext: nearbyHazard.hazard_type.replace(/_/g, " "),
      bg: "bg-red-600",
      icon: <AlertTriangle className="h-5 w-5 text-white" />,
    };
  } else if (isOffRoute) {
    bannerContent = {
      text: "Off route",
      subtext: "Return to the marked path",
      bg: "bg-amber-500",
      icon: <AlertCircle className="h-5 w-5 text-white" />,
    };
  } else if (isOffline) {
    bannerContent = {
      text: "Limited connectivity",
      subtext: "GPS still active",
      bg: "bg-amber-500",
      icon: <WifiOff className="h-4 w-4 text-white" />,
    };
  } else if (nextWaypoint && distanceToNextWaypoint && distanceToNextWaypoint < 500) {
    bannerContent = {
      text: nextWaypoint.name,
      subtext: `${formatDistance(distanceToNextWaypoint)} ahead`,
      bg: "bg-green-600",
      icon: <MapPin className="h-5 w-5 text-white" />,
    };
  }

  return (
    <>
      {/* Audio element for alerts */}
      <audio ref={audioRef} src="/sounds/alert.mp3" preload="auto" />

      {/* Top contextual banner — Google Maps inspired pill */}
      {bannerContent && (
        <div className="fixed top-4 left-4 right-4 z-40 flex justify-center pointer-events-none">
          <div
            className={cn(
              "px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 max-w-sm pointer-events-auto",
              bannerContent.bg
            )}
          >
            {bannerContent.icon}
            <div>
              <p className="text-white font-semibold text-sm">{bannerContent.text}</p>
              {bannerContent.subtext && (
                <p className="text-white/80 text-xs">{bannerContent.subtext}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Minimal bottom bar — Google Maps inspired */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.1)]">
        {/* PAUSED indicator banner */}
        {isPaused && (
          <div className="bg-amber-400 px-4 py-1.5 flex items-center justify-center gap-2">
            <Pause className="h-3.5 w-3.5 text-amber-900" />
            <span className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
              Paused
            </span>
          </div>
        )}

        <div className="px-4 py-3 flex items-center justify-between">
          {/* Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <span>{formatTime(elapsedTime)}</span>
              <span className="text-gray-300">·</span>
              <span>{(distanceTraveled / 1000).toFixed(2)} km</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDistance(distanceRemaining)} remaining
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Pause/Play */}
            <button
              onClick={togglePause}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                isPaused
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>

            {/* Sound */}
            <button
              onClick={() => setSettings((s) => ({ ...s, audioEnabled: !s.audioEnabled }))}
              className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {settings.audioEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {/* Exit */}
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-5 h-9 font-semibold text-sm"
              onClick={onClose}
            >
              Exit
            </Button>
          </div>
        </div>
      </div>

      {/* Settings sheet — accessible via long-press on sound icon */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Navigation Settings</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="audio">Audio announcements</Label>
              <Switch
                id="audio"
                checked={settings.audioEnabled}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, audioEnabled: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="hazards">Hazard alerts</Label>
              <Switch
                id="hazards"
                checked={settings.hazardAlerts}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, hazardAlerts: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="waypoints">Waypoint alerts</Label>
              <Switch
                id="waypoints"
                checked={settings.waypointAlerts}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, waypointAlerts: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="offroute">Off-route warnings</Label>
              <Switch
                id="offroute"
                checked={settings.offRouteAlerts}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, offRouteAlerts: v }))}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
