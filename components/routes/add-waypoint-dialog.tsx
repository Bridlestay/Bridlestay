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
import { MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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
  lat: number | null;
  lng: number | null;
  onWaypointAdded: (waypoint: any) => void;
}

export function AddWaypointDialog({
  open,
  onOpenChange,
  routeId,
  lat,
  lng,
  onWaypointAdded,
}: AddWaypointDialogProps) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("note");
  const [iconType, setIconType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setTag("note");
      setIconType("");
      setDescription("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a waypoint name");
      return;
    }
    if (lat === null || lng === null) {
      toast.error("Location not available");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/routes/${routeId}/waypoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
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
        toast.success("Waypoint added successfully!");
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
          <DialogTitle>Add Waypoint</DialogTitle>
          <DialogDescription>
            Add a waypoint to your route at the selected location.
          </DialogDescription>
        </DialogHeader>

        {lat !== null && lng !== null && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">
              Location selected: {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          </div>
        )}

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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || lat === null || lng === null || !name.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitting ? "Adding..." : "Add Waypoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
