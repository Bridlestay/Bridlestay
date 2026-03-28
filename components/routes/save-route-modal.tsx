"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Link,
  ImagePlus,
  GripVertical,
  Trash2,
  Loader2,
  Shuffle,
  Copy,
  Check,
} from "lucide-react";

// --- Types ---

export interface SimilarityMatch {
  route_id: string;
  title: string;
  similarity_score: number;
}

export interface SaveRouteFormData {
  title: string;
  description: string;
  visibility: "private" | "link" | "public";
  difficulty: "unrated" | "easy" | "moderate" | "difficult";
  photos: PhotoItem[];
  saveAsStandalone?: boolean;
  similarMatch?: SimilarityMatch | null;
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
    difficulty: "unrated" | "easy" | "moderate" | "difficult";
  };
  geometry?: { type: string; coordinates: [number, number][] };
  editingRouteId?: string | null;
  variantOfName?: string;
  variantOfRouteId?: string | null;
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
  geometry,
  editingRouteId,
  variantOfName,
  variantOfRouteId,
}: SaveRouteModalProps) {
  // Form state
  const [title, setTitle] = useState(existingData?.title || "");
  const [description, setDescription] = useState(existingData?.description || "");
  const [visibility, setVisibility] = useState<"private" | "link" | "public">(
    existingData?.visibility || "public"
  );
  const [difficulty, setDifficulty] = useState<
    "unrated" | "easy" | "moderate" | "difficult"
  >(existingData?.difficulty || "unrated");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Similarity detection
  const [similarMatch, setSimilarMatch] = useState<SimilarityMatch | null>(null);
  const [saveAsStandalone, setSaveAsStandalone] = useState(false);
  const [checkingSimilarity, setCheckingSimilarity] = useState(false);

  const [copyingDescription, setCopyingDescription] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copy description from parent route (variant flow)
  const handleCopyParentDescription = useCallback(async () => {
    if (!variantOfRouteId) return;
    setCopyingDescription(true);
    try {
      const res = await fetch(`/api/routes/${variantOfRouteId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const parentDesc = data.route?.description || "";
      if (parentDesc) {
        setDescription(parentDesc);
        toast.success("Description copied from original route");
      } else {
        toast.info("Original route has no description");
      }
    } catch {
      toast.error("Failed to fetch original route");
    } finally {
      setCopyingDescription(false);
    }
  }, [variantOfRouteId]);

  // Sync form state when existingData changes (safety net for editing)
  useEffect(() => {
    if (existingData) {
      setTitle(existingData.title || "");
      setDescription(existingData.description || "");
      setVisibility(existingData.visibility || "public");
      setDifficulty(existingData.difficulty || "unrated");
    }
  }, [existingData]);

  // Check for similar routes when modal opens (only for new routes)
  useEffect(() => {
    if (!open || isEditing || !geometry?.coordinates?.length) return;
    if (variantOfName) return; // Already a fork — skip similarity check

    let cancelled = false;
    setCheckingSimilarity(true);
    setSimilarMatch(null);
    setSaveAsStandalone(false);

    fetch("/api/routes/check-similarity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        geometry,
        exclude_route_id: editingRouteId,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.best_match) {
          setSimilarMatch({
            route_id: data.best_match.route_id,
            title: data.best_match.title,
            similarity_score: data.best_match.similarity_score,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckingSimilarity(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isEditing, geometry, editingRouteId, variantOfName]);

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
        saveAsStandalone,
        similarMatch: !saveAsStandalone ? similarMatch : null,
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 pointer-events-none">
      {/* Backdrop — desktop only */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm hidden md:block pointer-events-auto"
        onClick={onClose}
      />

      {/* Modal card — full-screen on mobile, centered on desktop */}
      <div
        className={cn(
          "pointer-events-auto bg-white shadow-2xl relative flex flex-col overflow-hidden",
          "w-full h-[100dvh] rounded-none",
          "animate-in slide-in-from-bottom fade-in duration-300",
          "md:rounded-2xl md:max-w-2xl md:max-h-[85vh] md:h-auto",
          "md:animate-in md:zoom-in-95 md:slide-in-from-bottom-4 md:fade-in md:duration-300"
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white/90 shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <X className="h-4 w-4 text-slate-600" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
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

          {/* Variant info banner */}
          {variantOfName && (
            <div className="mx-6 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
              <Shuffle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <span className="font-medium">Variant of {variantOfName}</span>
                <p className="text-blue-600 text-xs mt-0.5">
                  This route will be linked as a variant of the original.
                </p>
              </div>
            </div>
          )}

          {/* Similarity detection banner */}
          {!isEditing && !variantOfName && similarMatch && (
            <div className="mx-6 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2.5">
                <Shuffle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="text-amber-800">
                    This route shares{" "}
                    <span className="font-semibold">
                      {similarMatch.similarity_score}%
                    </span>{" "}
                    of its path with{" "}
                    <span className="font-semibold">
                      &ldquo;{similarMatch.title}&rdquo;
                    </span>{" "}
                    and will appear in its variants.
                  </p>
                  {!saveAsStandalone ? (
                    <button
                      type="button"
                      onClick={() => setSaveAsStandalone(true)}
                      className="text-xs text-amber-600 hover:text-amber-800 underline mt-1"
                    >
                      Save as standalone instead
                    </button>
                  ) : (
                    <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                      Will save as a standalone route.{" "}
                      <button
                        type="button"
                        onClick={() => setSaveAsStandalone(false)}
                        className="underline hover:text-green-900"
                      >
                        Undo
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100" />

          {/* Form fields */}
          <div className="px-6 py-4 space-y-5">
            {/* Route name */}
            <div className="space-y-1.5">
              <Label htmlFor="save-route-name" className="text-base font-semibold">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="save-route-desc" className="text-base font-semibold">
                  Description
                </Label>
                {variantOfRouteId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyParentDescription}
                    disabled={copyingDescription}
                    className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
                  >
                    {copyingDescription ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Copy from original
                  </Button>
                )}
              </div>
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
            <div className="space-y-2 px-8">
              <Label className="text-base font-semibold">Visibility</Label>
              <div className="grid grid-cols-3 gap-3.5">
                {[
                  {
                    value: "public" as const,
                    icon: Globe,
                    label: "Public",
                    desc: "Visible to everyone",
                  },
                  {
                    value: "link" as const,
                    icon: Link,
                    label: "Anyone with\nLink",
                    desc: "Shared via link",
                  },
                  {
                    value: "private" as const,
                    icon: Lock,
                    label: "Private",
                    desc: "Only you can see",
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    style={{ aspectRatio: "4 / 4.5" }}
                    className={cn(
                      "relative flex flex-col items-center pt-5 gap-2 px-2 rounded-xl border-2 cursor-pointer transition-all text-center overflow-hidden",
                      visibility === opt.value
                        ? "border-[#267347] bg-[#267347]/5 shadow-sm"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    )}
                  >
                    {visibility === opt.value && (
                      <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#267347] flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                    <opt.icon className={cn(
                      "h-8 w-8 shrink-0",
                      visibility === opt.value ? "text-[#267347]" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-base font-semibold leading-tight whitespace-pre-line",
                      visibility === opt.value ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {opt.label}
                    </span>
                    <p className="text-sm text-muted-foreground leading-tight px-1">
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">Difficulty</Label>
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
                  ] as const
                ).map((level) => (
                  <Button
                    key={level}
                    variant={difficulty === level ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDifficulty(level)}
                    className={cn(
                      "text-xs rounded-full",
                      difficulty === level
                        ? level === "easy"
                          ? "bg-green-600 hover:bg-green-700"
                          : level === "moderate"
                          ? "bg-amber-600 hover:bg-amber-700"
                          : level === "difficult"
                          ? "bg-orange-600 hover:bg-orange-700"
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
              <Label className="text-base font-semibold">
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
        <div className="border-t bg-white px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 hidden md:flex text-[#2E8B57] hover:text-[#256b45] hover:bg-transparent text-base font-medium"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-[#2E8B57] hover:bg-[#256b45] rounded-full text-base"
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
