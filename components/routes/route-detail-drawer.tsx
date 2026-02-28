"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Download,
  Share2,
  Flag,
  Home,
  Heart,
  Bookmark,
  AlertTriangle,
  MessageCircle,
  Pencil,
  Image as ImageIcon,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Navigation,
} from "lucide-react";
import {
  getRouteCentroid,
  weatherCacheKey,
  type WeatherData,
} from "@/lib/weather";
import { cache, CACHE_TTL } from "@/lib/cache";
import { NearbyPropertyCard } from "./nearby-property-card";
import { getMapboxThumbnailUrl } from "@/lib/routes/route-thumbnail";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ElevationProfile } from "./elevation-profile";
import {
  WARNING_TYPES,
  getDifficultyInfo,
  getTimeRemaining,
} from "./route-detail-constants";

// Sub-components
import { PhotoLightbox } from "./route-photo-lightbox";
import { RouteWeatherSection } from "./route-weather-section";
import { RouteDiscussionPanel } from "./route-discussion-panel";
import { RouteWaypointsPanel } from "./route-waypoints-panel";
import {
  HazardReportDialog,
  WarningPostDialog,
  ReportCommentDialog,
} from "./route-hazard-dialogs";
import { RouteReviewFlow } from "./route-review-flow";
import { RouteReviewCards } from "./route-review-cards";

// --- Main Component ---

interface RouteDetailDrawerProps {
  routeId: string | null;
  open: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  onShowPropertyOnMap?: (propertyId: string, lat: number, lng: number) => void;
  onEditRoute?: (routeId: string, routeData: any) => void;
  onFlyToLocation?: (lat: number, lng: number) => void;
  initialWaypointId?: string | null;
  onWaypointFocused?: () => void;
  onEnterViewMode?: (mode: "waypoints" | "hazards") => void;
  onHazardsLoaded?: (hazards: any[]) => void;
  onHazardResolved?: (hazardId: string) => void;
  onPlaceHazard?: () => void;
}

