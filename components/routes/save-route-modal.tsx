"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  X,
  Clock,
  Ruler,
  TrendingUp,
  TrendingDown,
  Circle,
  Route,
  Lock,
  Globe,
  Link2,
  ImagePlus,
  GripVertical,
  Trash2,
  Loader2,
} from "lucide-react";

// --- Types ---

export interface SaveRouteFormData {
  title: string;
  description: string;
  visibility: "private" | "link" | "public";
  difficulty: "unrated" | "easy" | "moderate" | "difficult" | "severe";
  photos: PhotoItem[];
}

interface PhotoItem {
  id: string;
  file: File;
  preview: string;
  order: number;
}

interface SaveRouteModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: SaveRouteFormData) => Promise<void>;
  distanceKm: number;
  rideTimeMinutes: number;
  routeType: "circular" | "linear";
  isEditing?: boolean;
  existingData?: {
    title: string;
    description: string;
    visibility: "private" | "link" | "public";
    difficulty: "unrated" | "easy" | "moderate" | "difficult" | "severe";
  };
}

// --- Save Route Modal ---

export function SaveRouteModal({
  open,
  onClose,
  onSave,
  distanceKm,
  rideTimeMinutes,
  routeType,
  isEditing = false,
  existingData,
}: SaveRouteModalProps) {
  // Form state
  const [title, setTitle] = useState(existingData?.title || "");
  const [description, setDescription] = useState(existingData?.description || "");
  const [visibility, setVisibility] = useState<"private" | "link" | "public">(
    existingData?.visibility || "private"
  );
  const [difficulty, setDifficulty] = useState<
    "unrated" | "easy" | "moderate" | "difficult" | "severe"
  >(existingData?.difficulty || "unrated");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Formatting helpers ---
  const formatDistance = (km: number) => {
    if (km < 0.01) return "0";
    if (km < 10) return km.toFixed(2);
    return km.toFixed(1);
  };

  const formatTime = (minutes: number) => {
    if (minutes === 0) return "0m";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // --- Photo handlers ---
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const remaining = 10 - photos.length;
      if (files.length > remaining) {
        toast.error(`You can add ${remaining} more photo${remaining !== 1 ? "s" : ""}`);
      }

      const newPhotos = files.slice(0, remaining).map((file, i) => ({
        id: `photo-${Date.now()}-${i}`,
        file,
        preview: URL.createObjectURL(file),
        order: photos.length + i,
      }));

      setPhotos((prev) => [...prev, ...newPhotos]);

      // Reset input so same files can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [photos.length]
  );

  const handleRemovePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev
        .filter((p) => p.id !== id)
        .map((p, i) => ({ ...p, order: i }));
    });
  }, []);

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedId) setDragOverIndex(index);
    },
    [draggedId]
  );

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (!draggedId) return;
      setPhotos((prev) => {
        const items = [...prev];
        const fromIndex = items.findIndex((p) => p.id === draggedId);
        if (fromIndex === -1) return prev;
        const [moved] = items.splice(fromIndex, 1);
        items.splice(targetIndex, 0, moved);
        return items.map((p, i) => ({ ...p, order: i }));
      });
      setDraggedId(null);
      setDragOverIndex(null);
    },
    [draggedId]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverIndex(null);
  }, []);

  // --- Drop zone handler ---
  const handleDropZone = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) return;

      const remaining = 10 - photos.length;
      if (files.length > remaining) {
        toast.error(`You can add ${remaining} more photo${remaining !== 1 ? "s" : ""}`);
      }

      const newPhotos = files.slice(0, remaining).map((file, i) => ({
        id: `photo-${Date.now()}-${i}`,
        file,
        preview: URL.createObjectURL(file),
        order: photos.length + i,
      }));

      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [photos.length]
  );

  // --- Save handler ---
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Route name is required");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        visibility,
        difficulty,
        photos,
      });
    } catch (error: any) {
      console.error("Save route error:", error);
      toast.error(error?.message || "Failed to save route");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white/90 shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <X className="h-4 w-4 text-slate-600" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Stats grid — matches route detail card style */}
          <div className="px-6 pt-6 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center py-3">
                <div className="text-2xl font-bold text-slate-900">
                  {formatDistance(distanceKm)}
                  <span className="text-sm font-normal text-slate-500 ml-0.5">
                    km
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                  <Ruler className="h-3 w-3" />
                  Distance
                </div>
              </div>
              <div className="text-center py-3">
                <div className="text-2xl font-bold text-slate-900">
                  {formatTime(rideTimeMinutes)}
                </div>
                <div className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  Est. Ride Time
                </div>
              </div>
            </div>

            {/* Route type badge */}
            <div className="flex justify-center mt-2">
              <Badge
                variant={routeType === "circular" ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  routeType === "circular" ? "bg-green-600" : ""
                )}
              >
                {routeType === "circular" ? (
                  <>
                    <Circle className="h-3 w-3 mr-1" />
                    Circular
                  </>
                ) : (
                  <>
                    <Route className="h-3 w-3 mr-1" />
                    Linear
                  </>
                )}
              </Badge>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Form fields */}
          <div className="px-6 py-4 space-y-5">
            {/* Route name */}
            <div className="space-y-1.5">
              <Label htmlFor="save-route-name" className="text-sm font-medium">
                Route name *
              </Label>
              <div className="relative">
                <Input
                  id="save-route-name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                  placeholder="Name your route"
                  maxLength={100}
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {title.length}/100
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="save-route-desc" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="save-route-desc"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value.slice(0, 5000))
                }
                placeholder="Describe the terrain, scenery, or anything riders should know..."
                rows={3}
                maxLength={5000}
              />
              <span className="text-xs text-muted-foreground">
                {description.length}/5000
              </span>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Visibility</Label>
              <RadioGroup
                value={visibility}
                onValueChange={(v) =>
                  setVisibility(v as typeof visibility)
                }
                className="space-y-1.5"
              >
                {[
                  {
                    value: "private" as const,
                    icon: Lock,
                    label: "Private",
                    desc: "Only you can see this route",
                  },
                  {
                    value: "link" as const,
                    icon: Link2,
                    label: "Anyone with Link",
                    desc: "Only people with a link can see",
                  },
                  {
                    value: "public" as const,
                    icon: Globe,
                    label: "Public",
                    desc: "Anyone can see the route",
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    htmlFor={`vis-${opt.value}`}
                    className={cn(
                      "flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      visibility === opt.value
                        ? "border-green-600 bg-green-50/50"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <RadioGroupItem
                      value={opt.value}
                      id={`vis-${opt.value}`}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        <opt.icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {opt.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Difficulty</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help text-xs">
                      &#9432;
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Rate the difficulty based on terrain, elevation, and
                      obstacles
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "unrated",
                    "easy",
                    "moderate",
                    "difficult",
                    "severe",
                  ] as const
                ).map((level) => (
                  <Button
                    key={level}
                    variant={difficulty === level ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDifficulty(level)}
                    className={cn(
                      "text-xs",
                      difficulty === level
                        ? level === "easy"
                          ? "bg-green-600 hover:bg-green-700"
                          : level === "moderate"
                          ? "bg-blue-600 hover:bg-blue-700"
                          : level === "difficult"
                          ? "bg-orange-600 hover:bg-orange-700"
                          : level === "severe"
                          ? "bg-red-600 hover:bg-red-700"
                          : ""
                        : ""
                    )}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Photos{" "}
                <span className="text-muted-foreground font-normal">
                  ({photos.length}/10)
                </span>
              </Label>

              {/* Photo grid with drag-and-drop */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      draggable
                      onDragStart={() => handleDragStart(photo.id)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing group transition-all",
                        dragOverIndex === index && draggedId !== photo.id
                          ? "border-green-500 scale-105"
                          : draggedId === photo.id
                          ? "opacity-50 border-slate-300"
                          : "border-transparent hover:border-slate-300"
                      )}
                    >
                      <img
                        src={photo.preview}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                      {/* Drag handle */}
                      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/50 rounded p-0.5">
                          <GripVertical className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      {/* Order badge */}
                      {index === 0 && (
                        <div className="absolute bottom-1 left-1">
                          <div className="bg-green-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                            Cover
                          </div>
                        </div>
                      )}
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(photo.id);
                        }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone / Add button */}
              {photos.length < 10 && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={handleDropZone}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-green-400 hover:bg-green-50/30",
                    photos.length === 0
                      ? "border-slate-300 py-8"
                      : "border-slate-200 py-3"
                  )}
                >
                  <ImagePlus
                    className={cn(
                      "mx-auto text-slate-400 mb-1",
                      photos.length === 0 ? "h-8 w-8 mb-2" : "h-5 w-5"
                    )}
                  />
                  <p className="text-sm text-slate-500">
                    {photos.length === 0
                      ? "Drop photos here or click to browse"
                      : "Add more photos"}
                  </p>
                  {photos.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      JPG, PNG up to 10MB each. First photo becomes the cover.
                    </p>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Fixed bottom actions */}
        <div className="border-t bg-white px-6 py-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-[#2E8B57] hover:bg-[#256b45]"
            onClick={handleSave}
            disabled={saving || !title.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : isEditing ? (
              "Update Route"
            ) : (
              "Save Route"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
