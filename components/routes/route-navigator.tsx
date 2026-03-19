"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  WifiOff,
  Settings,
  Flag,
  Loader2,
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
  onComplete: (stats: {
    distance_km: number;
    duration_seconds: number;
    avg_speed_kmh: number;
  }) => void;
  onPositionUpdate?: (lat: number, lng: number, heading: number) => void;
}

interface NavigationSettings {
  audioEnabled: boolean;
  hazardAlerts: boolean;
  waypointAlerts: boolean;
  offRouteAlerts: boolean;
}

const HAZARD_TYPES = [
  { type: "tree_fall", icon: "\u{1F332}", label: "Fallen tree" },
  { type: "flooding", icon: "\u{1F30A}", label: "Flooding" },
  { type: "livestock", icon: "\u{1F404}", label: "Livestock" },
  { type: "closure", icon: "\u{1F6AB}", label: "Closure" },
  { type: "poor_visibility", icon: "\u{1F32B}\uFE0F", label: "Poor visibility" },
  { type: "ice_snow", icon: "\u{2744}\uFE0F", label: "Ice / snow" },
  { type: "overgrown", icon: "\u{1F33F}", label: "Overgrown" },
  { type: "damaged_path", icon: "\u{1F527}", label: "Damaged path" },
  { type: "dangerous_crossing", icon: "\u{26A1}", label: "Crossing" },
  { type: "erosion", icon: "\u{26A0}\uFE0F", label: "Erosion" },
  { type: "gate_locked", icon: "\u{1F512}", label: "Gate locked" },
  { type: "other", icon: "\u{26A0}\uFE0F", label: "Other" },
];

const HAZARD_ICON_MAP: Record<string, string> = Object.fromEntries(
  HAZARD_TYPES.map((h) => [h.type, h.icon])
);

