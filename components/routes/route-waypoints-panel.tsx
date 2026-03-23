"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  MapPin,
  Plus,
  Image as ImageIcon,
  Pencil,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { latLngToOSGridRef } from "@/lib/routes/os-grid-ref";
import { toast } from "sonner";
import { EditWaypointDialog } from "./edit-waypoint-dialog";

interface RouteWaypointsPanelProps {
  routeId: string;
  fullWaypointList: any[];
  waypointElevationMap: Record<string, number>;
  onBack: () => void;
  onFlyToLocation?: (lat: number, lng: number) => void;
  onDismiss?: () => void;
  initialExpandedId?: string;
  userId?: string;
  isOwner?: boolean;
  isAdmin?: boolean;
  routeOwnerId?: string;
  routeGeometry?: any;
  onWaypointAdded?: (wp: any) => void;
  onWaypointUpdated?: (id: string, updates: any) => void;
}

export function RouteWaypointsPanel({
  routeId,
  fullWaypointList,
  waypointElevationMap,
  onBack,
  onFlyToLocation,
  onDismiss,
  initialExpandedId,
  userId,
  isOwner,
  isAdmin,
  routeOwnerId,
  routeGeometry,
  onWaypointAdded,
  onWaypointUpdated,
}: RouteWaypointsPanelProps) {
  const [expandedWaypoints, setExpandedWaypoints] = useState<Set<string>>(
    initialExpandedId ? new Set([initialExpandedId]) : new Set()
  );
  const [waypointTagFilters, setWaypointTagFilters] = useState<Set<string>>(
    new Set()
  );

  // Photo state
  const [waypointPhotos, setWaypointPhotos] = useState<
    Record<string, any[]>
  >({});
  const [loadingPhotos, setLoadingPhotos] = useState<
    Record<string, boolean>
  >({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingForWaypoint, setUploadingForWaypoint] = useState<
    string | null
  >(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Description editing state
  const [editingDescription, setEditingDescription] = useState<string | null>(
    null
  );
  const [editDescValue, setEditDescValue] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

  // Edit waypoint dialog
  const [editWaypointOpen, setEditWaypointOpen] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<any | null>(null);

  // Collapsible waypoint list
  const [showAllWaypoints, setShowAllWaypoints] = useState(false);
  const COLLAPSED_LIMIT = 4;

  // Waypoint suggestions (owner view only)
  const [pendingSuggestions, setPendingSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [processingSuggestion, setProcessingSuggestion] = useState<string | null>(null);

  // Auto-scroll and expand when initialExpandedId changes (e.g. from map click)
  useEffect(() => {
    if (!initialExpandedId) return;
    setExpandedWaypoints((prev) => new Set(prev).add(initialExpandedId));
    // Also show all waypoints if the target is hidden in collapsed view
    setShowAllWaypoints(true);
    // Scroll to the waypoint with a small delay to let DOM render
    const timer = setTimeout(() => {
      const el = document.getElementById(`waypoint-${initialExpandedId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Brief highlight animation
        el.classList.add("ring-2", "ring-primary", "ring-offset-1");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "ring-offset-1");
        }, 1500);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [initialExpandedId]);

  const canEditWaypoint = (wp: any) => {
    if (!userId) return false;
    if (wp.type === "start" || wp.type === "finish") return false;
    if (isAdmin) return true;
    if (isOwner) return true;
    if (wp.created_by_user_id === userId) return true;
    return false;
  };

  // Lazy-load photos when a waypoint is expanded
  const fetchWaypointPhotos = async (waypointId: string) => {
    if (
      waypointPhotos[waypointId] ||
      loadingPhotos[waypointId] ||
      waypointId.startsWith("__")
    )
      return;
    setLoadingPhotos((prev) => ({ ...prev, [waypointId]: true }));
    try {
      const res = await fetch(
        `/api/routes/${routeId}/waypoints/${waypointId}/photos`
      );
      if (res.ok) {
        const data = await res.json();
        setWaypointPhotos((prev) => ({
          ...prev,
          [waypointId]: data.photos || [],
        }));
      }
    } catch {
      // Silent fail — photos are supplementary
    } finally {
      setLoadingPhotos((prev) => ({ ...prev, [waypointId]: false }));
    }
  };

  const handleToggleExpand = (wpId: string) => {
    const next = new Set(expandedWaypoints);
    if (next.has(wpId)) {
      next.delete(wpId);
    } else {
      next.add(wpId);
      fetchWaypointPhotos(wpId);
    }
    setExpandedWaypoints(next);
  };

  // Also fetch photos for initially expanded waypoint
  useEffect(() => {
    if (initialExpandedId && !initialExpandedId.startsWith("__")) {
      fetchWaypointPhotos(initialExpandedId);
    }
  }, [initialExpandedId]);

  // Fetch pending suggestions (owner only)
  const fetchPendingSuggestions = async () => {
    if (!isOwner) return;
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/routes/${routeId}/waypoint-suggestions?status=pending`);
      if (res.ok) {
        const data = await res.json();
        setPendingSuggestions(data.suggestions || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchPendingSuggestions();
    }
  }, [isOwner, routeId]);

  const handleApproveSuggestion = async (suggestionId: string) => {
    setProcessingSuggestion(suggestionId);
    try {
      const res = await fetch(`/api/routes/${routeId}/waypoint-suggestions/${suggestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Waypoint suggestion approved and added to route!");
        setPendingSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        if (data.waypoint) {
          onWaypointAdded?.(data.waypoint);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to approve suggestion");
      }
    } catch {
      toast.error("Failed to approve suggestion");
    } finally {
      setProcessingSuggestion(null);
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    setProcessingSuggestion(suggestionId);
    try {
      const res = await fetch(`/api/routes/${routeId}/waypoint-suggestions/${suggestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejection_reason: "Not suitable for this route" }),
      });

      if (res.ok) {
        toast.success("Suggestion rejected");
        setPendingSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to reject suggestion");
      }
    } catch {
      toast.error("Failed to reject suggestion");
    } finally {
      setProcessingSuggestion(null);
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingForWaypoint) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `/api/routes/${routeId}/waypoints/${uploadingForWaypoint}/photos`,
        { method: "POST", body: formData }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      setWaypointPhotos((prev) => ({
        ...prev,
        [uploadingForWaypoint!]: [
          data.photo,
          ...(prev[uploadingForWaypoint!] || []),
        ],
      }));
      toast.success("Photo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      setUploadingForWaypoint(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (waypointId: string, photoId: string) => {
    try {
      const res = await fetch(
        `/api/routes/${routeId}/waypoints/${waypointId}/photos?photoId=${photoId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setWaypointPhotos((prev) => ({
          ...prev,
          [waypointId]: (prev[waypointId] || []).filter(
            (p: any) => p.id !== photoId
          ),
        }));
        toast.success("Photo deleted");
      } else {
        toast.error("Failed to delete photo");
      }
    } catch {
      toast.error("Failed to delete photo");
    }
  };

  const handleSaveDescription = async (waypointId: string) => {
    setSavingDescription(true);
    try {
      const res = await fetch(
        `/api/routes/${routeId}/waypoints/${waypointId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: editDescValue }),
        }
      );
      if (res.ok) {
        onWaypointUpdated?.(waypointId, { description: editDescValue });
        setEditingDescription(null);
        toast.success("Description updated");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update description");
      }
    } catch {
      toast.error("Failed to update description");
    } finally {
      setSavingDescription(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hidden file input for photo uploads */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Header with Back Button */}
      <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0"
        >
          <ChevronDown className="h-5 w-5 rotate-90" />
        </Button>
        <h2 className="font-semibold text-lg">Waypoints</h2>
        <Badge variant="outline" className="ml-auto">
          {fullWaypointList.length}
        </Badge>
        {isOwner && (
          <span className="text-xs text-slate-500 italic">
            Click map to add waypoints
          </span>
        )}
      </div>

      {/* Tag Filter Pills */}
      <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b">
        {[
          {
            value: "instruction",
            label: "Instruction",
            color: "bg-blue-100 text-blue-700 border-blue-300",
          },
          {
            value: "poi",
            label: "POI",
            color: "bg-purple-100 text-purple-700 border-purple-300",
          },
          {
            value: "note",
            label: "Note",
            color: "bg-gray-100 text-gray-700 border-gray-300",
          },
          {
            value: "caution",
            label: "Caution",
            color: "bg-amber-100 text-amber-700 border-amber-300",
          },
        ].map((tag) => {
          const isActive = waypointTagFilters.has(tag.value);
          return (
            <button
              key={tag.value}
              onClick={() => {
                setWaypointTagFilters((prev) => {
                  const next = new Set(prev);
                  if (next.has(tag.value)) next.delete(tag.value);
                  else next.add(tag.value);
                  return next;
                });
              }}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                isActive
                  ? tag.color
                  : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
              )}
            >
              {tag.label}
            </button>
          );
        })}
      </div>

      {/* Pending Suggestions Section (Owner Only) */}
      {isOwner && pendingSuggestions.length > 0 && (
        <div className="border-b bg-amber-50/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
            <span>Pending Suggestions</span>
            <Badge className="bg-amber-100 text-amber-700 border-amber-300">
              {pendingSuggestions.length}
            </Badge>
          </h3>
          <div className="space-y-2">
            {pendingSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-white border border-amber-200 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{suggestion.name}</p>
                    {suggestion.description && (
                      <p className="text-xs text-slate-600 mt-1">{suggestion.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {suggestion.tag && (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] h-5 px-1.5", {
                            "bg-blue-50 text-blue-700 border-blue-200":
                              suggestion.tag === "instruction",
                            "bg-purple-50 text-purple-700 border-purple-200":
                              suggestion.tag === "poi",
                            "bg-amber-50 text-amber-700 border-amber-200":
                              suggestion.tag === "caution",
                            "bg-gray-50 text-gray-700 border-gray-200":
                              suggestion.tag === "note",
                          })}
                        >
                          {suggestion.tag === "instruction"
                            ? "Instruction"
                            : suggestion.tag === "poi"
                              ? "POI"
                              : suggestion.tag === "caution"
                                ? "Caution"
                                : "Note"}
                        </Badge>
                      )}
                      {suggestion.user?.name && (
                        <span className="text-xs text-slate-500">
                          by {suggestion.user.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                    disabled={processingSuggestion === suggestion.id}
                    onClick={() => handleRejectSuggestion(suggestion.id)}
                  >
                    {processingSuggestion === suggestion.id ? "Rejecting..." : "Reject"}
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-green-600 hover:bg-green-700"
                    disabled={processingSuggestion === suggestion.id}
                    onClick={() => handleApproveSuggestion(suggestion.id)}
                  >
                    {processingSuggestion === suggestion.id ? "Approving..." : "Approve & Add"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waypoints Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="relative">
          {(() => {
            const filtered = fullWaypointList.filter((wp: any) => {
              if (waypointTagFilters.size === 0) return true;
              if (wp.type === "start" || wp.type === "finish") return true;
              return waypointTagFilters.has(wp.tag || "note");
            });
            const shouldCollapse = filtered.length > COLLAPSED_LIMIT && !showAllWaypoints;
            const visibleWaypoints = shouldCollapse
              ? [...filtered.slice(0, 3), filtered[filtered.length - 1]]
              : filtered;
            const hiddenCount = filtered.length - 4;

            return filtered.length > 0 ? (
              <>
                {visibleWaypoints.map((wp: any, visIdx: number) => {
                  const index = filtered.indexOf(wp);
                  const isExpanded = expandedWaypoints.has(wp.id);
                  const isStart = wp.type === "start";
                  const isFinish = wp.type === "finish";
                  const isLast = visIdx === visibleWaypoints.length - 1;
                  const circleColor = isStart
                    ? "bg-green-600 text-white ring-2 ring-green-200"
                    : isFinish
                      ? "bg-red-500 text-white ring-2 ring-red-200"
                      : "bg-slate-700 text-white";
                  const circleLabel = isStart
                    ? "S"
                    : isFinish
                      ? "F"
                      : `${index}`;
                  const wpElevation = waypointElevationMap[wp.id];
                  const gridRef = latLngToOSGridRef(wp.lat, wp.lng);
                  const canEdit = canEditWaypoint(wp);

                  // Calculate ascent/descent from previous using elevation data
                  const prevWp =
                    index > 0 ? fullWaypointList[index - 1] : null;
                  const prevElevation = prevWp
                    ? waypointElevationMap[prevWp.id]
                    : undefined;
                  let ascentFromPrev: number | undefined;
                  let descentFromPrev: number | undefined;
                  if (
                    wpElevation !== undefined &&
                    prevElevation !== undefined
                  ) {
                    const diff = wpElevation - prevElevation;
                    ascentFromPrev = diff > 0 ? diff : 0;
                    descentFromPrev = diff < 0 ? Math.abs(diff) : 0;
                  }

                  const photos = waypointPhotos[wp.id] || [];
                  const isLoadingPhotos = loadingPhotos[wp.id];

                  // Show "X more waypoints" divider before the last item when collapsed
                  const showCollapseGap = shouldCollapse && visIdx === 3;

                  return (
                    <div key={wp.id}>
                      {showCollapseGap && (
                        <div className="flex items-center gap-3 py-2 pl-[3px]">
                          {/* Timeline connector through expand button */}
                          <div className="w-9 flex justify-center">
                            <div className="w-0.5 h-full border-l-[3px] border-dotted border-slate-300" />
                          </div>
                          <button
                            onClick={() => setShowAllWaypoints(true)}
                            className="flex-1 text-center py-2 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors"
                          >
                            Show {hiddenCount} more waypoint{hiddenCount !== 1 ? "s" : ""}
                          </button>
                        </div>
                      )}
                      <div className="flex gap-3 pl-[3px]">
                        {/* Timeline column */}
                        <div className="flex flex-col items-center">
                          {/* Dotted line above (except first) */}
                          {visIdx > 0 && (
                            <div className="w-0.5 flex-1 min-h-[8px] border-l-[3px] border-dotted border-slate-300" />
                          )}
                          {/* Number circle */}
                          <div
                            className={cn(
                              "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm",
                              circleColor
                            )}
                          >
                            {circleLabel}
                          </div>
                          {/* Dotted line below (except last) */}
                          {!isLast && (
                            <div className="w-0.5 flex-1 min-h-[8px] border-l-[3px] border-dotted border-slate-300" />
                          )}
                        </div>
                        {/* Content */}
                        <div
                          id={`waypoint-${wp.id}`}
                          className="flex-1 min-w-0 mb-1 border rounded-lg overflow-hidden"
                        >
                          {/* Collapsed row */}
                          <button
                            onClick={() => handleToggleExpand(wp.id)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {wp.name || `Waypoint ${index}`}
                              </p>
                            </div>
                            {wp.tag && wp.tag !== "note" && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] h-5 px-1.5 flex-shrink-0",
                                  {
                                    "bg-blue-50 text-blue-700 border-blue-200":
                                      wp.tag === "instruction",
                                    "bg-purple-50 text-purple-700 border-purple-200":
                                      wp.tag === "poi",
                                    "bg-amber-50 text-amber-700 border-amber-200":
                                      wp.tag === "caution",
                                  }
                                )}
                              >
                                {wp.tag === "instruction"
                                  ? "Instruction"
                                  : wp.tag === "poi"
                                    ? "POI"
                                    : "Caution"}
                              </Badge>
                            )}
                            {wp._distFromStart > 0 && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {wp._distFromStart.toFixed(2)} km
                              </span>
                            )}
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t bg-slate-50/50 space-y-2">
                        {/* Description */}
                        {editingDescription === wp.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editDescValue}
                              onChange={(e) =>
                                setEditDescValue(e.target.value)
                              }
                              className="text-sm min-h-[60px]"
                              placeholder="Add a description..."
                              maxLength={500}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => setEditingDescription(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="text-xs h-7 bg-green-600 hover:bg-green-700"
                                disabled={savingDescription}
                                onClick={() => handleSaveDescription(wp.id)}
                              >
                                {savingDescription ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        ) : wp.description ? (
                          <div className="flex items-start gap-1">
                            <p className="text-sm text-slate-600 flex-1">
                              {wp.description}
                            </p>
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingDescription(wp.id);
                                  setEditDescValue(wp.description || "");
                                }}
                                className="flex-shrink-0 p-1 hover:bg-slate-200 rounded"
                              >
                                <Pencil className="h-3 w-3 text-slate-400" />
                              </button>
                            )}
                          </div>
                        ) : canEdit ? (
                          <button
                            onClick={() => {
                              setEditingDescription(wp.id);
                              setEditDescValue("");
                            }}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            + Add description
                          </button>
                        ) : null}

                        {/* Grid data */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          {wp._distFromPrev > 0 && (
                            <>
                              <span className="text-slate-500">
                                Distance from previous:
                              </span>
                              <span className="font-medium">
                                {wp._distFromPrev.toFixed(2)} km
                              </span>
                            </>
                          )}
                          {ascentFromPrev !== undefined &&
                            ascentFromPrev > 0 && (
                              <>
                                <span className="text-slate-500">
                                  Ascent from previous:
                                </span>
                                <span className="font-medium">
                                  {Math.round(ascentFromPrev)} m
                                </span>
                              </>
                            )}
                          {descentFromPrev !== undefined &&
                            descentFromPrev > 0 && (
                              <>
                                <span className="text-slate-500">
                                  Descent from previous:
                                </span>
                                <span className="font-medium">
                                  {Math.round(descentFromPrev)} m
                                </span>
                              </>
                            )}
                          {gridRef && (
                            <>
                              <span className="text-slate-500">
                                OS Grid Ref:
                              </span>
                              <span className="font-medium font-mono">
                                {gridRef}
                              </span>
                            </>
                          )}
                          <span className="text-slate-500">Lat, long:</span>
                          <span className="font-medium font-mono">
                            {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                          </span>
                          {wpElevation !== undefined && (
                            <>
                              <span className="text-slate-500">
                                Elevation:
                              </span>
                              <span className="font-medium">
                                {wpElevation} m
                              </span>
                            </>
                          )}
                        </div>

                        {/* Original photo (from route_waypoints.photo_url) */}
                        {wp.photo_url && (
                          <div className="relative h-32 w-full rounded-md overflow-hidden">
                            <Image
                              src={wp.photo_url}
                              alt={wp.name || "Waypoint"}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 400px"
                            />
                          </div>
                        )}

                        {/* Community photos */}
                        {isLoadingPhotos && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="animate-spin h-3 w-3 border-2 border-slate-300 border-t-transparent rounded-full" />
                            Loading photos...
                          </div>
                        )}
                        {photos.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1.5">
                              Community photos ({photos.length})
                            </p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {photos.map((photo: any) => {
                                const canDeletePhoto =
                                  photo.user_id === userId ||
                                  isOwner ||
                                  isAdmin;
                                return (
                                  <div
                                    key={photo.id}
                                    className="relative aspect-square rounded-md overflow-hidden group"
                                  >
                                    <Image
                                      src={photo.url}
                                      alt=""
                                      fill
                                      className="object-cover"
                                      sizes="120px"
                                    />
                                    {canDeletePhoto && (
                                      <button
                                        onClick={() =>
                                          handleDeletePhoto(
                                            wp.id,
                                            photo.id
                                          )
                                        }
                                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="h-3 w-3 text-white" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          {/* Edit details button */}
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => {
                                setEditingWaypoint(wp);
                                setEditWaypointOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit details
                            </Button>
                          )}
                          {/* Add photo button */}
                          {userId && !wp.id.startsWith("__") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                              disabled={uploadingPhoto}
                              onClick={() => {
                                setUploadingForWaypoint(wp.id);
                                photoInputRef.current?.click();
                              }}
                            >
                              <ImageIcon className="h-3 w-3 mr-1" />
                              {uploadingPhoto &&
                              uploadingForWaypoint === wp.id
                                ? "Uploading..."
                                : "Add photo"}
                            </Button>
                          )}
                          {/* Show on map */}
                          {onFlyToLocation && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => {
                                onFlyToLocation(wp.lat, wp.lng);
                                onDismiss?.();
                              }}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              Show on map
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Collapse button when expanded */}
                {!shouldCollapse && filtered.length > COLLAPSED_LIMIT && showAllWaypoints && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setShowAllWaypoints(false)}
                      className="text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/5 px-4 py-1.5 rounded-lg transition-colors"
                    >
                      Show fewer waypoints
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No waypoints added to this route yet.
                </p>
              </div>
            );
          })()}
        </div>
      </ScrollArea>

      {/* Edit Waypoint Dialog */}
      {editingWaypoint && (
        <EditWaypointDialog
          open={editWaypointOpen}
          onOpenChange={setEditWaypointOpen}
          routeId={routeId}
          waypoint={editingWaypoint}
          onWaypointUpdated={(updatedWp) => {
            onWaypointUpdated?.(editingWaypoint.id, updatedWp);
            setEditWaypointOpen(false);
            setEditingWaypoint(null);
          }}
        />
      )}
    </div>
  );
}
