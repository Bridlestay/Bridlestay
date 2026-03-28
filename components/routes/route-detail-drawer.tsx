"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DeleteRouteDialog } from "@/components/routes/confirm-dialog";
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
  Trash2,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Navigation,
  TrendingUp,
  Plus,
  Cloud,
  MoreHorizontal,
  Shuffle,
  Check,
} from "lucide-react";
import {
  getRouteCentroid,
  weatherCacheKey,
  type WeatherData,
} from "@/lib/weather";
import { cache, CACHE_TTL } from "@/lib/cache";
import { NearbyPropertyCard } from "./nearby-property-card";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  getDifficultyInfo,
  HAZARD_TYPES,
  SEVERITY_COLORS,
  WARNING_TYPES,
  getTimeRemaining,
} from "./route-detail-constants";

// Sub-components
import { PhotoLightbox } from "./route-photo-lightbox";
import { RouteDiscussionPanel } from "./route-discussion-panel";
import { RouteWaypointsPanel } from "./route-waypoints-panel";
import {
  HazardReportDialog,
  WarningPostDialog,
  ReportCommentDialog,
} from "./route-hazard-dialogs";
import { RouteReviewFlow } from "./route-review-flow";
import { RoutePhotoGallery } from "./route-photo-gallery";
import { ElevationProfile } from "./elevation-profile";
import { RouteWeatherSection } from "./route-weather-section";
import { WaypointTimeline } from "./waypoint-timeline";
import { AddWaypointDialog } from "./add-waypoint-dialog";
import { EditWaypointView } from "./edit-waypoint-view";
import { SuggestEditWaypointDialog } from "./suggest-edit-waypoint-dialog";
import { getRouteThumbnailUrlAuto } from "@/lib/routes/route-thumbnail";

// --- Main Component ---

interface RouteDetailDrawerProps {
  routeId: string | null;
  open: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  onShowPropertyOnMap?: (propertyId: string, lat: number, lng: number) => void;
  onEditRoute?: (routeId: string, routeData: any) => void;
  onDeleteRoute?: (routeId: string) => void;
  onFlyToLocation?: (lat: number, lng: number) => void;
  initialWaypointId?: string | null;
  onWaypointFocused?: () => void;
  onEnterViewMode?: (mode: "waypoints" | "hazards") => void;
  onHazardsLoaded?: (hazards: any[]) => void;
  onHazardResolved?: (hazardId: string) => void;
  onPlaceHazard?: () => void;
  onPlaceWaypoint?: () => void;
  waypointPlacementCoords?: { lat: number; lng: number } | null;
  initialCommentId?: string | null;
  onCommentFocused?: () => void;
  onViewVariantRoute?: (routeId: string) => void;
  onForkVariant?: (routeId: string, routeData: any) => void;
  initialInfoTab?: "elevation" | "waypoints" | "hazards" | "warnings" | "variants" | "weather" | "nearby-stays" | null;
  onInitialInfoTabConsumed?: () => void;
  onStartNavigation?: (routeId: string, routeData: any) => void;
}

