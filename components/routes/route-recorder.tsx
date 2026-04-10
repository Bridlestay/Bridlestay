"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Circle,
  Square,
  Pause,
  Play,
  MapPin,
  Clock,
  Ruler,
  TrendingUp,
  Save,
  Trash2,
  Navigation,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RecordedPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
}

interface RouteRecorderProps {
  isRecording: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSave: (routeData: {
    title: string;
    description: string;
    visibility: string;
    difficulty: string;
    geometry: { type: string; coordinates: [number, number][] };
    distance_km: number;
    estimated_time_minutes: number;
  }) => Promise<void>;
  onDiscard: () => void;
  onPointRecorded?: (point: RecordedPoint) => void;
}

const DIFFICULTY_OPTIONS = [
  { value: "unrated", label: "Unrated" },
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "difficult", label: "Difficult" },
  { value: "severe", label: "Severe" },
];

export function RouteRecorder({
  isRecording,
  onStart,
  onPause,
  onResume,
  onStop,
  onSave,
  onDiscard,
  onPointRecorded,
}: RouteRecorderProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [recordedPoints, setRecordedPoints] = useState<RecordedPoint[]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  
  const [routeDetails, setRouteDetails] = useState({
    title: "",
    description: "",
    visibility: "private",
    difficulty: "unrated",
  });

  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pauseTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate distance between two points
  const getDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
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

  // Handle position update
  const handlePosition = useCallback((position: GeolocationPosition) => {
    if (isPaused) return;

    const point: RecordedPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      timestamp: Date.now(),
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude || undefined,
      speed: position.coords.speed || undefined,
    };

    setGpsAccuracy(position.coords.accuracy);

    // Only record if accuracy is reasonable (< 30m)
    if (point.accuracy > 30) {
      return;
    }

    setRecordedPoints((prev) => {
      const newPoints = [...prev, point];
      
      // Calculate distance
      if (prev.length > 0) {
        const lastPoint = prev[prev.length - 1];
        const dist = getDistance(lastPoint.lat, lastPoint.lng, point.lat, point.lng);
        
        // Only add distance if moved more than 5m (reduce GPS noise)
        if (dist > 0.005) {
          setDistanceKm((d) => d + dist);
        }
      }
      
      return newPoints;
    });

    // Update speed
    if (point.speed !== undefined && point.speed > 0) {
      const speedKmh = point.speed * 3.6;
      setCurrentSpeed(speedKmh);
      setMaxSpeed((max) => Math.max(max, speedKmh));
    }

    onPointRecorded?.(point);
  }, [isPaused, getDistance, onPointRecorded]);

  // Start recording
  useEffect(() => {
    if (!isRecording) return;

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported");
      return;
    }

    // Request wake lock to keep screen on
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').catch(() => {});
    }

    startTimeRef.current = Date.now();

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (error) => {
        console.error("GPS error:", error);
        toast.error("GPS signal lost. Please ensure location is enabled.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );

    // Timer for elapsed time
    timerRef.current = setInterval(() => {
      if (!isPaused && startTimeRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current - pauseTimeRef.current) / 1000));
      }
    }, 1000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, handlePosition, isPaused]);

  // Photo reminder toast — fires 2 minutes into recording
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const PHOTO_REMINDER_KEY = "padoq_hide_photo_reminder";
    if (typeof window !== "undefined" && localStorage.getItem(PHOTO_REMINDER_KEY) === "true") return;

    const timer = setTimeout(() => {
      toast("Don\u2019t forget to take photos along the way!", {
        description: "Photos help other riders discover your route.",
        duration: 8000,
        action: {
          label: "Don\u2019t remind me",
          onClick: () => localStorage.setItem(PHOTO_REMINDER_KEY, "true"),
        },
      });
    }, 120000); // 2 minutes

    return () => clearTimeout(timer);
  }, [isRecording, isPaused]);

  // Calculate average speed
  useEffect(() => {
    if (elapsedSeconds > 0 && distanceKm > 0) {
      setAvgSpeed((distanceKm / elapsedSeconds) * 3600);
    }
  }, [distanceKm, elapsedSeconds]);

  const handlePause = () => {
    setIsPaused(true);
    pauseTimeRef.current = Date.now();
    onPause();
  };

  const handleResume = () => {
    if (pauseTimeRef.current > 0 && startTimeRef.current) {
      pauseTimeRef.current = Date.now() - pauseTimeRef.current;
    }
    setIsPaused(false);
    onResume();
  };

  const handleStop = () => {
    if (recordedPoints.length < 2) {
      toast.error("Not enough points recorded. Please record more of your route.");
      return;
    }
    setShowSaveDialog(true);
    onStop();
  };

  const handleSave = async () => {
    if (!routeDetails.title.trim()) {
      toast.error("Please enter a route name");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: routeDetails.title.trim(),
        description: routeDetails.description.trim(),
        visibility: routeDetails.visibility,
        difficulty: routeDetails.difficulty,
        geometry: {
          type: "LineString",
          coordinates: recordedPoints.map((p) => [p.lng, p.lat]),
        },
        distance_km: distanceKm,
        estimated_time_minutes: Math.round(elapsedSeconds / 60),
      });
      
      setShowSaveDialog(false);
      resetRecorder();
      toast.success("Route saved successfully!");
    } catch (error) {
      toast.error("Failed to save route");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setShowDiscardDialog(false);
    resetRecorder();
    onDiscard();
  };

  const resetRecorder = () => {
    setRecordedPoints([]);
    setDistanceKm(0);
    setElapsedSeconds(0);
    setCurrentSpeed(0);
    setMaxSpeed(0);
    setAvgSpeed(0);
    setIsPaused(false);
    setRouteDetails({ title: "", description: "", visibility: "private", difficulty: "unrated" });
    startTimeRef.current = null;
    pauseTimeRef.current = 0;
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!isRecording) {
    return (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
        <Button
          size="lg"
          className="gap-2 bg-red-600 hover:bg-red-700 rounded-full px-8 py-6 shadow-xl"
          onClick={onStart}
        >
          <Circle className="h-5 w-5 fill-white" />
          Start Recording
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Recording panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl safe-area-inset-bottom">
        {/* GPS accuracy indicator */}
        {gpsAccuracy !== null && (
          <div className="flex justify-center pt-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                gpsAccuracy < 10
                  ? "bg-green-50 text-green-700 border-green-300"
                  : gpsAccuracy < 20
                  ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                  : "bg-red-50 text-red-700 border-red-300"
              )}
            >
              <Navigation className="h-3 w-3 mr-1" />
              GPS: ±{Math.round(gpsAccuracy)}m
            </Badge>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 p-4">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <Ruler className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{distanceKm.toFixed(2)}</p>
            <p className="text-xs text-gray-500">km</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <Clock className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{formatTime(elapsedSeconds)}</p>
            <p className="text-xs text-gray-500">time</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{avgSpeed.toFixed(1)}</p>
            <p className="text-xs text-gray-500">km/h avg</p>
          </div>
        </div>

        {/* Additional stats */}
        <div className="px-4 pb-2 flex justify-center gap-6 text-sm text-gray-600">
          <span>Current: {currentSpeed.toFixed(1)} km/h</span>
          <span>Max: {maxSpeed.toFixed(1)} km/h</span>
          <span>Points: {recordedPoints.length}</span>
        </div>

        {/* Controls */}
        <div className="px-4 pb-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            className="gap-2 rounded-full"
            onClick={() => setShowDiscardDialog(true)}
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          <Button
            size="lg"
            className={cn(
              "gap-2 rounded-full w-32 h-16",
              isPaused ? "bg-primary hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"
            )}
            onClick={isPaused ? handleResume : handlePause}
          >
            {isPaused ? (
              <>
                <Play className="h-6 w-6" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-6 w-6" />
                Pause
              </>
            )}
          </Button>

          <Button
            size="lg"
            className="gap-2 bg-red-600 hover:bg-red-700 rounded-full w-32 h-16"
            onClick={handleStop}
          >
            <Square className="h-5 w-5 fill-white" />
            Stop
          </Button>
        </div>
      </div>

      {/* Save dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Your Route</DialogTitle>
            <DialogDescription>
              Great ride! You recorded {distanceKm.toFixed(2)} km in {formatTime(elapsedSeconds)}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Route Name *</Label>
              <Input
                placeholder="Give your route a name..."
                value={routeDetails.title}
                onChange={(e) => setRouteDetails((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe your route..."
                value={routeDetails.description}
                onChange={(e) => setRouteDetails((d) => ({ ...d, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label>Visibility</Label>
              <Select
                value={routeDetails.visibility}
                onValueChange={(v) => setRouteDetails((d) => ({ ...d, visibility: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private - Only you</SelectItem>
                  <SelectItem value="unlisted">Anyone with Link</SelectItem>
                  <SelectItem value="public">Public - Anyone can see</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Difficulty</Label>
              <Select
                value={routeDetails.difficulty}
                onValueChange={(v) => setRouteDetails((d) => ({ ...d, difficulty: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Route"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Discard Recording?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to discard this recording? You've recorded {distanceKm.toFixed(2)} km. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>
              Keep Recording
            </Button>
            <Button variant="destructive" onClick={handleDiscard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

