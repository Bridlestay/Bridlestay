"use client";

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
import {
  ArrowLeft,
  MapPin,
  ImagePlus,
  X,
  Loader2,
} from "lucide-react";
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

interface WaypointPhoto {
  id: string;
  url: string;
  caption?: string | null;
  user?: { id: string; name?: string; avatar_url?: string } | null;
}

interface EditWaypointViewProps {
  waypoint: {
    id: string;
    name?: string | null;
    tag?: string | null;
    icon_type?: string | null;
    description?: string | null;
    photo_url?: string | null;
    photos?: Array<{ id: string; url: string; caption?: string }>;
  };
  routeId: string;
  onBack: () => void;
  onWaypointUpdated: (waypointId: string, updates: any) => void;
}

export function EditWaypointView({
  waypoint,
  routeId,
  onBack,
  onWaypointUpdated,
}: EditWaypointViewProps) {
  const [name, setName] = useState(waypoint.name || "");
  const [tag, setTag] = useState(waypoint.tag || "");
  const [iconType, setIconType] = useState(waypoint.icon_type || "");
  const [description, setDescription] = useState(waypoint.description || "");
  const [submitting, setSubmitting] = useState(false);

  // Photo state
  const [photos, setPhotos] = useState<WaypointPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing photos
  useEffect(() => {
    const fetchPhotos = async () => {
      setLoadingPhotos(true);
      try {
        const res = await fetch(
          `/api/routes/${routeId}/waypoints/${waypoint.id}/photos`
        );
        if (res.ok) {
          const data = await res.json();
          setPhotos(data.photos || []);
        }
      } catch {
        // Non-critical
      } finally {
        setLoadingPhotos(false);
      }
    };
    fetchPhotos();
  }, [routeId, waypoint.id]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a waypoint name");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/routes/${routeId}/waypoints/${waypoint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tag: tag || null,
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

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        `/api/routes/${routeId}/waypoints/${waypoint.id}/photos`,
        { method: "POST", body: formData }
      );

      if (res.ok) {
        const data = await res.json();
        setPhotos((prev) => [data.photo, ...prev]);
        toast.success("Photo uploaded!");
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

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const res = await fetch(
        `/api/routes/${routeId}/waypoints/${waypoint.id}/photos?photoId=${photoId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        toast.success("Photo removed");
      } else {
        toast.error("Failed to delete photo");
      }
    } catch {
      toast.error("Failed to delete photo");
    }
  };

  // Combine primary photo_url with fetched photos for display
  const allPhotos = [
    ...(waypoint.photo_url
      ? [{ id: "__primary", url: waypoint.photo_url }]
      : []),
    ...photos,
  ];

  return (
    <div>
      {/* Header banner — matches photo hero height */}
      <div className="relative h-48 md:h-56 bg-gradient-to-br from-green-50 via-green-100 to-emerald-50 overflow-hidden">
        {/* Show first photo as background if available */}
        {allPhotos.length > 0 ? (
          <>
            <Image
              src={allPhotos[0].url}
              alt={waypoint.name || "Waypoint"}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-green-300 mx-auto" />
              <p className="text-sm text-green-400 mt-2">
                No photos yet
              </p>
            </div>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </button>

        {/* Upload photo button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-5 right-3 z-20 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-black/70 transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ImagePlus className="h-3 w-3" />
          )}
          {uploading ? "Uploading..." : "Add photo"}
        </button>

        {/* Photo count */}
        {allPhotos.length > 0 && (
          <div className="absolute bottom-5 left-3 z-10 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
            {allPhotos.length} photo{allPhotos.length !== 1 ? "s" : ""}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
      </div>

      {/* Content area — same structure as route card */}
      <div className="relative z-10 bg-white rounded-t-2xl -mt-4">
        <form
          id="edit-waypoint-form"
          onSubmit={handleSubmit}
          className="p-4 pt-6 space-y-5"
        >
          {/* Title area */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Edit Waypoint
              </h2>
            </div>
            <p className="text-sm text-slate-500 ml-9">
              Changes will be visible to all users.
            </p>
          </div>

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
              className="mt-1.5 min-h-[120px]"
            />
          </div>

          {/* Photos section */}
          {allPhotos.length > 1 && (
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Photos
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {allPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative h-20 rounded-lg overflow-hidden group"
                  >
                    <Image
                      src={photo.url}
                      alt="Waypoint photo"
                      fill
                      className="object-cover"
                    />
                    {photo.id !== "__primary" && (
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
