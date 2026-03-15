"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  X,
  Navigation,
  MapPin,
  Flag,
  ChevronUp,
  ChevronDown,
  Settings,
  Pause,
  Play,
  RotateCcw,
  AlertCircle,
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
  roadCrossingAlerts: boolean;
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
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [nextWaypoint, setNextWaypoint] = useState<Waypoint | null>(null);
  const [distanceToNextWaypoint, setDistanceToNextWaypoint] = useState<number | null>(null);
  const [nearbyHazards, setNearbyHazards] = useState<Hazard[]>([]);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const [settings, setSettings] = useState<NavigationSettings>({
    audioEnabled: true,
    hazardAlerts: true,
    waypointAlerts: true,
    roadCrossingAlerts: true,
    offRouteAlerts: true,
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [completed, setCompleted] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const announcedHazardsRef = useRef<Set<string>>(new Set());
  const announcedWaypointsRef = useRef<Set<string>>(new Set());

  // Calculate distance between two points
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
    
    if ('speechSynthesis' in window) {
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
    setUserPosition({ lat: latitude, lng: longitude, heading: heading || 0 });
    onPositionUpdate?.(latitude, longitude, heading || 0);

    // Calculate distance traveled
    if (lastPositionRef.current) {
      const dist = getDistance(
        lastPositionRef.current.lat,
        lastPositionRef.current.lng,
        latitude,
        longitude
      );
      if (dist > 5) { // Only count if moved more than 5m
        setDistanceTraveled((prev) => prev + dist);
        lastPositionRef.current = { lat: latitude, lng: longitude };
      }
    } else {
      lastPositionRef.current = { lat: latitude, lng: longitude };
    }

    // Check if off route
    const distToRoute = getDistanceToRoute(latitude, longitude);
    const wasOffRoute = isOffRoute;
    const nowOffRoute = distToRoute > 50; // 50m threshold
    setIsOffRoute(nowOffRoute);

    if (nowOffRoute && !wasOffRoute && settings.offRouteAlerts) {
      playAlert();
      speak("You appear to be off the route. Please return to the marked path.");
      toast.warning("Off route! Return to the path.", { duration: 5000 });
    }

    // Check for nearby hazards
    if (route.hazards && settings.hazardAlerts) {
      const nearby = route.hazards.filter((h) => {
        const dist = getDistance(latitude, longitude, h.lat, h.lng);
        return dist < 200 && !announcedHazardsRef.current.has(h.id);
      });

      if (nearby.length > 0) {
        setNearbyHazards(nearby);
        nearby.forEach((h) => {
          announcedHazardsRef.current.add(h.id);
          playAlert();
          speak(`Hazard ahead: ${h.title}`);
          toast.warning(`⚠️ ${h.title}`, { 
            description: h.hazard_type.replace(/_/g, " "),
            duration: 8000 
          });
        });
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
          toast.info(`📍 ${w.name}`, { duration: 5000 });
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

      const durationSecs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const distKm = distanceTraveled / 1000;
      const avgSpeed = durationSecs > 0 ? (distKm / durationSecs) * 3600 : 0;
      onComplete({
        distance_km: distKm,
        duration_seconds: durationSecs,
        avg_speed_kmh: avgSpeed,
      });
    }
  }, [isPaused, getDistance, getDistanceToRoute, isOffRoute, route, settings, speak, playAlert, onPositionUpdate, onComplete, completed, distanceTraveled]);

  // Start GPS tracking + wake lock + offline detection
  useEffect(() => {
    if (!isActive) return;

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your device");
      return;
    }

    startTimeRef.current = Date.now();
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
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearInterval(timer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      // Release wake lock
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isActive, handlePositionUpdate, isPaused]);

  // Format time
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = (distanceTraveled / 1000 / route.distance_km) * 100;

  if (!isActive) return null;

  return (
    <>
      {/* Audio element for alerts */}
      <audio ref={audioRef} src="/sounds/alert.mp3" preload="auto" />

      {/* Navigation panel - mobile-first design */}
      <div 
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-all duration-300",
          expanded ? "h-[70vh]" : "h-auto"
        )}
      >
        {/* Drag handle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex justify-center py-2"
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </button>

        {/* Header */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm truncate max-w-[200px]">{route.title}</h3>
              <p className="text-xs text-gray-500">
                {formatTime(elapsedTime)} • {(distanceTraveled / 1000).toFixed(2)} km
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettings((s) => ({ ...s, audioEnabled: !s.audioEnabled }))}
            >
              {settings.audioEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <Progress value={Math.min(progress, 100)} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{(distanceTraveled / 1000).toFixed(1)} km</span>
            <span>{route.distance_km.toFixed(1)} km</span>
          </div>
        </div>

        {/* Offline warning */}
        {isOffline && (
          <div className="mx-4 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">Limited Connectivity</p>
              <p className="text-xs text-amber-600">Map tiles may not load. GPS tracking still active.</p>
            </div>
          </div>
        )}

        {/* Off route warning */}
        {isOffRoute && (
          <div className="mx-4 mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-orange-800">Off Route</p>
              <p className="text-xs text-orange-600">Return to the marked path</p>
            </div>
          </div>
        )}

        {/* Nearby hazards */}
        {nearbyHazards.length > 0 && (
          <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-800">Hazard Ahead</span>
            </div>
            {nearbyHazards.map((h) => (
              <div key={h.id} className="flex items-center gap-2 text-sm text-red-700">
                <span>{HAZARD_ICONS[h.hazard_type] || "⚠️"}</span>
                <span>{h.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Next waypoint */}
        {nextWaypoint && distanceToNextWaypoint && (
          <div className="mx-4 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <MapPin className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">{nextWaypoint.name}</p>
              <p className="text-xs text-blue-600">
                {distanceToNextWaypoint > 1000
                  ? `${(distanceToNextWaypoint / 1000).toFixed(1)} km ahead`
                  : `${Math.round(distanceToNextWaypoint)}m ahead`}
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="px-4 pb-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => {
              setDistanceTraveled(0);
              setElapsedTime(0);
              startTimeRef.current = Date.now();
              lastPositionRef.current = null;
              announcedHazardsRef.current.clear();
              announcedWaypointsRef.current.clear();
              toast.info("Navigation reset");
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            size="lg"
            className={cn(
              "gap-2 px-8",
              isPaused ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"
            )}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="gap-2"
            onClick={onClose}
          >
            <Flag className="h-4 w-4" />
            End
          </Button>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="px-4 pb-4 border-t pt-4">
            <h4 className="font-medium mb-3">Route Stats</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{(distanceTraveled / 1000).toFixed(2)}</p>
                <p className="text-xs text-gray-500">km traveled</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{formatTime(elapsedTime)}</p>
                <p className="text-xs text-gray-500">elapsed</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{Math.round(progress)}%</p>
                <p className="text-xs text-gray-500">complete</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings sheet */}
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

