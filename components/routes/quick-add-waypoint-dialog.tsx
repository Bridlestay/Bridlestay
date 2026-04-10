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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

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

export interface TempRouteWaypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  tag?: string;
  icon_type?: string;
  description?: string;
}

interface QuickAddWaypointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: { lat: number; lng: number } | null;
  onAdd: (waypoint: TempRouteWaypoint) => void;
  editingWaypoint?: TempRouteWaypoint | null;
  onUpdate?: (waypoint: TempRouteWaypoint) => void;
}

export function QuickAddWaypointDialog({
  open,
  onOpenChange,
  position,
  onAdd,
  editingWaypoint,
  onUpdate,
}: QuickAddWaypointDialogProps) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("note");
  const [iconType, setIconType] = useState("");
  const [description, setDescription] = useState("");
  const isEditing = !!editingWaypoint;

  useEffect(() => {
    if (open && editingWaypoint) {
      // Pre-fill form with existing waypoint data
      setName(editingWaypoint.name || "");
      setTag(editingWaypoint.tag || "note");
      setIconType(editingWaypoint.icon_type || "");
      setDescription(editingWaypoint.description || "");
    } else if (!open) {
      // Reset form when closed
      setName("");
      setTag("note");
      setIconType("");
      setDescription("");
    }
  }, [open, editingWaypoint]);

  const handleAdd = () => {
    if (!name.trim()) return;

    if (isEditing && editingWaypoint && onUpdate) {
      onUpdate({
        ...editingWaypoint,
        name: name.trim(),
        tag,
        icon_type: iconType || undefined,
        description: description.trim() || undefined,
      });
      onOpenChange(false);
      return;
    }

    if (!position) return;

    const waypoint: TempRouteWaypoint = {
      id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID
      lat: position.lat,
      lng: position.lng,
      name: name.trim(),
      tag,
      icon_type: iconType || undefined,
      description: description.trim() || undefined,
    };

    onAdd(waypoint);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Waypoint" : "Add Waypoint to Route"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. River crossing, Scenic viewpoint"
              maxLength={100}
              className="h-9"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Tag</Label>
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger className="h-9">
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
              <Label className="text-xs">Icon</Label>
              <Select value={iconType} onValueChange={setIconType}>
                <SelectTrigger className="h-9">
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
            <Label className="text-xs">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this waypoint..."
              maxLength={500}
              className="min-h-[50px] text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="bg-primary hover:bg-green-700 h-9"
          >
            {isEditing ? "Save Changes" : "Add Waypoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
