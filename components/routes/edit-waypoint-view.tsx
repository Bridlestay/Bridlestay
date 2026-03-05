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
import { ArrowLeft, MapPin } from "lucide-react";
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
    <div>
      {/* Green header banner — matches the photo hero height feel */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 px-4 pt-5 pb-6">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 text-slate-700" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Waypoint</h2>
            <p className="text-sm text-slate-500">
              {waypoint.name || "Waypoint"}
            </p>
          </div>
        </div>
      </div>

      {/* Content area — same padding as route card */}
      <div className="relative z-10 bg-white rounded-t-2xl -mt-3">
        <form
          id="edit-waypoint-form"
          onSubmit={handleSubmit}
          className="p-4 pt-6 space-y-5"
        >
          <div>
            <Label className="text-sm font-medium text-slate-700">
              Name *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. River crossing, Scenic viewpoint"
              maxLength={100}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-slate-700">
                Tag
              </Label>
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger className="mt-1.5">
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
              <Label className="text-sm font-medium text-slate-700">
                Icon
              </Label>
              <Select value={iconType} onValueChange={setIconType}>
                <SelectTrigger className="mt-1.5">
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
            <Label className="text-sm font-medium text-slate-700">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this waypoint..."
              maxLength={500}
              className="mt-1.5 min-h-[140px]"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