export function RouteNavigator({
  route,
  isActive,
  onClose,
  onComplete,
  onPositionUpdate,
}: RouteNavigatorProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [userPosition, setUserPosition] = useState<{
    lat: number;
    lng: number;
    heading: number;
  } | null>(null);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [nextWaypoint, setNextWaypoint] = useState<Waypoint | null>(null);
  const [distanceToNextWaypoint, setDistanceToNextWaypoint] = useState<
    number | null
  >(null);
  const [nearbyHazard, setNearbyHazard] = useState<Hazard | null>(null);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pausedTime, setPausedTime] = useState(0);

  // Report form state
  const [selectedReportType, setSelectedReportType] = useState<string | null>(
    null
  );
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [settings, setSettings] = useState<NavigationSettings>({
    audioEnabled: true,
    hazardAlerts: true,
    waypointAlerts: true,
    offRouteAlerts: true,
  });
  const [isOffline, setIsOffline] = useState(false);
  const [completed, setCompleted] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pauseStartRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastHeadingRef = useRef<number>(0);
  const announcedHazardsRef = useRef<Set<string>>(new Set());
  const announcedWaypointsRef = useRef<Set<string>>(new Set());
  const touchStartYRef = useRef<number | null>(null);

  // Calculate distance between two points (metres)
  const getDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number) => {
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
    },
    []
  );

  // Find distance to route
  const getDistanceToRoute = useCallback(
    (lat: number, lng: number) => {
      if (!route.geometry?.coordinates) return Infinity;
      let minDist = Infinity;
      for (const coord of route.geometry.coordinates) {
        const dist = getDistance(lat, lng, coord[1], coord[0]);
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    },
    [route.geometry, getDistance]
  );

  // Speak announcement
  const speak = useCallback(
    (text: string) => {
      if (!settings.audioEnabled) return;
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }
    },
    [settings.audioEnabled]
  );

  // Handle position update
  const handlePositionUpdate = useCallback(
    (position: GeolocationPosition) => {
      if (isPaused) return;

      const { latitude, longitude, heading } = position.coords;
      const effectiveHeading =
        heading && heading > 0 ? heading : lastHeadingRef.current;
      if (heading && heading > 0) lastHeadingRef.current = heading;

      setUserPosition({
        lat: latitude,
        lng: longitude,
        heading: effectiveHeading,
      });
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
        speak(
          "You appear to be off the route. Please return to the marked path."
        );
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
            speak(`Hazard ahead: ${h.title}`);
          });
        } else if (nearbyHazard) {
          const hazardDist = getDistance(
            latitude,
            longitude,
            nearbyHazard.lat,
            nearbyHazard.lng
          );
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

        const next = route.waypoints
          .filter((w) => !announcedWaypointsRef.current.has(w.id))
          .sort((a, b) => {
            const distA = getDistance(latitude, longitude, a.lat, a.lng);
            const distB = getDistance(latitude, longitude, b.lat, b.lng);
            return distA - distB;
          })[0];

        if (next) {
          setNextWaypoint(next);
          setDistanceToNextWaypoint(
            getDistance(latitude, longitude, next.lat, next.lng)
          );
        } else {
          setNextWaypoint(null);
          setDistanceToNextWaypoint(null);
        }
      }

      // Check if completed (near end point)
      const endCoord =
        route.geometry.coordinates[route.geometry.coordinates.length - 1];
      const distToEnd = getDistance(latitude, longitude, endCoord[1], endCoord[0]);
      if (distToEnd < 20 && !completed) {
        setCompleted(true);
        speak("You have arrived at your destination. Well done!");

        fetch(`/api/routes/${route.id}/ride`, { method: "POST" }).catch(
          () => {}
        );

        const durationSecs = Math.floor(
          (Date.now() - startTimeRef.current - pausedTime) / 1000
        );
        const distKm = distanceTraveled / 1000;
        const avgSpeed =
          durationSecs > 0 ? (distKm / durationSecs) * 3600 : 0;
        onComplete({
          distance_km: distKm,
          duration_seconds: durationSecs,
          avg_speed_kmh: avgSpeed,
        });
      }
    },
    [
      isPaused,
      getDistance,
      getDistanceToRoute,
      isOffRoute,
      route,
      settings,
      speak,
      onPositionUpdate,
      onComplete,
      completed,
      distanceTraveled,
      nearbyHazard,
      pausedTime,
    ]
  );

  // Pause/resume tracking
  const togglePause = useCallback(() => {
    if (isPaused) {
      if (pauseStartRef.current) {
        setPausedTime(
          (prev) => prev + (Date.now() - pauseStartRef.current!)
        );
        pauseStartRef.current = null;
      }
    } else {
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

    if ("wakeLock" in navigator) {
      (navigator as any).wakeLock
        .request("screen")
        .then((lock: any) => {
          wakeLockRef.current = lock;
        })
        .catch(() => {});
    }

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    setIsOffline(!navigator.onLine);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      (error) => {
        console.error("GPS error:", error.code, error.message);
        if (error.code === 1) {
          toast.error(
            "Location permission denied. Please allow location access in your browser settings."
          );
        } else if (error.code === 2) {
          toast.error(
            "Unable to determine location. Please check GPS is enabled on your device."
          );
        } else if (error.code === 3) {
          // Timeout — retry with lower accuracy for Android compatibility
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
          }
          watchIdRef.current = navigator.geolocation.watchPosition(
            handlePositionUpdate,
            () => {
              toast.error(
                "GPS signal lost. Please ensure location services are enabled."
              );
            },
            {
              enableHighAccuracy: false,
              maximumAge: 3000,
              timeout: 30000,
            }
          );
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 15000,
      }
    );

    const timer = setInterval(() => {
      if (!isPaused) {
        const totalPaused =
          pausedTime +
          (pauseStartRef.current
            ? Date.now() - pauseStartRef.current
            : 0);
        setElapsedTime(
          Math.floor(
            (Date.now() - startTimeRef.current - totalPaused) / 1000
          )
        );
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

  // Submit hazard/warning report
  const handleSubmitReport = async () => {
    if (!selectedReportType) return;
    if (!userPosition) {
      toast.error("Waiting for GPS location. Please try again in a moment.");
      return;
    }

    setReportSubmitting(true);
    try {
      const hazardType = HAZARD_TYPES.find(
        (h) => h.type === selectedReportType
      );
      const res = await fetch(`/api/routes/${route.id}/hazards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard_type: selectedReportType,
          title: hazardType?.label || selectedReportType,
          description: reportDetails || undefined,
          severity: "moderate",
          lat: userPosition.lat,
          lng: userPosition.lng,
          is_warning: false,
        }),
      });

      if (res.ok) {
        toast.success("Report submitted");
        setReportOpen(false);
        setSelectedReportType(null);
        setReportDetails("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit report");
      }
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setReportSubmitting(false);
    }
  };

  // Format time for ETA display
  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return "< 1 min";
    const h = Math.floor(seconds / 3600);
    const m = Math.ceil((seconds % 3600) / 60);
    if (h > 0) return `${h} hr ${m} min`;
    return `${m} min`;
  };

  // Format distance
  const formatDistance = (metres: number) => {
    if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
    return `${Math.round(metres)}m`;
  };

  // Format clock time
  const formatETA = (secondsRemaining: number) => {
    const eta = new Date(Date.now() + secondsRemaining * 1000);
    return eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Calculate estimated time remaining based on avg speed
  const distanceRemainingM = Math.max(
    0,
    route.distance_km * 1000 - distanceTraveled
  );
  const distanceRemainingKm = distanceRemainingM / 1000;

  // Avg speed from actual travel (kicks in after 200m)
  const avgSpeedKmh =
    distanceTraveled > 200 && elapsedTime > 0
      ? (distanceTraveled / 1000 / elapsedTime) * 3600
      : null;

  const estimatedSecondsRemaining =
    avgSpeedKmh && avgSpeedKmh > 0
      ? (distanceRemainingKm / avgSpeedKmh) * 3600
      : null;

  // Drag handle touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
    if (deltaY > 40) setDrawerExpanded(true);
    if (deltaY < -40) setDrawerExpanded(false);
    touchStartYRef.current = null;
  };

  if (!isActive) return null;

  // Determine top banner content — priority: hazard > off-route > offline > waypoint
  let bannerContent: {
    text: string;
    subtext?: string;
    bg: string;
    icon: React.ReactNode;
  } | null = null;

  if (nearbyHazard) {
    bannerContent = {
      text: `${HAZARD_ICON_MAP[nearbyHazard.hazard_type] || "\u26A0\uFE0F"} ${nearbyHazard.title}`,
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
  } else if (
    nextWaypoint &&
    distanceToNextWaypoint &&
    distanceToNextWaypoint < 500
  ) {
    bannerContent = {
      text: nextWaypoint.name,
      subtext: `${formatDistance(distanceToNextWaypoint)} ahead`,
      bg: "bg-green-600",
      icon: <MapPin className="h-5 w-5 text-white" />,
    };
  }

  return (
    <>
      {/* Top contextual banner */}
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
              <p className="text-white font-semibold text-sm">
                {bannerContent.text}
              </p>
              {bannerContent.subtext && (
                <p className="text-white/80 text-xs">
                  {bannerContent.subtext}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom card — Google Maps style */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 transition-all duration-300"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* PAUSED extension — amber section above the white card */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: isPaused ? "60px" : "0px" }}
        >
          <div
            className="bg-amber-400 rounded-t-2xl px-4 py-3 flex items-center justify-between"
            onClick={togglePause}
          >
            <div className="flex items-center gap-2">
              <Pause className="h-4 w-4 text-amber-900" />
              <span className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                Paused
              </span>
            </div>
            <span className="text-xs font-semibold text-amber-800">
              Tap to resume
            </span>
          </div>
        </div>

        {/* White card */}
        <div
          className={cn(
            "bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.12)]",
            !isPaused && "rounded-t-2xl"
          )}
        >
          {/* Centered drag handle */}
          <button
            className="w-full flex justify-center pt-2.5 pb-1"
            onClick={() => setDrawerExpanded(!drawerExpanded)}
          >
            <div className="w-8 h-1 bg-gray-300 rounded-full" />
          </button>

        {/* Main stats row */}
        <div className="px-4 pb-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* Estimated time remaining — large green text like Google Maps */}
            <span className="text-xl font-bold text-green-600">
              {estimatedSecondsRemaining
                ? formatTimeRemaining(estimatedSecondsRemaining)
                : formatDistance(distanceRemainingM)}
            </span>
            {/* Distance remaining and ETA */}
            <p className="text-xs text-gray-500 mt-0.5">
              {estimatedSecondsRemaining
                ? `${formatDistance(distanceRemainingM)} \u00B7 ${formatETA(estimatedSecondsRemaining)}`
                : `${route.distance_km.toFixed(1)} km total`}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Pause/Play */}
            <button
              onClick={togglePause}
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center transition-colors border",
                isPaused
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              )}
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </button>

            {/* Exit */}
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-5 h-10 font-semibold text-sm"
              onClick={onClose}
            >
              Exit
            </Button>
          </div>
        </div>

        {/* Expanded actions — revealed on drag up with smooth animation */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: drawerExpanded ? "200px" : "0px" }}
        >
          <div className="border-t border-gray-100 px-4 py-3 space-y-1">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
              onClick={() => {
                setReportOpen(true);
                setDrawerExpanded(false);
              }}
            >
              <AlertTriangle className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-700">Add a report</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
              onClick={() => {
                setSettings((s) => ({
                  ...s,
                  audioEnabled: !s.audioEnabled,
                }));
              }}
            >
              {settings.audioEnabled ? (
                <Volume2 className="h-5 w-5 text-gray-500" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-500" />
              )}
              <span className="text-sm text-gray-700">
                Sound {settings.audioEnabled ? "on" : "off"}
              </span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
              onClick={() => {
                setSettingsOpen(true);
                setDrawerExpanded(false);
              }}
            >
              <Settings className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-700">
                Navigation settings
              </span>
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Report sheet — quick picker */}
      <Sheet
        open={reportOpen}
        onOpenChange={(open) => {
          setReportOpen(open);
          if (!open) {
            setSelectedReportType(null);
            setReportDetails("");
          }
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle>What did you find?</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            {/* Hazard type grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {HAZARD_TYPES.map((h) => (
                <button
                  key={h.type}
                  onClick={() =>
                    setSelectedReportType(
                      selectedReportType === h.type ? null : h.type
                    )
                  }
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors",
                    selectedReportType === h.type
                      ? "border-green-500 bg-green-50"
                      : "border-gray-100 hover:border-gray-200 bg-gray-50"
                  )}
                >
                  <span className="text-xl">{h.icon}</span>
                  <span className="text-xs text-gray-700 text-center leading-tight">
                    {h.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Optional details */}
            {selectedReportType && (
              <div className="space-y-3">
                <Textarea
                  placeholder="Add details (optional)"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleSubmitReport}
                  disabled={reportSubmitting}
                >
                  {reportSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Flag className="h-4 w-4 mr-2" />
                  )}
                  Submit Report
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, audioEnabled: v }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="hazards">Hazard alerts</Label>
              <Switch
                id="hazards"
                checked={settings.hazardAlerts}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, hazardAlerts: v }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="waypoints">Waypoint alerts</Label>
              <Switch
                id="waypoints"
                checked={settings.waypointAlerts}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, waypointAlerts: v }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="offroute">Off-route warnings</Label>
              <Switch
                id="offroute"
                checked={settings.offRouteAlerts}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, offRouteAlerts: v }))
                }
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