export function RouteDetailDrawer({
  routeId,
  open,
  onClose,
  onDismiss,
  onShowPropertyOnMap,
  onEditRoute,
  onFlyToLocation,
  initialWaypointId,
  onWaypointFocused,
  onEnterViewMode,
  onHazardsLoaded,
  onHazardResolved,
  onPlaceHazard,
}: RouteDetailDrawerProps) {
  // --- Route data ---
  const [route, setRoute] = useState<any>(null);
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [coverPhoto, setCoverPhoto] = useState<any>(null);
  const [apiDisplayPhotos, setApiDisplayPhotos] = useState<any[]>([]);

  // --- Loading ---
  const [loading, setLoading] = useState(false);
  const [loadingWaypoints, setLoadingWaypoints] = useState(false);

  // --- User ---
  const [userId, setUserId] = useState<string | undefined>();
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [favorited, setFavorited] = useState(false);

  // --- Panel view ---
  const [activeFullPanel, setActiveFullPanel] = useState<"discussion" | "reviews" | "waypoints" | null>(null);

  // --- Photo carousel ---
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);

  // --- Review flow ---
  const [reviewStep, setReviewStep] = useState<number | null>(null);
  const [routeCompletions, setRouteCompletions] = useState<any[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // --- Elevation ---
  const [elevationData, setElevationData] = useState<{
    elevations: number[];
    distances: number[];
    totalAscent: number;
    totalDescent: number;
    minElevation: number;
    maxElevation: number;
    waypointElevations: number[];
  } | null>(null);
  const [loadingElevation, setLoadingElevation] = useState(false);

  // --- Weather ---
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // --- Warnings ---
  const [warnings, setWarnings] = useState<any[]>([]);
  const [showAllWarnings, setShowAllWarnings] = useState(false);
  const [userVotedWarnings, setUserVotedWarnings] = useState<Set<string>>(new Set());

  // --- Dialogs ---
  const [hazardDialogOpen, setHazardDialogOpen] = useState(false);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const supabase = createClient();

  // ===================== DATA FETCHING =====================

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        setIsAdmin(userData?.role === "admin");
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!routeId || !open) return;

    const fetchRoute = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/routes/${routeId}`);
        if (res.ok) {
          const data = await res.json();
          setRoute(data.route);
          setIsOwner(data.route?.owner_user_id === userId);
        }
      } catch (error) {
        console.error("Failed to fetch route:", error);
        toast.error("Failed to load route details");
      } finally {
        setLoading(false);
      }
    };

    const fetchWaypoints = async () => {
      setLoadingWaypoints(true);
      try {
        const res = await fetch(`/api/routes/${routeId}/waypoints`);
        if (res.ok) {
          const data = await res.json();
          setWaypoints(data.waypoints || []);
        }
      } catch (error) {
        console.error("Failed to fetch waypoints:", error);
      } finally {
        setLoadingWaypoints(false);
      }
    };

    const fetchNearbyProperties = async () => {
      try {
        const res = await fetch(`/api/routes/${routeId}/nearby-properties`);
        if (res.ok) {
          const data = await res.json();
          setNearbyProperties(data.properties || []);
        }
      } catch (error) {
        console.error("Failed to fetch nearby properties:", error);
      }
    };

    const fetchHazards = async () => {
      try {
        const res = await fetch(`/api/routes/${routeId}/hazards`);
        if (res.ok) {
          const data = await res.json();
          setHazards(data.hazards || []);
          onHazardsLoaded?.(data.hazards || []);
        }
      } catch (error) {
        console.error("Failed to fetch hazards:", error);
      }
    };

    const fetchWarnings = async () => {
      try {
        const res = await fetch(`/api/routes/${routeId}/hazards?is_warning=true`);
        if (res.ok) {
          const data = await res.json();
          setWarnings(data.hazards || []);
          const voted = new Set<string>();
          (data.hazards || []).forEach((h: any) => {
            if (h.user_has_voted) voted.add(h.id);
          });
          setUserVotedWarnings(voted);
        }
      } catch (error) {
        console.error("Failed to fetch warnings:", error);
      }
    };

    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/routes/${routeId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      }
    };

    const fetchLikeStatus = async () => {
      try {
        const res = await fetch(`/api/routes/${routeId}/like`);
        if (res.ok) {
          const data = await res.json();
          setLiked(data.liked);
          setLikesCount(data.likes_count);
        }
      } catch (error) {
        console.error("Failed to fetch like status:", error);
      }
    };

    const fetchFavoriteStatus = async () => {
      try {
        const res = await fetch(`/api/routes/${routeId}/favorite`);
        if (res.ok) {
          const data = await res.json();
          setFavorited(data.favorited);
        }
      } catch (error) {
        console.error("Failed to fetch favorite status:", error);
      }
    };

    const fetchPhotos = async () => {
      try {
        const res = await fetch(`/api/routes/${routeId}/photos`);
        if (res.ok) {
          const data = await res.json();
          setPhotos(data.photos || []);
          setCoverPhoto(data.coverPhoto || null);
          setApiDisplayPhotos(data.displayPhotos || []);
        }
      } catch (error) {
        console.error("Failed to fetch photos:", error);
      }
    };

    fetchRoute();
    fetchWaypoints();
    fetchNearbyProperties();
    fetchHazards();
    fetchWarnings();
    fetchComments();
    fetchLikeStatus();
    fetchFavoriteStatus();
    fetchPhotos();
    fetchCompletions();
  }, [routeId, open, userId]);

  useEffect(() => {
    if (routeId && open && route && !loadingWaypoints) {
      fetchElevation();
    }
  }, [routeId, open, route, loadingWaypoints]);

  useEffect(() => {
    if (initialWaypointId) {
      setActiveFullPanel("waypoints");
      onWaypointFocused?.();
      setTimeout(() => {
        const el = document.getElementById(`waypoint-${initialWaypointId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [initialWaypointId]);

  useEffect(() => {
    if (route && userId) {
      setIsOwner(route.owner_user_id === userId);
    }
  }, [route, userId]);

  // Weather fetch
  useEffect(() => {
    if (!route || !open) {
      setWeatherData(null);
      return;
    }
    const geometry = route.geometry || route.route_geometry;
    const coords = geometry?.coordinates as [number, number][] | undefined;
    const centroid = getRouteCentroid(coords || []);
    if (!centroid) return;

    let cancelled = false;
    setLoadingWeather(true);

    const key = weatherCacheKey(centroid.lat, centroid.lng);
    cache
      .getOrFetch<WeatherData>(
        key,
        async () => {
          const res = await fetch(`/api/weather?lat=${centroid.lat}&lng=${centroid.lng}`);
          if (!res.ok) throw new Error("Weather fetch failed");
          return res.json();
        },
        CACHE_TTL.weather
      )
      .then((data) => { if (!cancelled) setWeatherData(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingWeather(false); });

    return () => { cancelled = true; };
  }, [route, open]);

  // Reverse geocode for location name
  useEffect(() => {
    if (!route || !open) {
      setLocationName(null);
      return;
    }
    const geometry = route.geometry || route.route_geometry;
    const coords = geometry?.coordinates as [number, number][] | undefined;
    const centroid = getRouteCentroid(coords || []);
    if (!centroid) return;

    let cancelled = false;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${centroid.lng},${centroid.lat}.json?access_token=${token}&types=place,locality&limit=1`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.features?.[0]) {
          const parts = data.features[0].place_name?.split(", ") || [];
          setLocationName(parts.slice(0, 2).join(", "));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [route, open]);

  // ===================== HANDLERS =====================

  const fetchCompletions = async () => {
    if (!routeId) return;
    try {
      const res = await fetch(`/api/routes/${routeId}/completions`);
      if (res.ok) {
        const data = await res.json();
        setRouteCompletions(data.completions || []);
      }
    } catch {
      // Non-critical
    }
  };

  const fetchElevation = async () => {
    if (!routeId) return;
    setLoadingElevation(true);
    try {
      const wpCoords = waypoints.map((w: any) => ({ lat: w.lat, lng: w.lng }));
      const wpParam = wpCoords.length > 0 ? `?waypoints=${encodeURIComponent(JSON.stringify(wpCoords))}` : "";
      const res = await fetch(`/api/routes/${routeId}/elevation${wpParam}`);
      if (res.ok) {
        const data = await res.json();
        setElevationData(data);
      }
    } catch {
      // Non-critical
    } finally {
      setLoadingElevation(false);
    }
  };

  const handleDownloadGPX = async () => {
    if (!routeId) return;
    try {
      const res = await fetch(`/api/routes/${routeId}/gpx`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${route?.title || "route"}.gpx`;
        a.click();
        fetch(`/api/routes/${routeId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ share_method: "gpx_download" }),
        });
        toast.success("GPX file downloaded!");
      }
    } catch {
      toast.error("Failed to download GPX");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/routes?routeId=${routeId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: route?.title, text: route?.description, url });
        fetch(`/api/routes/${routeId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ share_method: "social" }),
        });
      } else {
        await navigator.clipboard.writeText(url);
        fetch(`/api/routes/${routeId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ share_method: "link" }),
        });
        toast.success("Link copied to clipboard!");
      }
    } catch {
      // User cancelled share
    }
  };

  const handleLike = async () => {
    if (!userId) { toast.error("Please sign in to like routes"); return; }
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((prev) => prev + (newLiked ? 1 : -1));
    try {
      const res = await fetch(`/api/routes/${routeId}/like`, { method: newLiked ? "POST" : "DELETE" });
      if (!res.ok) {
        setLiked(!newLiked);
        setLikesCount((prev) => prev + (newLiked ? -1 : 1));
        toast.error("Failed to update like");
      }
    } catch {
      setLiked(!newLiked);
      setLikesCount((prev) => prev + (newLiked ? -1 : 1));
      toast.error("Failed to update like");
    }
  };

  const handleFavorite = async () => {
    if (!userId) { toast.error("Please sign in to save routes"); return; }
    const newFavorited = !favorited;
    setFavorited(newFavorited);
    try {
      const res = await fetch(`/api/routes/${routeId}/favorite`, { method: newFavorited ? "POST" : "DELETE" });
      if (!res.ok) {
        setFavorited(!newFavorited);
        toast.error("Failed to update favorites");
      } else {
        toast.success(newFavorited ? "Saved to favorites!" : "Removed from favorites");
      }
    } catch {
      setFavorited(!newFavorited);
      toast.error("Failed to update favorites");
    }
  };

  const handleVoteClearWarning = async (warningId: string) => {
    try {
      const res = await fetch(`/api/routes/${routeId}/hazards/${warningId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setUserVotedWarnings((prev) => new Set([...prev, warningId]));
        if (data.status === "resolved") {
          setWarnings((prev) => prev.map((w) => (w.id === warningId ? { ...w, status: "resolved" } : w)));
          onHazardResolved?.(warningId);
          toast.success("Warning cleared by community votes!");
        } else {
          setWarnings((prev) =>
            prev.map((w) =>
              w.id === warningId
                ? { ...w, clear_votes_count: data.clear_votes_count, clear_votes_needed: data.clear_votes_needed, user_has_voted: true }
                : w
            )
          );
          toast.success(`${data.clear_votes_count}/${data.clear_votes_needed} say cleared`);
        }
      } else if (res.status === 409) {
        toast("You've already voted on this warning");
        setUserVotedWarnings((prev) => new Set([...prev, warningId]));
      } else {
        toast.error("Failed to vote");
      }
    } catch {
      toast.error("Failed to vote");
    }
  };

  // ===================== COMPUTED VALUES =====================

  const fullWaypointList = useMemo(() => {
    const geo = route?.geometry || route?.route_geometry;
    const coords = geo?.coordinates || [];
    const sorted = [...(waypoints || [])].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
    const list: any[] = [];

    if (coords.length > 0) {
      list.push({ id: "__start", type: "start", name: "Start", lat: coords[0][1], lng: coords[0][0], order_index: -1 });
    }
    sorted.forEach((wp: any, idx: number) => {
      list.push({ ...wp, type: "waypoint", listIndex: idx });
    });
    if (coords.length > 1) {
      const last = coords[coords.length - 1];
      list.push({ id: "__finish", type: "finish", name: "Finish", lat: last[1], lng: last[0], order_index: 9999 });
    }

    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const curr = list[i];
      const R = 6371;
      const dLat = ((curr.lat - prev.lat) * Math.PI) / 180;
      const dLng = ((curr.lng - prev.lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((prev.lat * Math.PI) / 180) * Math.cos((curr.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      curr._distFromPrev = dist;
      curr._distFromStart = (prev._distFromStart || 0) + dist;
    }

    return list;
  }, [route, waypoints]);

  const waypointElevationMap = useMemo(() => {
    if (!elevationData?.waypointElevations || !waypoints || waypoints.length === 0) return {};
    const sorted = [...waypoints].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
    const map: Record<string, number> = {};
    sorted.forEach((wp: any, i: number) => {
      if (elevationData.waypointElevations[i] !== undefined) {
        map[wp.id] = elevationData.waypointElevations[i];
      }
    });
    return map;
  }, [elevationData, waypoints]);

  const userHasCompletion = useMemo(() => {
    if (!userId) return false;
    return routeCompletions.some((c: any) => c.user?.id === userId);
  }, [routeCompletions, userId]);

  const displayPhotosForCarousel = useMemo(() => {
    if (coverPhoto || apiDisplayPhotos.length > 0) {
      return coverPhoto ? [coverPhoto, ...apiDisplayPhotos] : apiDisplayPhotos;
    }
    const allPhotos = [...photos, ...(route?.route_photos || [])];
    const cover = allPhotos.find((p: any) => p.is_cover);
    const display = allPhotos.filter((p: any) => p.is_display && !p.is_cover);
    return cover ? [cover, ...display] : display;
  }, [coverPhoto, apiDisplayPhotos, photos, route]);

  const activeHazards = hazards.filter((h) => h.status === "active");
  const activeWarnings = warnings.filter((w) => w.status === "active");

  // ===================== EARLY RETURNS =====================

  if (!route && !loading) return null;
  if (!open) return null;

  // ===================== RENDER =====================

  const drawerContent = (
    <div>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : reviewStep !== null ? (
        <RouteReviewFlow
          routeId={routeId!}
          route={route}
          userId={userId}
          routeCompletions={routeCompletions}
          activeWarnings={activeWarnings}
          userHasCompletion={userHasCompletion}
          onComplete={() => setReviewStep(null)}
          onCompletionsRefresh={fetchCompletions}
          onVoteClearWarning={handleVoteClearWarning}
        />
      ) : activeFullPanel === "discussion" ? (
        <RouteDiscussionPanel
          routeId={routeId!}
          comments={comments}
          onCommentsChange={setComments}
          onBack={() => setActiveFullPanel(null)}
        />
      ) : activeFullPanel === "waypoints" ? (
        <RouteWaypointsPanel
          fullWaypointList={fullWaypointList}
          waypointElevationMap={waypointElevationMap}
          onBack={() => setActiveFullPanel(null)}
          onFlyToLocation={onFlyToLocation}
          onDismiss={onDismiss}
          initialExpandedId={initialWaypointId || undefined}
        />
      ) : route ? (
        <div>
          {/* PHOTO HERO */}
          <div className="relative group">
            <div
              className={cn(
                "relative overflow-hidden",
                displayPhotosForCarousel.length > 0
                  ? "h-64 md:h-72 cursor-pointer"
                  : "h-48 md:h-56"
              )}
              onClick={displayPhotosForCarousel.length > 0 ? () => setLightboxOpen(true) : undefined}
            >
              {displayPhotosForCarousel.length > 0 ? (
                displayPhotosForCarousel.map((photo: any, idx: number) => (
                  <div
                    key={photo.id || idx}
                    className={cn(
                      "absolute inset-0 transition-opacity duration-300",
                      idx === currentPhotoIndex ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                  >
                    <Image src={photo.url} alt={photo.caption || `Route photo ${idx + 1}`} fill className="object-cover" />
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-green-50 to-green-100">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 text-green-300 mx-auto" />
                    <p className="text-sm text-green-400 mt-2">No photos yet</p>
                  </div>
                </div>
              )}

              {/* Bottom gradient */}
              {displayPhotosForCarousel.length > 0 && (
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              )}

              {/* Like button overlay */}
              <button
                onClick={(e) => { e.stopPropagation(); handleLike(); }}
                className={cn(
                  "absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg",
                  liked
                    ? "bg-red-500 text-white"
                    : "bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
                )}
              >
                <Heart className={cn("h-5 w-5", liked && "fill-current")} />
              </button>

              {/* Likes count */}
              {likesCount > 0 && (
                <span className="absolute bottom-5 right-14 z-10 text-white text-sm font-medium drop-shadow-lg">
                  {likesCount}
                </span>
              )}

              {/* Photo count badge */}
              {displayPhotosForCarousel.length > 0 && (
                <div className="absolute bottom-3 left-3 z-10 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3" />
                  {currentPhotoIndex + 1} / {displayPhotosForCarousel.length}
                </div>
              )}

              {/* Terrain tags on photo */}
              {displayPhotosForCarousel.length > 0 && (route.terrain_tags?.length > 0 || route.surface) && (
                <div className="absolute bottom-14 left-3 z-10 flex flex-wrap gap-1.5 max-w-[70%]">
                  {route.terrain_tags?.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white font-medium">
                      {tag}
                    </span>
                  ))}
                  {route.surface && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white font-medium">
                      {route.surface}
                    </span>
                  )}
                </div>
              )}

              {/* Prev/Next arrows */}
              {displayPhotosForCarousel.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : displayPhotosForCarousel.length - 1)); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex((prev) => (prev < displayPhotosForCarousel.length - 1 ? prev + 1 : 0)); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-700" />
                  </button>
                </>
              )}

              {/* Dot indicators */}
              {displayPhotosForCarousel.length > 1 && displayPhotosForCarousel.length <= 8 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {displayPhotosForCarousel.map((_: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(idx); }}
                      className={cn("h-2 rounded-full transition-all", idx === currentPhotoIndex ? "bg-white w-4" : "bg-white/50 w-2")}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* AUTHOR + META */}
            {route?.owner && (
              <Link href={`/profile/${route.owner.id}`} className="flex items-center gap-3 group">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={route.owner.avatar_url || undefined} />
                  <AvatarFallback className="text-sm bg-green-100 text-green-800">
                    {route.owner.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                    {route.owner.name}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {(route.updated_at || route.created_at) && (
                      <span>{formatDistanceToNow(new Date(route.updated_at || route.created_at), { addSuffix: true })}</span>
                    )}
                    {locationName && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {locationName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            )}

            {/* TITLE + BADGES */}
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{route.title}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {route.featured && <Badge className="text-xs bg-amber-500">Featured</Badge>}
                {isOwner && <Badge variant="outline" className="text-xs">Your Route</Badge>}
                {activeHazards.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="gap-1 text-xs cursor-pointer"
                    onClick={() => {
                      if (onEnterViewMode) onEnterViewMode("hazards");
                      else document.getElementById("hazards-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {activeHazards.length} Hazard{activeHazards.length > 1 ? "s" : ""}
                  </Badge>
                )}
                {activeWarnings.length > 0 && (
                  <Badge
                    className="gap-1 text-xs bg-amber-500 cursor-pointer"
                    onClick={() => document.getElementById("active-warnings")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {activeWarnings.length} Warning{activeWarnings.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>

            {/* DIFFICULTY + TIMES RIDDEN */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className={cn("text-sm px-3 py-1", getDifficultyInfo(route.difficulty).color)}>
                {getDifficultyInfo(route.difficulty).label}
              </Badge>
              {(route.completions_count > 0) && (
                <span className="text-sm text-gray-500">
                  🐴 {route.completions_count} {route.completions_count === 1 ? "person has" : "people have"} ridden this
                </span>
              )}
            </div>

            {/* DESCRIPTION */}
            {route.description && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className={cn("text-sm text-slate-600", !showFullDescription && "line-clamp-3")}>
                  {route.description}
                </p>
                {route.description.length > 150 && (
                  <button onClick={() => setShowFullDescription(!showFullDescription)} className="text-xs text-green-600 hover:text-green-700 font-medium mt-1">
                    {showFullDescription ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            )}

            {/* STATS */}
            <div className="grid grid-cols-4 gap-2 py-3 border-y bg-slate-50/50 rounded-lg px-2">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{Number(route.distance_km || 0).toFixed(1)}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Distance (km)</p>
              </div>
              <div className="text-center border-l border-slate-200">
                <p className="text-lg font-bold text-slate-900">
                  {route.distance_km
                    ? (() => { const mins = Math.floor((Number(route.distance_km) / 8) * 60); return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ""}` : `${mins}m`; })()
                    : "—"}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">🐴 Ride</p>
              </div>
              <div className="text-center border-l border-slate-200">
                <p className="text-lg font-bold text-slate-900">
                  {elevationData?.totalAscent ? `${elevationData.totalAscent}` : route.elevation_gain ? `${Math.round(route.elevation_gain)}` : loadingElevation ? "..." : "—"}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Ascent (m)</p>
              </div>
              <div className="text-center border-l border-slate-200">
                <p className="text-lg font-bold text-slate-900">
                  {elevationData?.totalDescent ? `${elevationData.totalDescent}` : route.elevation_loss ? `${Math.round(route.elevation_loss)}` : loadingElevation ? "..." : "—"}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Descent (m)</p>
              </div>
            </div>

            {/* ELEVATION PROFILE */}
            {elevationData && elevationData.elevations.length > 1 && (
              <ElevationProfile
                className="mt-3"
                elevations={elevationData.elevations}
                distances={elevationData.distances}
                totalAscent={elevationData.totalAscent}
                totalDescent={elevationData.totalDescent}
                distanceKm={Number(route.distance_km || 0)}
              />
            )}

            {/* ROUTE MAP SNAPSHOT */}
            {(() => {
              const geo = route.geometry || route.route_geometry;
              const snapshotUrl = getMapboxThumbnailUrl(geo, { width: 600, height: 200, routeColor: "166534", routeWeight: 3 });
              return snapshotUrl ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-100 border">
                  <img src={snapshotUrl} alt="Route map" className="w-full h-full object-cover" />
                </div>
              ) : null;
            })()}

            {/* WEATHER */}
            <RouteWeatherSection weatherData={weatherData} loading={loadingWeather} />

            {/* I'VE RIDDEN THIS ROUTE! */}
            {userId && !isOwner && (
              <Button
                onClick={() => setReviewStep(1)}
                variant={userHasCompletion ? "outline" : "default"}
                className={cn(
                  "w-full rounded-xl h-12 font-semibold text-base shadow-sm",
                  userHasCompletion
                    ? "border-green-600 text-green-700 hover:bg-green-50"
                    : "bg-green-600 hover:bg-green-700 text-white"
                )}
              >
                {userHasCompletion ? "✏️ Update my review" : "🐴 I've ridden this route!"}
              </Button>
            )}

            {/* Terrain Tags (fallback when no photos — tags shown on photo hero otherwise) */}
            {displayPhotosForCarousel.length === 0 && (route.terrain_tags?.length > 0 || route.surface) && (
              <div className="flex flex-wrap gap-2">
                {route.terrain_tags?.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
                {route.surface && <Badge variant="outline" className="text-xs">{route.surface}</Badge>}
              </div>
            )}

            {/* Secondary Actions */}
            <div className="flex items-center justify-around py-2 border rounded-lg bg-slate-50">
              <button onClick={handleDownloadGPX} className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Download className="h-5 w-5 text-slate-600" />
                <span className="text-xs text-slate-500">Export GPX</span>
              </button>
              <button onClick={handleShare} className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Share2 className="h-5 w-5 text-slate-600" />
                <span className="text-xs text-slate-500">Share</span>
              </button>
              {(isOwner || isAdmin) && onEditRoute && (
                <button onClick={() => onEditRoute(routeId!, route)} className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Pencil className="h-5 w-5 text-slate-600" />
                  <span className="text-xs text-slate-500">Copy & Edit</span>
                </button>
              )}
              <button onClick={() => setReportDialogOpen(true)} className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Flag className="h-5 w-5 text-slate-600" />
                <span className="text-xs text-slate-500">Report</span>
              </button>
            </div>

            <Separator />

            {/* NEARBY STAYS */}
            {nearbyProperties.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Nearby Stays
                  <Badge variant="secondary" className="text-xs">{nearbyProperties.length}</Badge>
                </h3>
                <ScrollArea className="w-full" type="scroll">
                  <div className="flex gap-3 pb-2">
                    {nearbyProperties.map((property) => (
                      <div key={property.id} className="flex-shrink-0 w-64">
                        <NearbyPropertyCard property={property} onShowOnMap={onShowPropertyOnMap} />
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* DISCUSSION PREVIEW */}
            <div
              className="border rounded-lg p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setActiveFullPanel("discussion")}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Discussion
                </h3>
                <Badge variant="outline" className="text-xs">
                  {comments.length} {comments.length === 1 ? "comment" : "comments"}
                </Badge>
              </div>
              {comments.length > 0 ? (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={comments[0]?.user?.avatar_url} />
                    <AvatarFallback className="text-xs">{comments[0]?.user?.name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{comments[0]?.user?.name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{comments[0]?.content}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Be the first to start the discussion!</p>
              )}
            </div>

            {/* ACTIVE WARNINGS */}
            {activeWarnings.length > 0 && (
              <div id="active-warnings" className="space-y-2">
                {(showAllWarnings ? activeWarnings : activeWarnings.slice(0, 1)).map((warning: any) => (
                  <div key={warning.id} className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <span className="font-medium text-sm text-amber-900 truncate">
                          {WARNING_TYPES.find((t) => t.value === warning.hazard_type)?.label || warning.hazard_type}
                        </span>
                      </div>
                      {warning.expires_at && (
                        <span className="text-xs text-amber-600 whitespace-nowrap ml-2">{getTimeRemaining(warning.expires_at)}</span>
                      )}
                    </div>
                    {warning.description && <p className="text-xs text-amber-700 mt-1">{warning.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-amber-500">
                        Reported {formatDistanceToNow(new Date(warning.created_at), { addSuffix: true })}
                      </span>
                      <div className="flex items-center gap-2">
                        {warning.clear_votes_needed && (
                          <span className="text-xs text-amber-600">{warning.clear_votes_count || 0}/{warning.clear_votes_needed} say cleared</span>
                        )}
                        {userId && (
                          userVotedWarnings.has(warning.id) || warning.user_has_voted ? (
                            <Badge className="h-6 text-xs bg-green-100 text-green-700 border border-green-300 hover:bg-green-100">Voted</Badge>
                          ) : (
                            <Button variant="outline" size="sm" className="h-6 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 px-2" onClick={() => handleVoteClearWarning(warning.id)}>
                              Cleared?
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {activeWarnings.length > 1 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs text-amber-700 hover:text-amber-800" onClick={() => setShowAllWarnings(!showAllWarnings)}>
                    {showAllWarnings ? "Show less" : `Show ${activeWarnings.length - 1} more warning${activeWarnings.length - 1 > 1 ? "s" : ""}`}
                  </Button>
                )}
              </div>
            )}

            {/* WAYPOINTS, HAZARDS & WARNINGS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div
                className="border rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => onEnterViewMode ? onEnterViewMode("waypoints") : setActiveFullPanel("waypoints")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm flex items-center gap-2"><MapPin className="h-4 w-4" />Waypoints</span>
                  <Badge variant="outline" className="text-xs">{fullWaypointList.length}</Badge>
                </div>
                {fullWaypointList.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Start</span>
                    {waypoints.length > 0 && <span>→ {waypoints.length} point{waypoints.length > 1 ? "s" : ""}</span>}
                    <span className="inline-flex items-center gap-0.5">→ <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Finish</span>
                  </div>
                )}
              </div>
              <div
                id="hazards-section"
                className="border rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors relative"
                onClick={() => {
                  if (onEnterViewMode && activeHazards.length > 0) onEnterViewMode("hazards");
                  else if (onPlaceHazard) onPlaceHazard();
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Hazards</span>
                  <div className="flex items-center gap-1.5">
                    {activeHazards.length > 0 && <Badge variant="destructive" className="text-xs">{activeHazards.length}</Badge>}
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-red-50" onClick={(e) => { e.stopPropagation(); onPlaceHazard?.(); }}>+ Report</Badge>
                  </div>
                </div>
              </div>
              <div
                className="border rounded-lg p-3 cursor-pointer hover:bg-amber-50 transition-colors relative"
                onClick={() => setWarningDialogOpen(true)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Warnings</span>
                  {activeWarnings.length > 0 ? (
                    <Badge className="text-xs bg-amber-500">{activeWarnings.length}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Post</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* RIDER REVIEWS */}
            <RouteReviewCards
              routeCompletions={routeCompletions}
              showAllReviews={showAllReviews}
              onShowAllReviews={setShowAllReviews}
            />

            {/* Safety Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900">
                ⚠️ Always respect land access rules, closures, and local regulations. Check conditions before setting out.
              </p>
            </div>

            {/* DIALOGS */}
            <HazardReportDialog
              open={hazardDialogOpen}
              onOpenChange={setHazardDialogOpen}
              routeId={routeId!}
              route={route}
              isAdmin={isAdmin}
              isOwner={isOwner}
              userId={userId}
              onHazardAdded={(hazard) => setHazards((prev) => [hazard, ...prev])}
            />

            <WarningPostDialog
              open={warningDialogOpen}
              onOpenChange={setWarningDialogOpen}
              routeId={routeId!}
              userId={userId}
              onWarningAdded={(warning) => setWarnings((prev) => [warning, ...prev])}
            />
          </div>
        </div>
      ) : null}

      {/* Report Route Dialog */}
      <ReportCommentDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        routeId={routeId!}
        commentId={null}
        userId={userId}
      />
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn("fixed inset-0 z-40 transition-all duration-300", "bg-black/40 backdrop-blur-sm")}
        onClick={onDismiss || onClose}
      />

      {/* Centered Modal Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-100 relative",
            "w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden",
            "animate-in zoom-in-95 slide-in-from-bottom-4 fade-in duration-300",
            "md:max-h-[80vh]",
          )}
        >
          {/* Floating close button (always visible over scroll content) */}
          <button
            onClick={onDismiss || onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
            {drawerContent}
          </div>

          {/* Bottom Action Bar — Save + Navigate (only on main route view) */}
          {!loading && reviewStep === null && activeFullPanel === null && route && (
            <div className="shrink-0 border-t bg-white px-5 py-3 flex items-center justify-between gap-3">
              <Button
                variant={favorited ? "default" : "outline"}
                size="sm"
                onClick={handleFavorite}
                className={cn(
                  "gap-1.5 rounded-full",
                  favorited && "bg-green-600 hover:bg-green-700"
                )}
              >
                <Bookmark className={cn("h-4 w-4", favorited && "fill-current")} />
                {favorited ? "Saved" : "Save"}
              </Button>
              <Button
                size="sm"
                disabled
                className="gap-1.5 rounded-full bg-green-600 text-white opacity-50 cursor-not-allowed"
              >
                <Navigation className="h-4 w-4" />
                Navigate
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      <PhotoLightbox
        open={lightboxOpen}
        photos={displayPhotosForCarousel}
        currentIndex={currentPhotoIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setCurrentPhotoIndex}
      />
    </>
  );
}