export function RouteDetailDrawer({
  routeId,
  open,
  onClose,
  onDismiss,
  onShowPropertyOnMap,
  onEditRoute,
  onDeleteRoute,
  onFlyToLocation,
  initialWaypointId,
  onWaypointFocused,
  onEnterViewMode,
  onHazardsLoaded,
  onHazardResolved,
  onPlaceHazard,
  onPlaceWaypoint,
  waypointPlacementCoords,
  initialCommentId,
  onCommentFocused,
  onViewVariantRoute,
  onForkVariant,
  initialInfoTab,
  onInitialInfoTabConsumed,
  onStartNavigation,
}: RouteDetailDrawerProps) {
  // --- Route data ---
  const [route, setRoute] = useState<any>(null);
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [coverPhoto, setCoverPhoto] = useState<any>(null);
  const [apiDisplayPhotos, setApiDisplayPhotos] = useState<any[]>([]);
  const [userPhotos, setUserPhotos] = useState<any[]>([]);

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
  const [activeFullPanel, setActiveFullPanel] = useState<"discussion" | "reviews" | "waypoints" | "photos" | null>(null);
  const [activeInfoTab, setActiveInfoTab] = useState<"elevation" | "waypoints" | "hazards" | "warnings" | "variants" | "weather">("elevation");

  // --- Photo carousel ---
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);

  // --- Dialogs ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // --- Review flow ---
  const [reviewStep, setReviewStep] = useState<number | null>(null);
  const [routeCompletions, setRouteCompletions] = useState<any[]>([]);

  // --- Ride tally ---
  const [rideStatus, setRideStatus] = useState<{
    hasRidden: boolean;
    rideCount: number;
    canRideAgain: boolean;
    cooldownEndsAt: string | null;
    hasReview: boolean;
  } | null>(null);
  const [rideCooldownText, setRideCooldownText] = useState("");

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

  // --- Variants ---
  const [variants, setVariants] = useState<any[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [parentRoute, setParentRoute] = useState<{ id: string; title: string } | null>(null);

  // --- Dialogs ---
  const [hazardDialogOpen, setHazardDialogOpen] = useState(false);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [addWaypointDialogOpen, setAddWaypointDialogOpen] = useState(false);
  const [editingWaypointId, setEditingWaypointId] = useState<string | null>(null);
  const [suggestEditDialogOpen, setSuggestEditDialogOpen] = useState(false);
  const [waypointToSuggestEdit, setWaypointToSuggestEdit] = useState<any>(null);

  const supabase = createClient();

  // Watch for waypoint placement coordinates and open dialog
  useEffect(() => {
    if (waypointPlacementCoords && isOwner) {
      setAddWaypointDialogOpen(true);
    }
  }, [waypointPlacementCoords, isOwner]);

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
        setCommentsLoaded(false);
        const res = await fetch(`/api/routes/${routeId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      } finally {
        setCommentsLoaded(true);
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
          setUserPhotos(data.userPhotos || []);
        }
      } catch (error) {
        console.error("Failed to fetch photos:", error);
      }
    };

    const fetchVariants = async () => {
      setLoadingVariants(true);
      try {
        const res = await fetch(`/api/routes/${routeId}/variants`);
        if (res.ok) {
          const data = await res.json();
          setVariants(data.variants || []);
        }
      } catch (error) {
        console.error("Failed to fetch variants:", error);
      } finally {
        setLoadingVariants(false);
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
    fetchRideStatus();
    fetchVariants();
  }, [routeId, open, userId]);

  // Fetch parent route name if this is a variant
  useEffect(() => {
    if (!route?.variant_of_id) {
      setParentRoute(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/routes/${route.variant_of_id}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled && data?.route) {
          setParentRoute({ id: data.route.id, title: data.route.title || "Untitled Route" });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [route?.variant_of_id]);

  useEffect(() => {
    if (routeId && open && route && !loadingWaypoints) {
      fetchElevation();
    }
  }, [routeId, open, route, loadingWaypoints]);

  useEffect(() => {
    if (initialWaypointId) {
      // Stay on main route card — scroll to the inline waypoint timeline
      setActiveFullPanel(null);
      onWaypointFocused?.();
      setTimeout(() => {
        const el = document.getElementById(`waypoint-timeline-${initialWaypointId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // Brief highlight
          el.classList.add("ring-2", "ring-green-500", "ring-offset-1", "rounded-lg");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-green-500", "ring-offset-1", "rounded-lg");
          }, 1500);
        }
      }, 300);
    }
  }, [initialWaypointId]);

  // Auto-open discussion panel when deep-linked to a comment
  useEffect(() => {
    if (!initialCommentId || !commentsLoaded) return;

    setActiveFullPanel("discussion");
    onCommentFocused?.();

    // Check if the comment still exists
    const commentExists = comments.some(
      (c: any) => c.id === initialCommentId
    );
    if (!commentExists) {
      toast.info("This comment has been deleted or removed.");
      return;
    }
    setTimeout(() => {
      const el = document.getElementById(`comment-${initialCommentId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("bg-green-50");
        setTimeout(() => el.classList.remove("bg-green-50"), 3000);
      }
    }, 300);
  }, [initialCommentId, commentsLoaded]);

  useEffect(() => {
    if (route && userId) {
      setIsOwner(route.owner_user_id === userId);
    }
  }, [route, userId]);

  // Handle initialInfoTab from mini card section clicks
  useEffect(() => {
    if (!initialInfoTab || !open || !route) return;
    if (initialInfoTab === "nearby-stays") {
      // Scroll to nearby stays section after render
      setTimeout(() => {
        document.getElementById("nearby-stays-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 400);
    } else {
      setActiveInfoTab(initialInfoTab);
      // Scroll to the tabs section so it's visible
      setTimeout(() => {
        document.getElementById("info-tabs-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 400);
    }
    onInitialInfoTabConsumed?.();
  }, [initialInfoTab, open, route]);

  // Cooldown countdown timer — ticks every second for live feel
  useEffect(() => {
    if (!rideStatus?.cooldownEndsAt) {
      setRideCooldownText("");
      return;
    }
    const updateCooldown = () => {
      const end = new Date(rideStatus.cooldownEndsAt!).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setRideCooldownText("");
        setRideStatus((prev) =>
          prev ? { ...prev, canRideAgain: true, cooldownEndsAt: null } : prev
        );
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      if (hours > 0) {
        setRideCooldownText(`${hours}h ${mins}m ${secs}s`);
      } else if (mins > 0) {
        setRideCooldownText(`${mins}m ${secs}s`);
      } else {
        setRideCooldownText(`${secs}s`);
      }
    };
    updateCooldown();
    const timer = setInterval(updateCooldown, 1000);
    return () => clearInterval(timer);
  }, [rideStatus?.cooldownEndsAt]);

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

  const fetchRideStatus = async () => {
    if (!routeId || !userId) return;
    try {
      const res = await fetch(`/api/routes/${routeId}/ride`);
      if (res.ok) {
        const data = await res.json();
        setRideStatus(data);
      }
    } catch {
      // Non-critical
    }
  };

  const handleLogRide = async () => {
    if (!routeId || !userId) return;

    // First ride and no review yet → open review form
    if (!rideStatus?.hasRidden) {
      if (isOwner) {
        // Owners skip review, just log the ride
        try {
          const res = await fetch(`/api/routes/${routeId}/ride`, {
            method: "POST",
          });
          if (res.ok) {
            const data = await res.json();
            toast.success(data.message);
            fetchRideStatus();
            fetchCompletions();
          }
        } catch {
          toast.error("Failed to log ride");
        }
      } else {
        // Non-owners get review form on first ride
        setReviewStep(1);
      }
      return;
    }

    // Already ridden — log another ride (tally)
    try {
      const res = await fetch(`/api/routes/${routeId}/ride`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchRideStatus();
        fetchCompletions();
      } else if (res.status === 429) {
        const data = await res.json();
        toast.error("Cooldown active — try again later");
        setRideStatus((prev) =>
          prev ? { ...prev, canRideAgain: false, cooldownEndsAt: data.cooldownEndsAt } : prev
        );
      }
    } catch {
      toast.error("Failed to log ride");
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
      } else {
        console.error("[ELEVATION] Failed to fetch:", res.status, await res.text().catch(() => ""));
      }
    } catch (error) {
      console.error("[ELEVATION] Fetch error:", error);
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

  const handleSetCoverPhoto = async (photoId: string) => {
    try {
      const res = await fetch(`/api/routes/${routeId}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, is_cover: true }),
      });
      if (res.ok) {
        const photosRes = await fetch(`/api/routes/${routeId}/photos`);
        if (photosRes.ok) {
          const data = await photosRes.json();
          setPhotos(data.photos || []);
          setCoverPhoto(data.coverPhoto || null);
          setApiDisplayPhotos(data.displayPhotos || []);
          setUserPhotos(data.userPhotos || []);
        }
        toast.success("Cover photo updated");
      } else {
        toast.error("Failed to set cover photo");
      }
    } catch {
      toast.error("Failed to set cover photo");
    }
  };

  // ===================== COMPUTED VALUES =====================

  const fullWaypointList = useMemo(() => {
    const geo = route?.geometry || route?.route_geometry;
    const coords = geo?.coordinates || [];
    // Deduplicate waypoints by id, then sort by order_index
    const seen = new Set<string>();
    const deduped = (waypoints || []).filter((wp: any) => {
      if (!wp.id || seen.has(wp.id)) return false;
      seen.add(wp.id);
      return true;
    });
    const sorted = [...deduped].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
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

  // Collect all waypoint photos (primary + community) into a flat array
  const waypointPhotos = useMemo(() => {
    const wpPhotos: any[] = [];
    for (const wp of waypoints) {
      if (wp.photo_url) {
        wpPhotos.push({
          id: `wp-primary-${wp.id}`,
          url: wp.photo_url,
          caption: wp.name || null,
          source: "waypoint" as const,
        });
      }
      for (const p of wp.photos || []) {
        wpPhotos.push({
          id: p.id,
          url: p.url,
          caption: p.caption || wp.name || null,
          created_at: p.created_at,
          source: "waypoint" as const,
        });
      }
    }
    return wpPhotos;
  }, [waypoints]);

  const displayPhotosForCarousel = useMemo(() => {
    let routeDisplayPhotos: any[];
    if (coverPhoto || apiDisplayPhotos.length > 0) {
      routeDisplayPhotos = coverPhoto
        ? [coverPhoto, ...apiDisplayPhotos]
        : apiDisplayPhotos;
    } else {
      const allRoutePhotos = [...photos, ...(route?.route_photos || [])];
      const cover = allRoutePhotos.find((p: any) => p.is_cover);
      const display = allRoutePhotos.filter(
        (p: any) => p.is_display && !p.is_cover
      );
      routeDisplayPhotos = cover ? [cover, ...display] : display;
    }
    // Non-display route photos (not already in routeDisplayPhotos)
    const displayIds = new Set(routeDisplayPhotos.map((p: any) => p.id));
    const remainingRoutePhotos = (photos || []).filter(
      (p: any) => !displayIds.has(p.id)
    );
    // Community / review photos (from route_user_photos)
    const communityForCarousel = (userPhotos || []).map((p: any) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      source: "community" as const,
    }));
    // Append all: display photos → remaining route photos → community → waypoint
    return [
      ...routeDisplayPhotos,
      ...remainingRoutePhotos,
      ...communityForCarousel,
      ...waypointPhotos,
    ];
  }, [coverPhoto, apiDisplayPhotos, photos, route, userPhotos, waypointPhotos]);

  const allPhotosForGallery = useMemo(() => {
    const ownerPhotos = (photos || []).map((p: any) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      created_at: p.created_at,
      source: "owner" as const,
      user_id: p.uploaded_by_user_id,
      user_name: p.uploader?.name || null,
      user_avatar: p.uploader?.avatar_url || null,
      is_cover: p.is_cover,
    }));
    const communityPhotos = (userPhotos || []).map((p: any) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      created_at: p.uploaded_at || p.created_at,
      source: "community" as const,
      user_id: p.user_id || p.uploaded_by_user_id,
      user_name: p.user?.name || null,
      user_avatar: p.user?.avatar_url || null,
    }));
    const wpPhotos = waypointPhotos.map((p: any) => ({
      ...p,
      source: "waypoint" as const,
    }));
    return [...ownerPhotos, ...communityPhotos, ...wpPhotos].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );
  }, [photos, userPhotos, waypointPhotos]);

  const totalPhotoCount =
    (photos?.length || 0) +
    (userPhotos?.length || 0) +
    waypointPhotos.length;

  // Auto-scroll photo carousel (pauses 6s on user interaction)
  const autoScrollPaused = useRef(false);
  const pauseTimeout = useRef<ReturnType<typeof setTimeout>>();

  const pauseAutoScroll = useCallback(() => {
    autoScrollPaused.current = true;
    clearTimeout(pauseTimeout.current);
    pauseTimeout.current = setTimeout(() => {
      autoScrollPaused.current = false;
    }, 6000);
  }, []);

  useEffect(() => {
    if (displayPhotosForCarousel.length <= 1) return;
    const interval = setInterval(() => {
      if (autoScrollPaused.current) return;
      setCurrentPhotoIndex((prev) =>
        prev < displayPhotosForCarousel.length - 1 ? prev + 1 : 0
      );
    }, 6000);
    return () => {
      clearInterval(interval);
      clearTimeout(pauseTimeout.current);
    };
  }, [displayPhotosForCarousel.length]);

  const activeHazards = hazards.filter((h) => h.status === "active");
  const activeWarnings = warnings.filter((w) => w.status === "active");

  // Compute hazard positions on the elevation chart
  const hazardsWithDistance = useMemo(() => {
    const geo = route?.geometry || route?.route_geometry;
    const coords = geo?.coordinates || [];
    if (coords.length === 0 || !elevationData) return [];

    return activeHazards
      .filter((h: any) => h.lat && h.lng)
      .map((hazard: any) => {
        let minDist = Infinity;
        let nearestIdx = 0;
        for (let i = 0; i < coords.length; i++) {
          const d = Math.abs(coords[i][1] - hazard.lat) + Math.abs(coords[i][0] - hazard.lng);
          if (d < minDist) { minDist = d; nearestIdx = i; }
        }

        let dist = 0;
        for (let i = 1; i <= nearestIdx && i < coords.length; i++) {
          const R = 6371;
          const dLat = ((coords[i][1] - coords[i - 1][1]) * Math.PI) / 180;
          const dLng = ((coords[i][0] - coords[i - 1][0]) * Math.PI) / 180;
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos((coords[i - 1][1] * Math.PI) / 180) *
            Math.cos((coords[i][1] * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
          dist += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        let elevation: number | undefined;
        if (elevationData.distances.length > 0) {
          let bestIdx = 0;
          let bestDiff = Math.abs(elevationData.distances[0] - dist);
          for (let i = 1; i < elevationData.distances.length; i++) {
            const diff = Math.abs(elevationData.distances[i] - dist);
            if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
          }
          elevation = elevationData.elevations[bestIdx];
        }

        return { type: hazard.hazard_type, distanceFromStart: dist, elevation };
      });
  }, [route, activeHazards, elevationData]);

  // Chart marker click → scroll to timeline entry
  const handleChartWaypointClick = (index: number) => {
    const waypointEntries = fullWaypointList.filter(
      (wp: any) => waypointElevationMap[wp.id] !== undefined || wp.type === "start" || wp.type === "finish"
    );
    const wp = waypointEntries[index];
    if (wp) {
      const el = document.getElementById(`waypoint-timeline-${wp.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Edit waypoint (owner only)
  const handleEditWaypoint = (waypoint: any) => {
    setEditingWaypointId(waypoint.id);
  };

  // Suggest edit (guests only)
  const handleSuggestEdit = (waypoint: any) => {
    setWaypointToSuggestEdit(waypoint);
    setSuggestEditDialogOpen(true);
  };

  // Waypoint updated callback
  const handleWaypointUpdated = (waypointId: string, updates: any) => {
    // Update the waypoint in the local state
    setWaypoints((prev) =>
      prev.map((wp) => (wp.id === waypointId ? { ...wp, ...updates } : wp))
    );
  };

  // Exit edit mode
  const handleExitEdit = () => {
    setEditingWaypointId(null);
  };

  // Get waypoint being edited
  const editingWaypoint = editingWaypointId
    ? waypoints.find((wp) => wp.id === editingWaypointId)
    : null;

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
      ) : editingWaypoint ? (
        <EditWaypointView
          waypoint={editingWaypoint}
          routeId={routeId!}
          onBack={handleExitEdit}
          onWaypointUpdated={handleWaypointUpdated}
        />
      ) : reviewStep !== null ? (
        <RouteReviewFlow
          routeId={routeId!}
          route={route}
          userId={userId}
          routeCompletions={routeCompletions}
          activeWarnings={activeWarnings}
          userHasCompletion={userHasCompletion}
          onComplete={() => { setReviewStep(null); fetchRideStatus(); }}
          onCompletionsRefresh={fetchCompletions}
          onVoteClearWarning={handleVoteClearWarning}
        />
      ) : activeFullPanel === "discussion" ? (
        <RouteDiscussionPanel
          routeId={routeId!}
          comments={comments}
          onCommentsChange={setComments}
          onBack={() => setActiveFullPanel(null)}
          userId={userId}
          isAdmin={isAdmin}
        />
      ) : activeFullPanel === "waypoints" ? (
        <RouteWaypointsPanel
          routeId={routeId!}
          fullWaypointList={fullWaypointList}
          waypointElevationMap={waypointElevationMap}
          onBack={() => setActiveFullPanel(null)}
          onFlyToLocation={onFlyToLocation}
          onDismiss={onDismiss}
          initialExpandedId={initialWaypointId || undefined}
          userId={userId}
          isOwner={isOwner}
          isAdmin={isAdmin}
          routeOwnerId={route?.owner_user_id}
          routeGeometry={route?.geometry || route?.route_geometry}
          onWaypointAdded={(wp) => setWaypoints((prev) => [...prev, wp])}
          onWaypointUpdated={(id, updates) =>
            setWaypoints((prev) =>
              prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
            )
          }
        />
      ) : activeFullPanel === "photos" ? (
        <RoutePhotoGallery
          photos={allPhotosForGallery}
          isOwner={isOwner}
          coverPhotoId={coverPhoto?.id || null}
          onBack={() => setActiveFullPanel(null)}
          onSetCover={handleSetCoverPhoto}
          onOpenLightbox={(index) => {
            setCurrentPhotoIndex(index);
            setLightboxOpen(true);
          }}
        />
      ) : route ? (
        <div>
          {/* ==================== PHOTO HERO ==================== */}
          <div className="relative group">
            <div
              className={cn(
                "relative overflow-hidden",
                displayPhotosForCarousel.length > 0
                  ? "h-64 md:h-72 cursor-pointer"
                  : "h-48 md:h-56"
              )}
              onClick={displayPhotosForCarousel.length > 0 ? () => { pauseAutoScroll(); setLightboxOpen(true); } : undefined}
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

              {/* Close button — top-left */}
              <button
                onClick={(e) => { e.stopPropagation(); (onDismiss || onClose)(); }}
                className="absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>

              {/* Share + Like + More — top-right */}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 flex items-center justify-center transition-all shadow-lg"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleDownloadGPX}>
                      <Download className="h-4 w-4 mr-2" />
                      Export GPX
                    </DropdownMenuItem>
                    {(isOwner || isAdmin) && onEditRoute && (
                      <DropdownMenuItem onClick={() => onEditRoute(routeId!, route)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Your Route
                      </DropdownMenuItem>
                    )}
                    {!isOwner && !isAdmin && onForkVariant && route && (
                      <DropdownMenuItem onClick={() => onForkVariant(routeId!, route)}>
                        <Shuffle className="h-4 w-4 mr-2" />
                        Create Variant
                      </DropdownMenuItem>
                    )}
                    {(isOwner || isAdmin) && onDeleteRoute && (
                      <DropdownMenuItem
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                      <Flag className="h-4 w-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  onClick={(e) => { e.stopPropagation(); handleShare(); }}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 flex items-center justify-center transition-all shadow-lg"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleLike(); }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg",
                    liked
                      ? "bg-red-500 text-white"
                      : "bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
                  )}
                >
                  <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                </button>
                {likesCount > 0 && (
                  <span className="text-white text-xs font-medium drop-shadow-lg -ml-1">
                    {likesCount}
                  </span>
                )}
              </div>

              {/* Photo count badge */}
              {totalPhotoCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFullPanel("photos");
                  }}
                  className="absolute bottom-5 left-3 z-10 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 hover:bg-black/70 transition-colors"
                >
                  <ImageIcon className="h-3 w-3" />
                  See all {totalPhotoCount}
                </button>
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
                    onClick={(e) => { e.stopPropagation(); pauseAutoScroll(); setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : displayPhotosForCarousel.length - 1)); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); pauseAutoScroll(); setCurrentPhotoIndex((prev) => (prev < displayPhotosForCarousel.length - 1 ? prev + 1 : 0)); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-700" />
                  </button>
                </>
              )}

              {/* Sliding dot indicators */}
              {displayPhotosForCarousel.length > 1 && (
                <SlidingDots
                  total={displayPhotosForCarousel.length}
                  current={currentPhotoIndex}
                  onDotClick={(idx) => { pauseAutoScroll(); setCurrentPhotoIndex(idx); }}
                />
              )}
            </div>
          </div>

          {/* ==================== CONTENT AREA ==================== */}
          <div className="relative z-10 bg-white rounded-t-2xl -mt-4">
            <div className="p-4 pt-6 space-y-4">
              {/* AUTHOR + META */}
              {route?.owner && (
                <div className="flex gap-3">
                  <Link href={`/profile/${route.owner.id}`} className="flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={route.owner.avatar_url || undefined} />
                      <AvatarFallback className="text-sm bg-green-100 text-green-800">
                        {route.owner.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${route.owner.id}`} className="group">
                      <span className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                        {route.owner.name}
                      </span>
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {(route.updated_at || route.created_at) && (
                        <span>{formatDistanceToNow(new Date(route.updated_at || route.created_at), { addSuffix: true })}</span>
                      )}
                      {locationName && (
                        <>
                          <span>&middot;</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {locationName}
                          </span>
                        </>
                      )}
                      {nearbyProperties.length > 0 && (
                        <>
                          <span>&middot;</span>
                          <button
                            onClick={() => {
                              document.getElementById("nearby-stays-section")?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }}
                            className="flex items-center gap-1 hover:text-green-700 transition-colors"
                          >
                            <Home className="h-3 w-3" />
                            <span>{nearbyProperties.length} {nearbyProperties.length === 1 ? "stay" : "stays"} nearby</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TITLE + BADGES */}
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{route.title}</h1>
                {parentRoute && (
                  <button
                    onClick={() => onViewVariantRoute?.(parentRoute.id)}
                    className="text-sm text-gray-400 hover:text-green-600 transition-colors mt-0.5 text-left"
                  >
                    Variant of <span className="underline">{parentRoute.title}</span>
                  </button>
                )}
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
                <Badge variant="outline" className={cn("text-xs px-2 py-0.5", getDifficultyInfo(route.difficulty).color)}>
                  {getDifficultyInfo(route.difficulty).label}
                </Badge>
                {(route.completions_count > 0) && (
                  <span className="text-sm text-gray-500">
                    {route.completions_count} {route.completions_count === 1 ? "rider has" : "riders have"} completed this
                  </span>
                )}
              </div>

              {/* DESCRIPTION — plain text */}
              {route.description && (
                <div>
                  <p className={cn(
                    "text-sm text-slate-600 leading-relaxed",
                    !showFullDescription && "line-clamp-3"
                  )}>
                    {route.description}
                  </p>
                  {route.description.length > 150 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-sm text-green-600 hover:text-green-700 font-medium mt-1"
                    >
                      {showFullDescription ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              )}

              {/* STATS — 2x2 Komoot-style grid */}
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {Number(route.distance_km || 0).toFixed(1)}
                    <span className="text-sm font-normal text-slate-500 ml-1">km</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Distance</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {route.distance_km
                      ? (() => {
                          const mins = Math.floor((Number(route.distance_km) / 8) * 60);
                          return mins >= 60
                            ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ""}`
                            : `${mins}m`;
                        })()
                      : "---"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Est. Ride Time</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {elevationData?.totalAscent
                      ? `${elevationData.totalAscent}`
                      : route.elevation_gain_m
                        ? `${Math.round(route.elevation_gain_m)}`
                        : loadingElevation ? "..." : "---"}
                    <span className="text-sm font-normal text-slate-500 ml-1">m</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Ascent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {elevationData?.totalDescent
                      ? `${elevationData.totalDescent}`
                      : route.elevation_loss_m
                        ? `${Math.round(route.elevation_loss_m)}`
                        : loadingElevation ? "..." : "---"}
                    <span className="text-sm font-normal text-slate-500 ml-1">m</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Descent</p>
                </div>
              </div>

              <Separator />

              {/* DISCUSSION — minimal Komoot-style social bar */}
              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setActiveFullPanel("discussion")}
              >
                {/* Overlapping avatars */}
                <div className="flex -space-x-2 flex-shrink-0">
                  {comments.slice(0, 3).map((comment: any, i: number) => (
                    <Avatar key={comment.id || i} className="h-8 w-8 border-2 border-white">
                      <AvatarImage src={comment.user?.avatar_url} />
                      <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600">
                        {comment.user?.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {comments.length === 0 && (
                    <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                      <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Counts */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-sm text-slate-500">
                    {comments.length} {comments.length === 1 ? "comment" : "comments"}
                  </span>
                </div>

                {/* Comment button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-green-600 hover:text-green-700 gap-1 h-8"
                  onClick={(e) => { e.stopPropagation(); setActiveFullPanel("discussion"); }}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Comment
                </Button>
              </div>

              {/* ===== TABBED INFO SECTION ===== */}
              <Separator />

              {/* Tab header bar */}
              <div id="info-tabs-section" className="flex justify-center border-b overflow-x-auto scrollbar-hidden -mx-4 px-4">
                {([
                  { key: "elevation", label: "Elevation" },
                  { key: "waypoints", label: "Waypoints", count: waypoints.length },
                  { key: "hazards", label: "Hazards", count: activeHazards.length },
                  { key: "warnings", label: "Warnings", count: activeWarnings.length },
                  { key: "variants", label: "Variants", count: variants.length },
                  { key: "weather", label: "Weather" },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveInfoTab(tab.key)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                      activeInfoTab === tab.key
                        ? "border-green-600 text-green-700"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                  >
                    {tab.label}
                    {"count" in tab && tab.count > 0 && (
                      <span className={cn(
                        "text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1",
                        activeInfoTab === tab.key
                          ? tab.key === "hazards" ? "bg-red-100 text-red-700" : tab.key === "warnings" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                          : tab.key === "hazards" ? "bg-red-100 text-red-600" : tab.key === "warnings" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content area */}
              <div className="min-h-[200px]">
                {/* ELEVATION tab — clean chart, no markers */}
                {activeInfoTab === "elevation" && (
                  <div className="space-y-2">
                    {loadingElevation ? (
                      <Skeleton className="h-56 w-full rounded-lg" />
                    ) : elevationData && elevationData.elevations.length > 1 ? (
                      <ElevationProfile
                        className="h-56"
                        elevations={elevationData.elevations}
                        distances={elevationData.distances}
                        totalAscent={elevationData.totalAscent}
                        totalDescent={elevationData.totalDescent}
                        distanceKm={Number(route?.distance_km || 0)}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-56 bg-slate-50 rounded-lg border text-sm text-muted-foreground">
                        No elevation data available
                      </div>
                    )}
                  </div>
                )}

                {/* WAYPOINTS tab — floating markers on chart */}
                {activeInfoTab === "waypoints" && (
                  <div>
                    {loadingElevation ? (
                      <Skeleton className="h-56 w-full rounded-lg" />
                    ) : elevationData && elevationData.elevations.length > 1 ? (
                      <ElevationProfile
                        className="h-56"
                        markerStyle="floating"
                        elevations={elevationData.elevations}
                        distances={elevationData.distances}
                        totalAscent={elevationData.totalAscent}
                        totalDescent={elevationData.totalDescent}
                        distanceKm={Number(route?.distance_km || 0)}
                        waypointItems={fullWaypointList
                          .filter((wp: any) =>
                            waypointElevationMap[wp.id] !== undefined ||
                            wp.type === "start" || wp.type === "finish"
                          )
                          .map((wp: any) => ({
                            id: wp.id,
                            name: wp.name || "Waypoint",
                            distanceFromStart: wp._distFromStart || 0,
                            elevation: waypointElevationMap[wp.id] ??
                              (wp.type === "start" ? elevationData.elevations[0] :
                               wp.type === "finish" ? elevationData.elevations[elevationData.elevations.length - 1] : undefined),
                            type: wp.type,
                            listIndex: wp.listIndex,
                          }))}
                        onWaypointClick={handleChartWaypointClick}
                      />
                    ) : null}
                  </div>
                )}

                {/* HAZARDS tab — floating hazard markers on chart + list */}
                {activeInfoTab === "hazards" && (
                  <div id="hazards-section" className="space-y-3">
                    {loadingElevation ? (
                      <Skeleton className="h-56 w-full rounded-lg" />
                    ) : elevationData && elevationData.elevations.length > 1 ? (
                      <ElevationProfile
                        className="h-56"
                        markerStyle="floating"
                        elevations={elevationData.elevations}
                        distances={elevationData.distances}
                        totalAscent={elevationData.totalAscent}
                        totalDescent={elevationData.totalDescent}
                        distanceKm={Number(route?.distance_km || 0)}
                        hazardItems={hazardsWithDistance.map((h: any, i: number) => ({
                          id: `hazard-${i}`,
                          type: h.type,
                          distanceFromStart: h.distanceFromStart,
                          elevation: h.elevation,
                        }))}
                        onHazardClick={(index) => {
                          document.getElementById(`hazard-card-${index}`)?.scrollIntoView({
                            behavior: "smooth", block: "center"
                          });
                        }}
                      />
                    ) : null}

                    {activeHazards.length > 0 ? (
                      <div className="space-y-2">
                        {activeHazards.map((hazard: any, hIdx: number) => (
                          <div key={hazard.id} id={`hazard-card-${hIdx}`} className={`p-3.5 rounded-xl border ${SEVERITY_COLORS[hazard.severity] || SEVERITY_COLORS.medium} transition-colors`}>
                            <div className="flex items-start gap-2.5">
                              <div className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5">
                                <svg viewBox="0 0 20 20" className="w-full h-full">
                                  <path d="M10 2L1 18h18L10 2z" fill="currentColor" opacity="0.15" />
                                  <path d="M10 2L1 18h18L10 2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                  <text x="10" y="15" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="bold">!</text>
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-semibold text-sm text-slate-800">
                                    {HAZARD_TYPES.find((t) => t.value === hazard.hazard_type)?.label || hazard.hazard_type}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px] capitalize font-medium bg-slate-100/80 text-slate-600 border-0">{hazard.severity}</Badge>
                                </div>
                                {hazard.description && <p className="text-xs mt-1.5 text-slate-600 leading-relaxed">{hazard.description}</p>}
                                <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                                  {formatDistanceToNow(new Date(hazard.created_at), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {onEnterViewMode && (
                          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onEnterViewMode("hazards")}>
                            View on map <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No active hazards reported</p>
                    )}
                    {onPlaceHazard && (
                      <Button variant="outline" size="sm" className="w-full text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 py-2.5 transition-colors" onClick={onPlaceHazard}>
                        <Plus className="h-4 w-4 mr-1.5" /> Report a hazard
                      </Button>
                    )}
                  </div>
                )}

                {/* WARNINGS tab — replaces chart with warnings content */}
                {activeInfoTab === "warnings" && (
                  <div id="active-warnings" className="space-y-2">
                    {activeWarnings.length > 0 ? (
                      <>
                        {(showAllWarnings ? activeWarnings : activeWarnings.slice(0, 3)).map((warning: any) => (
                          <div key={warning.id} className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                <span className="font-medium text-sm text-amber-900 truncate">
                                  {WARNING_TYPES.find((t) => t.value === warning.hazard_type)?.label || warning.hazard_type}
                                </span>
                              </div>
                              {warning.expires_at && (
                                <span className="text-xs text-amber-600 whitespace-nowrap ml-2">
                                  {getTimeRemaining(warning.expires_at)}
                                </span>
                              )}
                            </div>
                            {warning.description && <p className="text-xs text-amber-700 mt-1">{warning.description}</p>}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-amber-500">
                                Reported {formatDistanceToNow(new Date(warning.created_at), { addSuffix: true })}
                              </span>
                              <div className="flex items-center gap-2">
                                {warning.clear_votes_needed && (
                                  <span className="text-xs text-amber-600">
                                    {warning.clear_votes_count || 0}/{warning.clear_votes_needed} say cleared
                                  </span>
                                )}
                                {userId && (
                                  userVotedWarnings.has(warning.id) || warning.user_has_voted ? (
                                    <Badge className="h-6 text-xs bg-green-100 text-green-700 border border-green-300 hover:bg-green-100">
                                      Voted
                                    </Badge>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 px-2"
                                      onClick={() => handleVoteClearWarning(warning.id)}
                                    >
                                      Cleared?
                                    </Button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {activeWarnings.length > 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-amber-700 hover:text-amber-800"
                            onClick={() => setShowAllWarnings(!showAllWarnings)}
                          >
                            {showAllWarnings ? "Show less" : `Show ${activeWarnings.length - 3} more warning${activeWarnings.length - 3 > 1 ? "s" : ""}`}
                          </Button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No active warnings</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 py-2.5 transition-colors"
                      onClick={() => setWarningDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> Post a warning
                    </Button>
                  </div>
                )}

                {/* VARIANTS tab */}
                {activeInfoTab === "variants" && (
                  <div className="space-y-3">
                    {onForkVariant && route && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-sm border border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 py-2.5 transition-colors"
                        onClick={() => onForkVariant(routeId!, route)}
                      >
                        <Pencil className="h-4 w-4 mr-1.5" /> Create Route Variant
                      </Button>
                    )}
                    {loadingVariants ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full" />
                      </div>
                    ) : (variants.length > 0 || parentRoute) ? (
                      <>
                        <p className="text-xs text-slate-500">
                          {route?.variant_of_id
                            ? `Original route and ${variants.filter((v: any) => v.id !== route?.variant_of_id).length} other variant${variants.filter((v: any) => v.id !== route?.variant_of_id).length !== 1 ? "s" : ""}`
                            : `${variants.length} variant${variants.length !== 1 ? "s" : ""} of this route with different paths`
                          }
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                          {/* Show parent/original route card first if this is a variant */}
                          {parentRoute && (() => {
                            const parentVariant = variants.find((v: any) => v.id === parentRoute.id);
                            if (!parentVariant) return null;
                            const thumbUrl = getRouteThumbnailUrlAuto(parentVariant.geometry, {
                              width: 400, height: 200, routeColor: "166534", routeWeight: 4,
                            });
                            const rideTimeMins = parentVariant.distance_km
                              ? Math.round((Number(parentVariant.distance_km) / 8) * 60) : 0;
                            const rideTimeStr = rideTimeMins >= 60
                              ? `${Math.floor(rideTimeMins / 60)}h ${rideTimeMins % 60 > 0 ? `${rideTimeMins % 60}m` : ""}` : `${rideTimeMins}m`;
                            return (
                              <div
                                key={parentVariant.id}
                                className="rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer bg-white border-2 border-green-400 ring-1 ring-green-200"
                                onClick={() => onViewVariantRoute?.(parentVariant.id)}
                              >
                                <div className="relative h-28">
                                  {thumbUrl ? (
                                    <img src={thumbUrl} alt={parentVariant.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
                                      <ImageIcon className="h-8 w-8 text-green-300" />
                                    </div>
                                  )}
                                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                                  <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-green-700/90 backdrop-blur-sm text-white font-semibold flex items-center gap-1">
                                    Original
                                  </span>
                                  <span className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 font-medium shadow-sm">
                                    {Number(parentVariant.distance_km || 0).toFixed(1)} km
                                  </span>
                                  {parentVariant.similarity_score > 0 && (
                                    <span className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-green-600/80 backdrop-blur-sm text-white font-medium">
                                      {Math.round(parentVariant.similarity_score)}% similar
                                    </span>
                                  )}
                                </div>
                                <div className="p-3">
                                  <h4 className="font-bold text-sm leading-tight text-gray-900 line-clamp-1">
                                    {parentVariant.title || "Untitled Route"}
                                  </h4>
                                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                                    <span>{Number(parentVariant.distance_km || 0).toFixed(1)} km</span>
                                    <span>{rideTimeStr}</span>
                                    {parentVariant.owner?.name && (
                                      <span className="truncate">by {parentVariant.owner.name}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          {/* Other variant cards (exclude the parent if shown above) */}
                          {variants
                            .filter((v: any) => !(parentRoute && v.id === parentRoute.id))
                            .map((v: any) => {
                            const thumbUrl = getRouteThumbnailUrlAuto(v.geometry, {
                              width: 400,
                              height: 200,
                              routeColor: "3B82F6",
                              routeWeight: 4,
                            });
                            const rideTimeMins = v.distance_km
                              ? Math.round((Number(v.distance_km) / 8) * 60)
                              : 0;
                            const rideTimeStr =
                              rideTimeMins >= 60
                                ? `${Math.floor(rideTimeMins / 60)}h ${rideTimeMins % 60 > 0 ? `${rideTimeMins % 60}m` : ""}`
                                : `${rideTimeMins}m`;
                            const isOriginal = !v.variant_of_id;
                            return (
                              <div
                                key={v.id}
                                className={cn(
                                  "rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer bg-white",
                                  isOriginal ? "border-2 border-green-400 ring-1 ring-green-200" : "border border-gray-100"
                                )}
                                onClick={() => onViewVariantRoute?.(v.id)}
                              >
                                <div className="relative h-28">
                                  {thumbUrl ? (
                                    <img
                                      src={thumbUrl}
                                      alt={v.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
                                      <ImageIcon className="h-8 w-8 text-green-300" />
                                    </div>
                                  )}
                                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                                  <span className={cn(
                                    "absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm text-white font-semibold flex items-center gap-1",
                                    isOriginal ? "bg-green-700/90" : "bg-green-600/80 font-medium"
                                  )}>
                                    {isOriginal ? "Original" : <><Shuffle className="h-3 w-3" /> Variant</>}
                                  </span>
                                  <span className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 font-medium shadow-sm">
                                    {Number(v.distance_km || 0).toFixed(1)} km
                                  </span>
                                  {v.similarity_score > 0 && (
                                    <span className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-green-600/80 backdrop-blur-sm text-white font-medium">
                                      {Math.round(v.similarity_score)}% similar
                                    </span>
                                  )}
                                </div>
                                <div className="p-3">
                                  <h4 className="font-bold text-sm leading-tight text-gray-900 line-clamp-1">
                                    {v.title || "Untitled Route"}
                                  </h4>
                                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                                    <span>{Number(v.distance_km || 0).toFixed(1)} km</span>
                                    <span>{rideTimeStr}</span>
                                    {v.owner?.name && (
                                      <span className="truncate">by {v.owner.name}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Shuffle className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">No variants yet</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Similar routes will appear here as variants
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* WEATHER tab — replaces chart with weather content */}
                {activeInfoTab === "weather" && (
                  <div>
                    <RouteWeatherSection weatherData={weatherData} loading={loadingWeather} />
                  </div>
                )}
              </div>

              {/* PERMANENT WAYPOINT TIMELINE — always visible below tabs */}
              {fullWaypointList.length > 2 && (
                <>
                  <Separator />
                  <WaypointTimeline
                    fullWaypointList={fullWaypointList}
                    waypointElevationMap={waypointElevationMap}
                    onFlyToLocation={onFlyToLocation}
                    onOpenFullPanel={() =>
                      onEnterViewMode
                        ? onEnterViewMode("waypoints")
                        : setActiveFullPanel("waypoints")
                    }
                    onDismiss={onDismiss}
                    onToggleWaypoints={onWaypointFocused}
                    isOwner={isOwner}
                    onEditWaypoint={handleEditWaypoint}
                    onSuggestEdit={handleSuggestEdit}
                    initialExpandedWaypointId={initialWaypointId}
                  />
                </>
              )}

              {/* "I've ridden this route" button moved to bottom bar */}

              {/* Terrain Tags (fallback when no photos — tags shown on photo hero otherwise) */}
              {displayPhotosForCarousel.length === 0 && (route.terrain_tags?.length > 0 || route.surface) && (
                <div className="flex flex-wrap gap-2">
                  {route.terrain_tags?.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                  {route.surface && <Badge variant="outline" className="text-xs">{route.surface}</Badge>}
                </div>
              )}

              {/* NEARBY STAYS */}
              <div id="nearby-stays-section" className="space-y-3">
                <Separator />
                <h3 className="font-semibold flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Nearby Stays
                  {nearbyProperties.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{nearbyProperties.length}</Badge>
                  )}
                </h3>
                {nearbyProperties.length > 0 ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground">No nearby stays found for this route</p>
                )}
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

              {/* Add Waypoint Dialog (Owner Only) */}
              {isOwner && waypointPlacementCoords && (
                <AddWaypointDialog
                  open={addWaypointDialogOpen}
                  onOpenChange={setAddWaypointDialogOpen}
                  routeId={routeId!}
                  lat={waypointPlacementCoords.lat}
                  lng={waypointPlacementCoords.lng}
                  onWaypointAdded={(waypoint) => {
                    setWaypoints((prev) => [...prev, waypoint]);
                    setAddWaypointDialogOpen(false);
                    toast.success("Waypoint added successfully!");
                  }}
                />
              )}

              {/* Suggest Edit Dialog (Guests Only) */}
              {waypointToSuggestEdit && (
                <SuggestEditWaypointDialog
                  open={suggestEditDialogOpen}
                  onOpenChange={setSuggestEditDialogOpen}
                  waypoint={waypointToSuggestEdit}
                  routeId={routeId || undefined}
                />
              )}
            </div>
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

      {/* Delete route confirmation dialog */}
      {onDeleteRoute && (
        <DeleteRouteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={() => onDeleteRoute(routeId!)}
          routeName={route?.title}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Backdrop (desktop only — mobile is full-screen) */}
      <div
        className={cn("fixed inset-0 z-40 transition-all duration-300", "hidden md:block bg-black/40 backdrop-blur-sm")}
        onClick={onDismiss || onClose}
      />

      {/* Centered Modal Card (desktop) / Full-screen sheet (mobile) */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto bg-white shadow-2xl relative flex flex-col overflow-hidden",
            // Mobile: full-screen sheet from bottom
            "w-full h-[100dvh] rounded-none",
            "animate-in slide-in-from-bottom fade-in duration-300",
            // Desktop: centered card
            "md:rounded-2xl md:max-w-2xl md:max-h-[80vh] md:h-auto",
            "md:animate-in md:zoom-in-95 md:slide-in-from-bottom-4 md:fade-in md:duration-300",
          )}
        >
          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
            {drawerContent}
          </div>

          {/* Bottom Action Bar — Save + Ridden + Navigate (only on main route view) */}
          {!loading && reviewStep === null && activeFullPanel === null && !editingWaypointId && route && (
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

              {/* Ridden button — center */}
              {userId && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          size="sm"
                          onClick={handleLogRide}
                          disabled={rideStatus?.hasRidden && !rideStatus?.canRideAgain}
                          variant={
                            !rideStatus?.hasRidden
                              ? "default"
                              : rideStatus?.canRideAgain
                                ? "outline"
                                : "ghost"
                          }
                          className={cn(
                            "gap-1.5 rounded-full text-xs",
                            !rideStatus?.hasRidden
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : rideStatus?.canRideAgain
                                ? "border-green-600 text-green-700 hover:bg-green-50"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          )}
                        >
                          <Check className="h-4 w-4" />
                          Ridden
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {rideStatus?.hasRidden && !rideStatus?.canRideAgain && rideCooldownText && (
                      <TooltipContent side="top">
                        <p>Can&apos;t ride again for {rideCooldownText}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Navigate — mobile only (GPS navigation doesn't work on desktop) */}
              <Button
                size="sm"
                onClick={() => onStartNavigation?.(routeId!, route)}
                disabled={!onStartNavigation}
                className={cn(
                  "gap-1.5 rounded-full md:hidden",
                  onStartNavigation
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-green-600 text-white opacity-50 cursor-not-allowed"
                )}
              >
                <Navigation className="h-4 w-4" />
                Navigate
              </Button>
            </div>
          )}

          {/* Edit Waypoint Action Bar */}
          {editingWaypointId && editingWaypoint && (
            <div className="shrink-0 border-t bg-white px-5 py-3 flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExitEdit}
                className="flex-1 rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-waypoint-form"
                size="sm"
                className="flex-1 rounded-full bg-green-600 hover:bg-green-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      <PhotoLightbox
        open={lightboxOpen}
        photos={activeFullPanel === "photos" ? allPhotosForGallery : displayPhotosForCarousel}
        currentIndex={currentPhotoIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setCurrentPhotoIndex}
      />
    </>
  );
}

/* ─── Sliding dot indicator (Instagram-style) ─────────── */
function SlidingDots({
  total,
  current,
  onDotClick,
}: {
  total: number;
  current: number;
  onDotClick: (idx: number) => void;
}) {
  // For 5 or fewer, show all dots normally
  const maxVisible = 5;

  if (total <= maxVisible) {
    return (
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        {Array.from({ length: total }).map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              onDotClick(idx);
            }}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              idx === current
                ? "bg-white w-4"
                : "bg-white/50 w-2"
            )}
          />
        ))}
      </div>
    );
  }

  // Sliding window: always show 5 dots, centered on current
  // The window slides so current is in the middle when possible
  const half = Math.floor(maxVisible / 2);
  let start = current - half;
  if (start < 0) start = 0;
  if (start > total - maxVisible) start = total - maxVisible;

  const visibleIndices = Array.from(
    { length: maxVisible },
    (_, i) => start + i
  );

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
      {visibleIndices.map((idx) => {
        const distance = Math.abs(idx - current);
        // Active dot is wide + bright, adjacent are normal, edge dots shrink
        const isActive = idx === current;
        const isEdge =
          (idx === visibleIndices[0] && start > 0) ||
          (idx === visibleIndices[maxVisible - 1] &&
            start < total - maxVisible);

        return (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              onDotClick(idx);
            }}
            className={cn(
              "rounded-full transition-all duration-300",
              isActive
                ? "bg-white w-4 h-2"
                : isEdge
                  ? "bg-white/30 w-1.5 h-1.5"
                  : distance === 1
                    ? "bg-white/60 w-2 h-2"
                    : "bg-white/40 w-2 h-2"
            )}
          />
        );
      })}
    </div>
  );
}
