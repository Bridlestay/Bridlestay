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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  MapPin,
  ImagePlus,
  X,
  Loader2,
  Check,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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

const TAG_LABELS: Record<string, string> = {
  poi: "Point of Interest",
  instruction: "Instruction",
  caution: "Caution",
  note: "Note",
};

const ICON_LABELS: Record<string, string> = Object.fromEntries(
  ICON_TYPES.map((t) => [t.value, t.label])
);

interface WaypointPhoto {
  id: string;
  url: string;
  caption?: string | null;
  user?: { id: string; name?: string; avatar_url?: string } | null;
}

interface SuggestedPhotoEntry {
  action: "add" | "remove";
  url: string;
  caption?: string | null;
}

interface EditSuggestion {
  id: string;
  waypoint_id: string;
  user_id: string;
  suggested_name: string | null;
  suggested_tag: string | null;
  suggested_icon_type: string | null;
  suggested_description: string | null;
  suggested_photos: SuggestedPhotoEntry[] | null;
  suggestion_comment: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  users?: { id: string; username?: string; avatar_url?: string };
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

  // Suggestion state
  const [suggestions, setSuggestions] = useState<EditSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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

  // Fetch pending edit suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `/api/waypoints/${waypoint.id}/edit-suggestions`
        );
        if (res.ok) {
          const data = await res.json();
          const pending = (data.suggestions || []).filter(
            (s: EditSuggestion) => s.status === "pending"
          );
          setSuggestions(pending);
        }
      } catch {
        // Non-critical — owner may not have suggestions
      } finally {
        setLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, [waypoint.id]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a waypoint name");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/routes/${routeId}/waypoints/${waypoint.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            tag: tag || null,
            icon_type: iconType || null,
            description: description.trim() || null,
          }),
        }
      );

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

  const handleApproveSuggestion = async (suggestion: EditSuggestion) => {
    setProcessingId(suggestion.id);
    try {
      const res = await fetch(
        `/api/waypoints/${waypoint.id}/edit-suggestions/${suggestion.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        }
      );

      if (res.ok) {
        // Apply suggested values to the form
        if (suggestion.suggested_name !== null)
          setName(suggestion.suggested_name);
        if (suggestion.suggested_tag !== null)
          setTag(suggestion.suggested_tag);
        if (suggestion.suggested_icon_type !== null)
          setIconType(suggestion.suggested_icon_type);
        if (suggestion.suggested_description !== null)
          setDescription(suggestion.suggested_description);

        setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
        toast.success("Suggestion approved and applied!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to approve suggestion");
      }
    } catch {
      toast.error("Failed to approve suggestion");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprovePhotosOnly = async (suggestion: EditSuggestion) => {
    setProcessingId(suggestion.id);
    try {
      const res = await fetch(
        `/api/waypoints/${waypoint.id}/edit-suggestions/${suggestion.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve_photos" }),
        }
      );

      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
        toast.success("Photos accepted!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to accept photos");
      }
    } catch {
      toast.error("Failed to accept photos");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessingId(suggestionId);
    try {
      const res = await fetch(
        `/api/waypoints/${waypoint.id}/edit-suggestions/${suggestionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reject",
            rejection_reason: rejectionReason.trim(),
          }),
        }
      );

      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
        setRejectingId(null);
        setRejectionReason("");
        toast.success("Suggestion rejected");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to reject suggestion");
      }
    } catch {
      toast.error("Failed to reject suggestion");
    } finally {
      setProcessingId(null);
    }
  };

  // Combine primary photo_url with fetched photos for display
  const allPhotos = [
    ...(waypoint.photo_url
      ? [{ id: "__primary", url: waypoint.photo_url }]
      : []),
    ...photos,
  ];

  const pendingCount = suggestions.length;

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
              <p className="text-sm text-green-400 mt-2">No photos yet</p>
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

          {/* Pending Suggestions Section */}
          {pendingCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
              <div className="px-3.5 py-2.5 bg-amber-100/60 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">
                    {pendingCount} suggested edit
                    {pendingCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-amber-100">
                {suggestions.map((s) => (
                  <div key={s.id} className="p-3.5">
                    {/* User + time */}
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={s.users?.avatar_url || undefined}
                        />
                        <AvatarFallback className="text-[10px] bg-slate-200">
                          {(s.users?.username || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-slate-700">
                        {s.users?.username || "User"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(s.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    {/* Comment */}
                    <p className="text-sm text-slate-600 italic mb-3 leading-relaxed">
                      &ldquo;{s.suggestion_comment}&rdquo;
                    </p>

                    {/* Proposed changes */}
                    <div className="space-y-1.5 mb-3">
                      {s.suggested_name !== null && (
                        <SuggestionDiff
                          label="Name"
                          current={waypoint.name || "—"}
                          suggested={s.suggested_name}
                        />
                      )}
                      {s.suggested_tag !== null && (
                        <SuggestionDiff
                          label="Tag"
                          current={
                            waypoint.tag
                              ? TAG_LABELS[waypoint.tag] || waypoint.tag
                              : "—"
                          }
                          suggested={
                            TAG_LABELS[s.suggested_tag] || s.suggested_tag
                          }
                        />
                      )}
                      {s.suggested_icon_type !== null && (
                        <SuggestionDiff
                          label="Icon"
                          current={
                            waypoint.icon_type
                              ? ICON_LABELS[waypoint.icon_type] ||
                                waypoint.icon_type
                              : "—"
                          }
                          suggested={
                            ICON_LABELS[s.suggested_icon_type] ||
                            s.suggested_icon_type
                          }
                        />
                      )}
                      {s.suggested_description !== null && (
                        <SuggestionDiff
                          label="Description"
                          current={waypoint.description || "—"}
                          suggested={s.suggested_description}
                          multiline
                        />
                      )}
                    </div>

                    {/* Suggested photos */}
                    {Array.isArray(s.suggested_photos) &&
                      s.suggested_photos.length > 0 && (
                        <div className="mb-3">
                          <span className="text-xs font-medium text-slate-500 block mb-1.5">
                            Suggested photos:
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {s.suggested_photos
                              .filter((p) => p.action === "add")
                              .map((p, idx) => (
                                <div
                                  key={idx}
                                  className="relative h-16 rounded-md overflow-hidden"
                                >
                                  <Image
                                    src={p.url}
                                    alt={p.caption || "Suggested photo"}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    {/* Actions */}
                    {rejectingId === s.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Reason for rejecting..."
                          className="min-h-[60px] text-sm"
                          maxLength={300}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectionReason("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="text-xs h-7"
                            disabled={
                              !rejectionReason.trim() ||
                              processingId === s.id
                            }
                            onClick={() => handleRejectSuggestion(s.id)}
                          >
                            {processingId === s.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-slate-600"
                          disabled={processingId === s.id}
                          onClick={() => setRejectingId(s.id)}
                        >
                          Reject
                        </Button>
                        {/* Accept photos only (when suggestion has both text + photos) */}
                        {Array.isArray(s.suggested_photos) &&
                          s.suggested_photos.length > 0 &&
                          (s.suggested_name !== null ||
                            s.suggested_tag !== null ||
                            s.suggested_icon_type !== null ||
                            s.suggested_description !== null) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 text-green-600 border-green-200 hover:bg-green-50"
                              disabled={processingId === s.id}
                              onClick={() => handleApprovePhotosOnly(s)}
                            >
                              {processingId === s.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <ImagePlus className="h-3 w-3 mr-1" />
                              )}
                              Accept photos only
                            </Button>
                          )}
                        <Button
                          type="button"
                          size="sm"
                          className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white"
                          disabled={processingId === s.id}
                          onClick={() => handleApproveSuggestion(s)}
                        >
                          {processingId === s.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Apply all changes
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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

/* ─── Suggestion diff row ─────────────────────────────── */
function SuggestionDiff({
  label,
  current,
  suggested,
  multiline,
}: {
  label: string;
  current: string;
  suggested: string;
  multiline?: boolean;
}) {
  return (
    <div
      className={`text-xs ${multiline ? "space-y-1" : "flex items-center gap-1.5 flex-wrap"}`}
    >
      <span className="font-medium text-slate-500">{label}:</span>
      {multiline ? (
        <>
          <p className="text-slate-400 line-clamp-1">{current}</p>
          <div className="flex items-center gap-1">
            <ArrowRight className="h-3 w-3 text-green-500 flex-shrink-0" />
            <p className="text-green-700 font-medium line-clamp-2">
              {suggested}
            </p>
          </div>
        </>
      ) : (
        <>
          <span className="text-slate-400">{current}</span>
          <ArrowRight className="h-3 w-3 text-green-500 flex-shrink-0" />
          <span className="text-green-700 font-medium">{suggested}</span>
        </>
      )}
    </div>
  );
}
