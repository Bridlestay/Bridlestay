"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
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

interface EditWaypointViewProps {
  waypoint: {
    id: string;
    name?: string | null;
    tag?: string | null;
    icon_type?: string | null;
    description?: string | null;
  };
  onBack: () => void;
  onWaypointUpdated: (waypointId: string, updates: any) => void;
}

export function EditWaypointView({
  waypoint,
  onBack,
  onWaypointUpdated,
}: EditWaypointViewProps) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [iconType, setIconType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (waypoint) {
      setName(waypoint.name || "");
      setTag(waypoint.tag || "note");
      setIconType(waypoint.icon_type || "");
      setDescription(waypoint.description || "");
    }
  }, [waypoint]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a waypoint name");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/waypoints/${waypoint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tag,
          icon_type: iconType || null,
          description: description.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onWaypointUpdated(waypoint.id, data.waypoint);
        onBack();
        toast.success("Waypoint updated successfully!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update waypoint");
      }
    } catch {
      toast.error("Failed to update waypoint");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 pb-4 border-b mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Edit Waypoint</h2>
          <p className="text-sm text-muted-foreground">
            Update waypoint details. Changes will be visible to all users.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
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
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this waypoint..."
            maxLength={500}
            className="min-h-[120px]"
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || !name.trim()}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
