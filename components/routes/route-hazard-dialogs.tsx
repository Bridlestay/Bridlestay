"use client";

import { Badge } from "@/components/ui/badge";
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
import { AlertTriangle, MapPin, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  HAZARD_TYPES,
  WARNING_TYPES,
  SEVERITY_COLORS,
  getDistanceMeters,
} from "./route-detail-constants";

// --- Hazard Report Dialog ---

interface HazardReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  route: any;
  isAdmin: boolean;
  isOwner: boolean;
  userId?: string;
  onHazardAdded: (hazard: any) => void;
}

export function HazardReportDialog({
  open,
  onOpenChange,
  routeId,
  route,
  isAdmin,
  isOwner,
  userId,
  onHazardAdded,
}: HazardReportDialogProps) {
  const [newHazard, setNewHazard] = useState({
    hazard_type: "",
    title: "",
    description: "",
    severity: "medium",
  });
  const [submittingHazard, setSubmittingHazard] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "checking" | "near" | "far" | "error">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);

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

        const geometry = route?.geometry || route?.route_geometry;
        if (!geometry?.coordinates) {
          setLocationStatus("near");
          return;
        }

        let minDistance = Infinity;
        const coords = geometry.coordinates as [number, number][];

        for (const coord of coords) {
          const distance = getDistanceMeters(userLat, userLng, coord[1], coord[0]);
          if (distance < minDistance) {
            minDistance = distance;
          }
        }

        const MAX_DISTANCE_METERS = 500;
        if (minDistance <= MAX_DISTANCE_METERS) {
          setLocationStatus("near");
        } else {
          setLocationStatus("far");
          setLocationError(`You appear to be ${Math.round(minDistance / 1000)}km from this route. Hazard reports must be made while near the route.`);
        }
      },
      (error) => {
        setLocationStatus("error");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable location services to report hazards.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location unavailable. Please try again.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again.");
            break;
          default:
            setLocationError("Unable to get your location. Please try again.");
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
    }
  }, [open]);

  const handleSubmitHazard = async () => {
    if (!userId) {
      toast.error("Please sign in to report hazards");
      return;
    }
    if (!newHazard.hazard_type || !newHazard.title) {
      toast.error("Please select a hazard type and add a title");
      return;
    }

    setSubmittingHazard(true);
    try {
      const res = await fetch(`/api/routes/${routeId}/hazards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHazard),
      });

      if (res.ok) {
        const data = await res.json();
        onHazardAdded(data.hazard);
        setNewHazard({ hazard_type: "", title: "", description: "", severity: "medium" });
        onOpenChange(false);
        toast.success("Hazard reported! Thank you for helping keep others safe.");
      } else {
        toast.error("Failed to report hazard");
      }
    } catch {
      toast.error("Failed to report hazard");
    } finally {
      setSubmittingHazard(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a Hazard</DialogTitle>
          <DialogDescription>
            Help other riders and walkers by reporting hazards on this route.
          </DialogDescription>
        </DialogHeader>

        {/* Location Status Banner */}
        {locationStatus === "checking" && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-sm text-blue-700">Checking your location...</span>
          </div>
        )}
        {locationStatus === "near" && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm text-green-700">Location verified - you&apos;re near the route</span>
          </div>
        )}
        {locationStatus === "far" && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Too far from route</span>
            </div>
            <p className="text-sm text-orange-600">{locationError}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={checkUserLocation}>
              Try Again
            </Button>
          </div>
        )}
        {locationStatus === "error" && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Location Error</span>
            </div>
            <p className="text-sm text-red-600">{locationError}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={checkUserLocation}>
              Try Again
            </Button>
          </div>
        )}

        {/* Only show form when location is verified or admin/owner */}
        {(locationStatus === "near" || isAdmin || isOwner) && (
          <div className="space-y-4">
            {(isAdmin || isOwner) && locationStatus !== "near" && (
              <p className="text-xs text-muted-foreground italic">
                As {isAdmin ? "an admin" : "the route owner"}, you can report hazards without location verification.
              </p>
            )}
            <div>
              <Label>Hazard Type *</Label>
              <Select
                value={newHazard.hazard_type}
                onValueChange={(v) => setNewHazard((prev) => ({ ...prev, hazard_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {HAZARD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="Brief description..."
                value={newHazard.title}
                onChange={(e) => setNewHazard((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>Details</Label>
              <Textarea
                placeholder="Additional details..."
                value={newHazard.description}
                onChange={(e) => setNewHazard((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>Severity</Label>
              <Select
                value={newHazard.severity}
                onValueChange={(v) => setNewHazard((prev) => ({ ...prev, severity: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                  <SelectItem value="medium">Medium - Use caution</SelectItem>
                  <SelectItem value="high">High - Significant danger</SelectItem>
                  <SelectItem value="critical">Critical - Do not proceed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleSubmitHazard}
            disabled={submittingHazard || (locationStatus !== "near" && !isAdmin && !isOwner)}
          >
            {submittingHazard ? "Submitting..." : "Report Hazard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Warning Post Dialog ---

interface WarningPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  userId?: string;
  onWarningAdded: (warning: any) => void;
}

export function WarningPostDialog({
  open,
  onOpenChange,
  routeId,
  userId,
  onWarningAdded,
}: WarningPostDialogProps) {
  const [newWarning, setNewWarning] = useState({ hazard_type: "", description: "" });
  const [submittingWarning, setSubmittingWarning] = useState(false);

  const handleSubmitWarning = async () => {
    if (!userId) {
      toast.error("Please sign in to post warnings");
      return;
    }
    if (!newWarning.hazard_type) {
      toast.error("Please select a warning type");
      return;
    }

    setSubmittingWarning(true);
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const warningTitle = WARNING_TYPES.find((t) => t.value === newWarning.hazard_type)?.label || newWarning.hazard_type;

      const res = await fetch(`/api/routes/${routeId}/hazards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard_type: newWarning.hazard_type,
          title: warningTitle,
          description: newWarning.description,
          severity: "medium",
          is_warning: true,
          expires_at: expiresAt,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onWarningAdded(data.hazard);
        setNewWarning({ hazard_type: "", description: "" });
        onOpenChange(false);
        toast.success("Warning posted! Other riders will see this alert.");
      } else {
        toast.error("Failed to post warning");
      }
    } catch {
      toast.error("Failed to post warning");
    } finally {
      setSubmittingWarning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post a Route Warning</DialogTitle>
          <DialogDescription>
            Alert other riders about current conditions on this route.
          </DialogDescription>
        </DialogHeader>
        {!userId ? (
          <p className="text-sm text-muted-foreground">Please sign in to post warnings.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Warning Type *</Label>
              <Select
                value={newWarning.hazard_type}
                onValueChange={(v) => setNewWarning((prev) => ({ ...prev, hazard_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {WARNING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Details (optional)</Label>
              <Textarea
                placeholder="Additional details..."
                value={newWarning.description}
                onChange={(e) => setNewWarning((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Warnings expire after 30 days unless cleared by the community.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={handleSubmitWarning}
            disabled={submittingWarning || !userId}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {submittingWarning ? "Posting..." : "Post Warning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Report Comment Dialog ---

interface ReportCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  commentId: string | null;
  userId?: string;
}

export function ReportCommentDialog({
  open,
  onOpenChange,
  routeId,
  commentId,
  userId,
}: ReportCommentDialogProps) {
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleReportComment = async () => {
    if (!userId || !commentId || !reportReason.trim()) {
      toast.error("Please provide a reason for reporting");
      return;
    }

    setSubmittingReport(true);
    try {
      const res = await fetch(`/api/routes/${routeId}/comments/${commentId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason }),
      });

      if (res.ok) {
        toast.success("Comment reported. Thank you for helping keep our community safe.");
        onOpenChange(false);
        setReportReason("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to report comment");
      }
    } catch {
      toast.error("Failed to report comment");
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Comment</DialogTitle>
          <DialogDescription>
            Please tell us why you&apos;re reporting this comment. Our moderation team will review it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Reason *</Label>
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="harassment">Harassment or bullying</SelectItem>
                <SelectItem value="hate_speech">Hate speech</SelectItem>
                <SelectItem value="misinformation">Misinformation</SelectItem>
                <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReportComment}
            disabled={submittingReport || !reportReason}
            variant="destructive"
          >
            {submittingReport ? "Reporting..." : "Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Delete Hazard Dialog ---

interface DeleteHazardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  hazard: any | null;
  onDeleted: (hazardId: string) => void;
}

export function DeleteHazardDialog({
  open,
  onOpenChange,
  routeId,
  hazard,
  onDeleted,
}: DeleteHazardDialogProps) {
  const handleDeleteHazard = async () => {
    if (!hazard) return;

    try {
      const res = await fetch(`/api/routes/${routeId}/hazards/${hazard.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onDeleted(hazard.id);
        toast.success("Hazard deleted");
        onOpenChange(false);
      } else {
        toast.error("Failed to delete hazard");
      }
    } catch {
      toast.error("Failed to delete hazard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Hazard Report
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this hazard report? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {hazard && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={SEVERITY_COLORS[hazard.severity as keyof typeof SEVERITY_COLORS]}
              >
                {hazard.severity}
              </Badge>
              <Badge variant="secondary">
                {HAZARD_TYPES.find((t) => t.value === hazard.hazard_type)?.label}
              </Badge>
            </div>
            <p className="font-medium">{hazard.title}</p>
            {hazard.description && (
              <p className="text-sm text-muted-foreground">{hazard.description}</p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteHazard}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Hazard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
