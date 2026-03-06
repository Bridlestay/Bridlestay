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
import { ImagePlus, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
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
  routeId?: string;
}

interface SuggestedPhoto {
  url: string;
  caption: string;
}

export function SuggestEditWaypointDialog({
  open,
  onOpenChange,
  waypoint,
  routeId,
}: SuggestEditWaypointDialogProps) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [iconType, setIconType] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Photo state
  const [suggestedPhotos, setSuggestedPhotos] = useState<SuggestedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && waypoint) {
      setName(waypoint.name || "");
      setTag(waypoint.tag || "");
      setIconType(waypoint.icon_type || "");
      setDescription(waypoint.description || "");
      setComment("");
      setSuggestedPhotos([]);
    }
  }, [open, waypoint]);

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !routeId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `/api/routes/${routeId}/waypoints/${waypoint.id}/photos?suggestion=true`,
        { method: "POST", body: formData }
      );

      if (res.ok) {
        const data = await res.json();
        setSuggestedPhotos((prev) => [...prev, { url: data.url, caption: "" }]);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to upload photo");
      }
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    setSuggestedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Check if any changes were made
    const hasTextChanges =
      name.trim() !== (waypoint.name || "") ||
      tag !== (waypoint.tag || "") ||
      iconType !== (waypoint.icon_type || "") ||
      description.trim() !== (waypoint.description || "");

    const hasPhotoChanges = suggestedPhotos.length > 0;

    if (!hasTextChanges && !hasPhotoChanges) {
      toast.error("Please make at least one change before submitting");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please add a comment explaining your suggestion");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        suggested_name:
          name.trim() !== (waypoint.name || "") ? name.trim() : null,
        suggested_tag: tag !== (waypoint.tag || "") ? tag : null,
        suggested_icon_type:
          iconType !== (waypoint.icon_type || "")
            ? iconType || null
            : null,
        suggested_description:
          description.trim() !== (waypoint.description || "")
            ? description.trim()
            : null,
        suggestion_comment: comment.trim(),
      };

      if (hasPhotoChanges) {
        payload.suggested_photos = suggestedPhotos.map((p) => ({
          action: "add",
          url: p.url,
          caption: p.caption || null,
        }));
      }

      const res = await fetch(
        `/api/waypoints/${waypoint.id}/edit-suggestions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        onOpenChange(false);
        toast.success(
          "Edit suggestion submitted! The route owner will review it."
        );
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
            Suggest improvements to this waypoint. The route owner will
            review your changes.
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
                  <SelectValue placeholder="Optional..." />
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

          {/* Photo upload section */}
          {routeId && (
            <div>
              <Label>Photos</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Add photos to help other riders
              </p>

              {/* Uploaded photo previews */}
              {suggestedPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {suggestedPhotos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="relative h-20 rounded-lg overflow-hidden group"
                    >
                      <Image
                        src={photo.url}
                        alt="Suggested photo"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-slate-200 rounded-lg py-3 flex items-center justify-center gap-2 text-sm text-slate-500 hover:border-green-300 hover:text-green-600 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Add a photo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          )}

          <div>
            <Label>Explain your suggestion *</Label>
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
