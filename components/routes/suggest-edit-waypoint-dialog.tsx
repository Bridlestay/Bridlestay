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

interface SuggestEditWaypointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waypoint: {
    id: string;
    name?: string | null;
    tag?: string | null;
    icon_type?: string | null;
    description?: string | null;
  };
}

export function SuggestEditWaypointDialog({
  open,
  onOpenChange,
  waypoint,
}: SuggestEditWaypointDialogProps) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [iconType, setIconType] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && waypoint) {
      setName(waypoint.name || "");
      setTag(waypoint.tag || "note");
      setIconType(waypoint.icon_type || "");
      setDescription(waypoint.description || "");
      setComment("");
    }
  }, [open, waypoint]);

  const handleSubmit = async () => {
    // Check if any changes were made
    const hasChanges =
      name.trim() !== (waypoint.name || "") ||
      tag !== (waypoint.tag || "") ||
      iconType !== (waypoint.icon_type || "") ||
      description.trim() !== (waypoint.description || "");

    if (!hasChanges) {
      toast.error("Please make at least one change before submitting");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please add a comment explaining your suggestion");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/waypoints/${waypoint.id}/edit-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggested_name: name.trim() !== (waypoint.name || "") ? name.trim() : null,
          suggested_tag: tag !== (waypoint.tag || "") ? tag : null,
          suggested_icon_type: iconType !== (waypoint.icon_type || "") ? (iconType || null) : null,
          suggested_description: description.trim() !== (waypoint.description || "") ? description.trim() : null,
          suggestion_comment: comment.trim(),
        }),
      });

      if (res.ok) {
        onOpenChange(false);
        toast.success("Edit suggestion submitted! The route owner will review it.");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit suggestion");
      }
    } catch {
      toast.error("Failed to submit suggestion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Suggest Waypoint Edit</DialogTitle>
          <DialogDescription>
            Suggest improvements to this waypoint. The route owner will review your changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. River crossing, Scenic viewpoint"
              maxLength={100}
            />
            {name.trim() !== (waypoint.name || "") && (
              <p className="text-xs text-muted-foreground mt-1">
                Current: {waypoint.name || "(no name)"}
              </p>
            )}
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
              {tag !== (waypoint.tag || "") && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {waypoint.tag || "(none)"}
                </p>
              )}
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
              {iconType !== (waypoint.icon_type || "") && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {waypoint.icon_type || "(none)"}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this waypoint..."
              maxLength={500}
              className="min-h-[80px]"
            />
            {description.trim() !== (waypoint.description || "") && (
              <p className="text-xs text-muted-foreground mt-1">
                Current: {waypoint.description || "(no description)"}
              </p>
            )}
          </div>

          <div>
            <Label>
              Explain your suggestion *
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Why are you suggesting these changes?"
              maxLength={500}
              className="min-h-[60px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Help the owner understand your suggestion
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitting ? "Submitting..." : "Submit Suggestion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
