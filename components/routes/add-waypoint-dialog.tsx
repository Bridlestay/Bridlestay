"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { AlertTriangle, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getDistanceMeters } from "./route-detail-constants";

const WAYPOINT_TAGS = [
  { value: "poi", label: "Point of Interest" },
  { value: "instruction", label: "Instruction" },
  { value: "caution", label: "Caution" },
  { value: "note", label: "Note" },
];

const ICON_TYPES = [
  { value: "viewpoint", label: "Viewpoint" },
  { value: "water", label: "Water" },
  { value: "hazard", label: "Hazard" },
  { value: "parking", label: "Parking" },
  { value: "pub", label: "Pub" },
  { value: "gate", label: "Gate" },
  { value: "rest", label: "Rest Stop" },
  { value: "historic", label: "Historic" },
  { value: "wildlife", label: "Wildlife" },
  { value: "bridge", label: "Bridge" },
  { value: "ford", label: "Ford" },
  { value: "stile", label: "Stile" },
  { value: "other", label: "Other" },
];

interface AddWaypointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  routeGeometry?: any;
  onWaypointAdded: (waypoint: any) => void;
}

export function AddWaypointDialog({
  open,
  onOpenChange,
  routeId,
  routeGeometry,
  onWaypointAdded,
}: AddWaypointDialogProps) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("note");
  const [iconType, setIconType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [locationStatus, setLocationStatus] = useState<
    "idle" | "checking" | "near" | "far" | "error"
  >("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const checkUserLocation = () => {
    setLocationStatus("checking");
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserCoords({ lat: userLat, lng: userLng });

        const geometry = routeGeometry;
        if (!geometry?.coordinates) {
          setLocationStatus("near");
          return;
        }

        let minDistance = Infinity;
        const coords = geometry.coordinates as [number, number][];

        for (const coord of coords) {
          const distance = getDistanceMeters(
            userLat,
            userLng,
            coord[1],
            coord[0]
          );
          if (distance < minDistance) {
            minDistance = distance;
          }
        }

        const MAX_DISTANCE_METERS = 500;
        if (minDistance <= MAX_DISTANCE_METERS) {
          setLocationStatus("near");
        } else {
          setLocationStatus("far");
          setLocationError(
            `You appear to be ${Math.round(minDistance / 1000)}km from this route. Waypoints must be added while near the route.`
          );
        }
      },
      (error) => {
        setLocationStatus("error");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(
              "Location access denied. Please enable location services to add waypoints."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location unavailable. Please try again.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again.");
            break;
          default:
            setLocationError(
              "Unable to get your location. Please try again."
            );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (open && locationStatus === "idle") {
      checkUserLocation();
    }
    if (!open) {
      setLocationStatus("idle");
      setLocationError(null);
      setName("");
      setTag("note");
      setIconType("");
      setDescription("");
      setUserCoords(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a waypoint name");
      return;
    }
    if (!userCoords) {
      toast.error("Location not available");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/routes/${routeId}/waypoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: userCoords.lat,
          lng: userCoords.lng,
          name: name.trim(),
          tag,
          icon_type: iconType || undefined,
          description: description.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onWaypointAdded(data.waypoint);
        onOpenChange(false);
        toast.success("Waypoint added! Thank you for contributing.");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add waypoint");
      }
    } catch {
      toast.error("Failed to add waypoint");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Waypoint</DialogTitle>
          <DialogDescription>
            Mark a useful point along this route for other riders.
          </DialogDescription>
        </DialogHeader>

        {/* Location Status Banners */}
        {locationStatus === "checking" && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-sm text-blue-700">
              Checking your location...
            </span>
          </div>
        )}
        {locationStatus === "near" && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">
              Location verified &mdash; you&apos;re near the route
            </span>
          </div>
        )}
        {locationStatus === "far" && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">
                Too far from route
              </span>
            </div>
            <p className="text-sm text-orange-600">{locationError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={checkUserLocation}
            >
              Try Again
            </Button>
          </div>
        )}
        {locationStatus === "error" && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                Location Error
              </span>
            </div>
            <p className="text-sm text-red-600">{locationError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={checkUserLocation}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Form — only when location verified */}
        {locationStatus === "near" && (
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. River crossing, Scenic viewpoint"
                maxLength={100}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tag</Label>
                <Select value={tag} onValueChange={setTag}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WAYPOINT_TAGS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Icon</Label>
                <Select value={iconType} onValueChange={setIconType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this waypoint..."
                maxLength={500}
                className="min-h-[60px]"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting || locationStatus !== "near" || !name.trim()
            }
            className="bg-green-600 hover:bg-green-700"
          >
            {submitting ? "Adding..." : "Add Waypoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
