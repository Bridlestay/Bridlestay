"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
// Modal-based layout - no longer uses panel header or mobile toggle
import {
  Star,
  MapPin,
  Download,
  Share2,
  Flag,
  Home,
  Heart,
  Bookmark,
  AlertTriangle,
  MessageCircle,
  Send,
  Plus,
  Trash2,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WaypointCard } from "./waypoint-card";
import { NearbyPropertyCard } from "./nearby-property-card";
import { RouteCompletion } from "./route-completion";
import { WaypointMapPicker } from "./waypoint-map-picker";
import { calculateDistanceKm } from "@/lib/routes/distance-calculator";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { getMapboxThumbnailUrl } from "@/lib/routes/route-thumbnail";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface RouteDetailDrawerProps {
  routeId: string | null;
  open: boolean;
  onClose: () => void;
  onDismiss?: () => void; // Close modal but keep route on map + restore quick card
  onShowPropertyOnMap?: (propertyId: string, lat: number, lng: number) => void;
  onEditRoute?: (routeId: string, routeData: any) => void;
  // Mobile panel control
  mobileShowDetails?: boolean;
  onMobileToggleDetails?: (show: boolean) => void;
}

const HAZARD_TYPES = [
  { value: "tree_fall", label: "Fallen Tree" },
  { value: "flooding", label: "Flooding" },
  { value: "erosion", label: "Path Erosion" },
  { value: "livestock", label: "Livestock Warning" },
  { value: "closure", label: "Path Closed" },
  { value: "poor_visibility", label: "Poor Visibility" },
  { value: "ice_snow", label: "Ice/Snow" },
  { value: "overgrown", label: "Overgrown Path" },
  { value: "damaged_path", label: "Damaged Surface" },
  { value: "dangerous_crossing", label: "Dangerous Crossing" },
  { value: "other", label: "Other" },
];

const SEVERITY_COLORS = {
  low: "bg-blue-100 text-blue-800 border-blue-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  critical: "bg-red-100 text-red-800 border-red-300",
};

const REVIEW_TAGS = [
  { id: "muddy_after_rain", label: "Muddy after rain", emoji: "🌧️" },
  { id: "road_crossings", label: "Road crossings", emoji: "🚗" },
  { id: "steady_horses", label: "Suitable for steady horses", emoji: "🐴" },
  { id: "experienced_horses", label: "Better for experienced horses", emoji: "⚡" },
  { id: "water_available", label: "Water available for horses", emoji: "💧" },
  { id: "group_friendly", label: "Group friendly", emoji: "👥" },
  { id: "parking_available", label: "Parking available", emoji: "🅿️" },
  { id: "good_waymarking", label: "Good waymarking", emoji: "🪧" },
  { id: "stunning_views", label: "Stunning views", emoji: "🏞️" },
  { id: "gates_to_open", label: "Gates to open", emoji: "🚪" },
  { id: "steep_sections", label: "Steep sections", emoji: "⛰️" },
  { id: "good_surface", label: "Good surface throughout", emoji: "✅" },
];

// Photo Card Component
function PhotoCard({
  photo,
  routeId,
  isOwnerOrAdmin,
  onUpdate,
  onDelete,
  showActions = false,
}: {
  photo: any;
  routeId: string;
  isOwnerOrAdmin: boolean;
  onUpdate: () => void;
  onDelete: () => void;
  showActions?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const handleSetCover = async () => {
    try {
      const res = await fetch(`/api/routes/${routeId}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: photo.id, is_cover: true }),
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        // Check if migration is needed
        if (data.requiresMigration) {
          toast.error("Migration required: Run 057_route_photos_categorization.sql in Supabase SQL Editor");
        } else {
          toast.error(data.error || "Failed to set cover");
        }
        return;
      }
      
      onUpdate();
      toast.success("Set as cover photo");
    } catch (error) {
      console.error("Set cover error:", error);
      toast.error("Failed to update");
    }
  };

  const handleToggleDisplay = async () => {
    try {
      const res = await fetch(`/api/routes/${routeId}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: photo.id, is_display: !photo.is_display }),
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        // Check if migration is needed
        if (data.requiresMigration) {
          toast.error("Migration required: Run 057_route_photos_categorization.sql in Supabase SQL Editor");
        } else {
          toast.error(data.error || "Failed to update display");
        }
        return;
      }
      
      onUpdate();
      toast.success(photo.is_display ? "Removed from display" : "Added to display");
    } catch (error) {
      console.error("Toggle display error:", error);
      toast.error("Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this photo?")) return;
    try {
      const res = await fetch(`/api/routes/${routeId}/photos/${photo.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDelete();
        toast.success("Photo deleted");
      }
    } catch {
      toast.error("Failed to delete photo");
    }
  };

  return (
    <div className="relative h-36 rounded-lg overflow-hidden group">
      <Image
        src={photo.url}
        alt={photo.caption || "Route photo"}
        fill
        className="object-cover"
      />
      
      {/* Badges */}
      <div className="absolute top-1 left-1 flex gap-1">
        {photo.is_cover && (
          <Badge className="text-[10px] h-5 bg-amber-500">Cover</Badge>
        )}
        {photo.is_display && !photo.is_cover && (
          <Badge className="text-[10px] h-5 bg-blue-500">Display</Badge>
        )}
      </div>

      {/* Uploader info */}
      {photo.uploader && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <div className="flex items-center gap-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={photo.uploader.avatar_url} />
              <AvatarFallback className="text-[8px]">
                {photo.uploader.name?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-white text-xs truncate">{photo.uploader.name}</span>
          </div>
        </div>
      )}

      {/* Actions for owner/admin */}
      {isOwnerOrAdmin && showActions && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="secondary" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!photo.is_cover && (
                <DropdownMenuItem onClick={handleSetCover}>
                  <Star className="h-4 w-4 mr-2" />
                  Set as Cover
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleToggleDisplay}>
                <ImageIcon className="h-4 w-4 mr-2" />
                {photo.is_display ? "Remove from Display" : "Add to Display"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export function RouteDetailDrawer({
  routeId,
  open,
  onClose,
  onDismiss,
  onShowPropertyOnMap,
  onEditRoute,
  mobileShowDetails = true,
  onMobileToggleDetails,
}: RouteDetailDrawerProps) {
  const [route, setRoute] = useState<any>(null);
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [coverPhoto, setCoverPhoto] = useState<any>(null);
  const [apiDisplayPhotos, setApiDisplayPhotos] = useState<any[]>([]);
  const [authorPhotos, setAuthorPhotos] = useState<any[]>([]);
  const [userPhotos, setUserPhotos] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingWaypoints, setLoadingWaypoints] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loadingHazards, setLoadingHazards] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  
  const [userId, setUserId] = useState<string | undefined>();
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [favorited, setFavorited] = useState(false);
  
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  // For nested replies: { parentCommentId, replyToId, replyToName }
  const [replyingTo, setReplyingTo] = useState<{ parentCommentId: string; replyToId?: string; replyToName?: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [discussionExpanded, setDiscussionExpanded] = useState(false);
  
  // Full panel view states (for Discussion, Reviews, Waypoints)
  const [activeFullPanel, setActiveFullPanel] = useState<"discussion" | "reviews" | "waypoints" | null>(null);
  
  // Photo carousel state
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  // Review flow state
  const [reviewStep, setReviewStep] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [reviewShortNote, setReviewShortNote] = useState("");
  const [reviewLongNote, setReviewLongNote] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  
  const [deleteHazardDialogOpen, setDeleteHazardDialogOpen] = useState(false);
  const [hazardToDelete, setHazardToDelete] = useState<any>(null);
  
  const [hazardDialogOpen, setHazardDialogOpen] = useState(false);
  const [newHazard, setNewHazard] = useState({
    hazard_type: "",
    title: "",
    description: "",
    severity: "medium",
  });
  const [submittingHazard, setSubmittingHazard] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "checking" | "near" | "far" | "error">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [waypointDialogOpen, setWaypointDialogOpen] = useState(false);
  const [newWaypoint, setNewWaypoint] = useState({
    name: "",
    description: "",
    icon_type: "other",
  });
  const [waypointLocation, setWaypointLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submittingWaypoint, setSubmittingWaypoint] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
      
      // Check if admin
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
          console.log("[RouteDetailDrawer] Route data received:", data.route?.id, "geometry:", data.route?.geometry ? "present" : "missing");
          if (data.route?.geometry) {
            console.log("[RouteDetailDrawer] Geometry type:", typeof data.route.geometry, data.route.geometry?.type);
          }
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
      setLoadingProperties(true);
      try {
        const res = await fetch(`/api/routes/${routeId}/nearby-properties`);
        if (res.ok) {
          const data = await res.json();
          setNearbyProperties(data.properties || []);
        }
      } catch (error) {
        console.error("Failed to fetch nearby properties:", error);
      } finally {
        setLoadingProperties(false);
      }
    };

    const fetchHazards = async () => {
      setLoadingHazards(true);
      try {
        const res = await fetch(`/api/routes/${routeId}/hazards`);
        if (res.ok) {
          const data = await res.json();
          setHazards(data.hazards || []);
        }
      } catch (error) {
        console.error("Failed to fetch hazards:", error);
      } finally {
        setLoadingHazards(false);
      }
    };

    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/routes/${routeId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      } finally {
        setLoadingComments(false);
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
          setAuthorPhotos(data.authorPhotos || []);
          setUserPhotos(data.userPhotos || []);
        }
      } catch (error) {
        console.error("Failed to fetch photos:", error);
      }
    };

    fetchRoute();
    fetchWaypoints();
    fetchNearbyProperties();
    fetchHazards();
    fetchComments();
    fetchLikeStatus();
    fetchFavoriteStatus();
    fetchPhotos();
  }, [routeId, open, userId]);

  // Update isOwner when userId changes
  useEffect(() => {
    if (route && userId) {
      setIsOwner(route.owner_user_id === userId);
    }
  }, [route, userId]);

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
        
        // Record the share/download
        fetch(`/api/routes/${routeId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ share_method: "gpx_download" }),
        });
        
        toast.success("GPX file downloaded!");
      }
    } catch (error) {
      toast.error("Failed to download GPX");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/routes?routeId=${routeId}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: route?.title,
          text: route?.description,
          url,
        });
        // Record share
        fetch(`/api/routes/${routeId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ share_method: "social" }),
        });
      } else {
        await navigator.clipboard.writeText(url);
        // Record share
        fetch(`/api/routes/${routeId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ share_method: "link" }),
        });
    toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      // User cancelled share - that's fine
    }
  };

  const handleLike = async () => {
    if (!userId) {
      toast.error("Please sign in to like routes");
      return;
    }

    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((prev) => prev + (newLiked ? 1 : -1));

    try {
      const res = await fetch(`/api/routes/${routeId}/like`, {
        method: newLiked ? "POST" : "DELETE",
      });
      
      if (!res.ok) {
        // Revert on error
        setLiked(!newLiked);
        setLikesCount((prev) => prev + (newLiked ? -1 : 1));
        toast.error("Failed to update like");
      }
    } catch (error) {
      setLiked(!newLiked);
      setLikesCount((prev) => prev + (newLiked ? -1 : 1));
      toast.error("Failed to update like");
    }
  };

  const handleFavorite = async () => {
    if (!userId) {
      toast.error("Please sign in to save routes");
      return;
    }

    const newFavorited = !favorited;
    setFavorited(newFavorited);

    try {
      const res = await fetch(`/api/routes/${routeId}/favorite`, {
        method: newFavorited ? "POST" : "DELETE",
      });
      
      if (!res.ok) {
        setFavorited(!newFavorited);
        toast.error("Failed to update favorites");
      } else {
        toast.success(newFavorited ? "Saved to favorites!" : "Removed from favorites");
      }
    } catch (error) {
      setFavorited(!newFavorited);
      toast.error("Failed to update favorites");
    }
  };

  const handleSubmitComment = async () => {
    if (!userId) {
      toast.error("Please sign in to comment");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/routes/${routeId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [data.comment, ...prev]);
        setNewComment("");
        toast.success("Comment posted!");
      } else {
        toast.error("Failed to post comment");
      }
    } catch (error) {
      toast.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!userId) {
      toast.error("Please sign in to reply");
      return;
    }

    if (!replyText.trim() || !replyingTo) {
      toast.error("Please enter a reply");
      return;
    }

    const parentCommentId = replyingTo.parentCommentId;
    // Build the reply text with @mention if replying to a nested reply
    let finalBody = replyText;
    if (replyingTo.replyToId && replyingTo.replyToName) {
      finalBody = `@${replyingTo.replyToName} ${replyText}`;
    }

    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/routes/${routeId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: finalBody, parent_comment_id: parentCommentId }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentCommentId
              ? { ...c, replies: [...(c.replies || []), data.comment] }
              : c
          )
        );
        setReplyText("");
        setReplyingTo(null);
        setExpandedComments((prev) => new Set([...prev, parentCommentId]));
        toast.success("Reply posted!");
      } else {
        toast.error("Failed to post reply");
      }
    } catch (error) {
      toast.error("Failed to post reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: string, isReply = false, parentId?: string) => {
    try {
      const res = await fetch(`/api/routes/${routeId}/comments/${commentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (isReply && parentId) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === parentId
                ? { ...c, replies: c.replies?.filter((r: any) => r.id !== commentId) || [] }
                : c
            )
          );
        } else {
          setComments((prev) => prev.filter((c) => c.id !== commentId));
        }
        toast.success("Comment deleted");
      } else {
        toast.error("Failed to delete comment");
      }
    } catch (error) {
      toast.error("Failed to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const toggleExpandComment = (commentId: string) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleSubmitHazard = async () => {
    if (!userId) {
      toast.error("Please sign in to report hazards");
      return;
    }

    if (!newHazard.hazard_type || !newHazard.title) {
      toast.error("Please select a hazard type and add a title");
      return;
    }

    setSubmittingHazard(true);
    try {
      const res = await fetch(`/api/routes/${routeId}/hazards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHazard),
      });

      if (res.ok) {
        const data = await res.json();
        setHazards((prev) => [data.hazard, ...prev]);
        setNewHazard({ hazard_type: "", title: "", description: "", severity: "medium" });
        setHazardDialogOpen(false);
        toast.success("Hazard reported! Thank you for helping keep others safe.");
      } else {
        toast.error("Failed to report hazard");
      }
    } catch (error) {
      toast.error("Failed to report hazard");
    } finally {
      setSubmittingHazard(false);
    }
  };

  const handleResolveHazard = async (hazardId: string) => {
    try {
      const res = await fetch(`/api/routes/${routeId}/hazards/${hazardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });

      if (res.ok) {
        setHazards((prev) =>
          prev.map((h) => (h.id === hazardId ? { ...h, status: "resolved" } : h))
        );
        toast.success("Hazard marked as resolved");
      }
    } catch (error) {
      toast.error("Failed to update hazard");
    }
  };

  const handleDeleteHazard = async () => {
    if (!hazardToDelete) return;
    
    try {
      const res = await fetch(`/api/routes/${routeId}/hazards/${hazardToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setHazards((prev) => prev.filter((h) => h.id !== hazardToDelete.id));
        toast.success("Hazard deleted");
        setDeleteHazardDialogOpen(false);
        setHazardToDelete(null);
      } else {
        toast.error("Failed to delete hazard");
      }
    } catch (error) {
      toast.error("Failed to delete hazard");
    }
  };

  const openDeleteHazardDialog = (hazard: any) => {
    setHazardToDelete(hazard);
    setDeleteHazardDialogOpen(true);
  };

  const handleReportComment = async () => {
    if (!userId || !reportingCommentId || !reportReason.trim()) {
      toast.error("Please provide a reason for reporting");
      return;
    }

    setSubmittingReport(true);
    try {
      const res = await fetch(`/api/routes/${routeId}/comments/${reportingCommentId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason }),
      });

      if (res.ok) {
        toast.success("Comment reported. Thank you for helping keep our community safe.");
        setReportDialogOpen(false);
        setReportingCommentId(null);
        setReportReason("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to report comment");
      }
    } catch (error) {
      toast.error("Failed to report comment");
    } finally {
      setSubmittingReport(false);
    }
  };

  const canDeleteHazard = (hazard: any) => {
    return isAdmin || isOwner || hazard.reported_by_user_id === userId;
  };

  // Calculate distance between two points in meters using Haversine formula
  const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Check if user is near the route
  const checkUserLocation = () => {
    setLocationStatus("checking");
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });

        // Get route geometry
        const geometry = route?.geometry || route?.route_geometry;
        if (!geometry?.coordinates) {
          // No route geometry, allow hazard report
          setLocationStatus("near");
          return;
        }

        // Find minimum distance to any point on the route
        let minDistance = Infinity;
        const coords = geometry.coordinates as [number, number][];
        
        for (const coord of coords) {
          const distance = getDistanceMeters(userLat, userLng, coord[1], coord[0]);
          if (distance < minDistance) {
            minDistance = distance;
          }
        }

        // Allow if within 500m of the route
        const MAX_DISTANCE_METERS = 500;
        if (minDistance <= MAX_DISTANCE_METERS) {
          setLocationStatus("near");
        } else {
          setLocationStatus("far");
          setLocationError(`You appear to be ${Math.round(minDistance / 1000)}km from this route. Hazard reports must be made while near the route.`);
        }
      },
      (error) => {
        setLocationStatus("error");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable location services to report hazards.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location unavailable. Please try again.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again.");
            break;
          default:
            setLocationError("Unable to get your location. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Check location when hazard dialog opens
  useEffect(() => {
    if (hazardDialogOpen && locationStatus === "idle") {
      checkUserLocation();
    }
    if (!hazardDialogOpen) {
      setLocationStatus("idle");
      setLocationError(null);
    }
  }, [hazardDialogOpen]);

  const handleAddWaypoint = async () => {
    if (!newWaypoint.name.trim()) {
      toast.error("Please provide a name");
      return;
    }

    if (!waypointLocation) {
      toast.error("Please select a location on the map");
      return;
    }

    setSubmittingWaypoint(true);
    try {
      const res = await fetch(`/api/routes/${routeId}/waypoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWaypoint.name,
          description: newWaypoint.description,
          icon_type: newWaypoint.icon_type,
          lat: waypointLocation.lat,
          lng: waypointLocation.lng,
          order_index: waypoints.length,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setWaypoints((prev) => [...prev, data.waypoint]);
        setNewWaypoint({ name: "", description: "", icon_type: "other" });
        setWaypointLocation(null);
        setWaypointDialogOpen(false);
        toast.success("Waypoint added!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add waypoint");
      }
    } catch (error) {
      toast.error("Failed to add waypoint");
    } finally {
      setSubmittingWaypoint(false);
    }
  };

  // Submit the ride review (card-based flow)
  const handleSubmitRideReview = async () => {
    if (!userId || !routeId) return;
    setSubmittingReview(true);
    try {
      // Submit review with rating (collected but NOT publicly displayed)
      await fetch(`/api/routes/${routeId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          difficulty: route?.difficulty || "moderate",
          review_text: reviewShortNote || undefined,
        }),
      });

      // Also record as a completion with structured tags
      await fetch(`/api/routes/${routeId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: JSON.stringify({ tags: reviewTags, short_note: reviewShortNote }),
          rating: reviewRating,
        }),
      });

      setReviewStep(5); // Go to "thank you" / optional long note step
      toast.success("Review submitted! Thank you 🐴");
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitLongNote = async () => {
    if (!routeId || !reviewLongNote.trim()) {
      resetReviewState();
      return;
    }
    try {
      const combinedText = reviewShortNote
        ? `${reviewShortNote}\n\n---\n\n${reviewLongNote}`
        : reviewLongNote;
      await fetch(`/api/routes/${routeId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          review_text: combinedText,
          difficulty: route?.difficulty || "moderate",
        }),
      });
      toast.success("Additional notes saved!");
    } catch {
      // Non-critical
    }
    resetReviewState();
  };

  const resetReviewState = () => {
    setReviewStep(null);
    setReviewRating(0);
    setReviewTags([]);
    setReviewShortNote("");
    setReviewLongNote("");
  };

  const toggleReviewTag = (tagId: string) => {
    setReviewTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleDeleteWaypoint = async (waypointId: string) => {
    if (!confirm("Delete this waypoint?")) return;
    
    try {
      const res = await fetch(`/api/routes/${routeId}/waypoints/${waypointId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setWaypoints((prev) => prev.filter((w) => w.id !== waypointId));
        toast.success("Waypoint deleted");
      } else {
        toast.error("Failed to delete waypoint");
      }
    } catch (error) {
      toast.error("Failed to delete waypoint");
    }
  };

  if (!route && !loading) {
    return null;
  }

  // Map all difficulty values to colors and display names
  const difficultyConfig: Record<string, { color: string; label: string }> = {
    unrated: { color: "bg-gray-100 text-gray-800 border-gray-300", label: "Unrated" },
    easy: { color: "bg-green-100 text-green-800 border-green-300", label: "Easy" },
    moderate: { color: "bg-amber-100 text-amber-800 border-amber-300", label: "Moderate" },
    medium: { color: "bg-amber-100 text-amber-800 border-amber-300", label: "Medium" },
    difficult: { color: "bg-orange-100 text-orange-800 border-orange-300", label: "Difficult" },
    hard: { color: "bg-red-100 text-red-800 border-red-300", label: "Hard" },
    severe: { color: "bg-red-200 text-red-900 border-red-400", label: "Severe" },
  };
  
  const getDifficultyInfo = (difficulty: string | undefined) => {
    if (!difficulty) return difficultyConfig.moderate;
    return difficultyConfig[difficulty.toLowerCase()] || difficultyConfig.moderate;
  };
  
  // Get display photos for carousel (cover first, then display photos)
  const displayPhotosForCarousel = (() => {
    // Use API response data if available, otherwise fall back to filtering
    if (coverPhoto || apiDisplayPhotos.length > 0) {
      return coverPhoto ? [coverPhoto, ...apiDisplayPhotos] : apiDisplayPhotos;
    }
    // Fallback: filter from all photos
    const allPhotos = [...photos, ...(route?.route_photos || [])];
    const cover = allPhotos.find((p: any) => p.is_cover);
    const display = allPhotos.filter((p: any) => p.is_display && !p.is_cover);
    return cover ? [cover, ...display] : display;
  })();

  const activeHazards = hazards.filter((h) => h.status === "active");

  if (!open) return null;

  // Full Discussion Panel Content
  const fullDiscussionPanel = (
    <div className="flex flex-col h-full">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setActiveFullPanel(null)}
          className="h-8 w-8 p-0"
        >
          <ChevronDown className="h-5 w-5 rotate-90" />
        </Button>
        <h2 className="font-semibold text-lg">Discussion</h2>
        <Badge variant="outline" className="ml-auto">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </Badge>
      </div>

      {/* Discussion Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Add Comment Form */}
          <div className="space-y-2">
            <Textarea
              placeholder="Share your thoughts about this route..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
            />
            <Button
              onClick={async () => {
                if (!newComment.trim() || submittingComment) return;
                setSubmittingComment(true);
                try {
                  const res = await fetch(`/api/routes/${routeId}/comments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: newComment }),
                  });
                  if (res.ok) {
                    toast.success("Comment posted!");
                    setNewComment("");
                    // Refresh comments
                    const commentsRes = await fetch(`/api/routes/${routeId}/comments`);
                    if (commentsRes.ok) {
                      const data = await commentsRes.json();
                      setComments(data.comments || []);
                    }
                  }
                } catch {
                  toast.error("Failed to post comment");
                } finally {
                  setSubmittingComment(false);
                }
              }}
              disabled={!newComment.trim() || submittingComment}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </Button>
          </div>

          <Separator />

          {/* Comments List */}
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment: any) => (
                <div key={comment.id} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={comment.user?.avatar_url} />
                      <AvatarFallback>
                        {comment.user?.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{comment.user?.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Full Waypoints Panel Content
  const fullWaypointsPanel = (
    <div className="flex flex-col h-full">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setActiveFullPanel(null)}
          className="h-8 w-8 p-0"
        >
          <ChevronDown className="h-5 w-5 rotate-90" />
        </Button>
        <h2 className="font-semibold text-lg">Waypoints</h2>
        <Badge variant="outline" className="ml-auto">{waypoints.length}</Badge>
      </div>

      {/* Waypoints Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {waypoints.length > 0 ? (
            waypoints.map((waypoint: any, index: number) => (
              <div key={waypoint.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-medium text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{waypoint.name || `Waypoint ${index + 1}`}</p>
                  {waypoint.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{waypoint.description}</p>
                  )}
                </div>
                {waypoint.distance_from_start && (
                  <span className="text-sm text-muted-foreground">
                    {(waypoint.distance_from_start / 1000).toFixed(2)} km
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No waypoints added to this route yet.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Review Flow Content - card-based, linear, intentionally short
  const reviewFlowContent = (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {reviewStep === 5 ? "Complete!" : `Step ${reviewStep} of 4`}
          </span>
          <button
            onClick={resetReviewState}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
        <Progress value={reviewStep === 5 ? 100 : ((reviewStep || 0) / 4) * 100} className="h-1.5" />
      </div>

      {/* Step 1: Overall Feel - Star Rating */}
      {reviewStep === 1 && (
        <div className="text-center space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">How did this route ride overall?</h2>
            <p className="text-sm text-gray-500 mt-1">Your honest rating helps us improve</p>
          </div>

          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setReviewRating(n)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-10 w-10 transition-colors",
                    n <= reviewRating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                  )}
                />
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 italic">
            This rating is collected for internal improvement only and won&apos;t be shown publicly
          </p>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 rounded-full" onClick={resetReviewState}>
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-full bg-green-600 hover:bg-green-700"
              onClick={() => setReviewStep(2)}
              disabled={reviewRating === 0}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Add a Moment (Optional Photo) */}
      {reviewStep === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Share a moment from your ride</h2>
            <p className="text-sm text-gray-500 mt-1">Add a photo to help others know what to expect (optional)</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {["🏞️ View", "🌿 Feature", "🍂 Seasonal moment"].map((cat) => (
              <Badge key={cat} variant="outline" className="cursor-pointer hover:bg-green-50 transition-colors px-3 py-1">
                {cat}
              </Badge>
            ))}
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-green-300 transition-colors cursor-pointer">
            <ImageIcon className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Tap to add a photo</p>
            <p className="text-xs text-gray-400 mt-1">Coming soon</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setReviewStep(1)}>
              Back
            </Button>
            <Button className="flex-1 rounded-full bg-green-600 hover:bg-green-700" onClick={() => setReviewStep(3)}>
              Skip / Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Things Worth Knowing (Checkboxes) */}
      {reviewStep === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Things worth knowing</h2>
            <p className="text-sm text-gray-500 mt-1">Help others by sharing what you noticed — tick all that apply</p>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {REVIEW_TAGS.map((tag) => (
              <label
                key={tag.id}
                className={cn(
                  "flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors",
                  reviewTags.includes(tag.id)
                    ? "bg-green-50 border-green-300"
                    : "hover:bg-gray-50 border-gray-200"
                )}
              >
                <Checkbox
                  checked={reviewTags.includes(tag.id)}
                  onCheckedChange={() => toggleReviewTag(tag.id)}
                  className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
                <span className="text-lg">{tag.emoji}</span>
                <span className="text-sm font-medium text-gray-700">{tag.label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setReviewStep(2)}>
              Back
            </Button>
            <Button className="flex-1 rounded-full bg-green-600 hover:bg-green-700" onClick={() => setReviewStep(4)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Short Note */}
      {reviewStep === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Anything you&apos;d tell a friend before riding this?</h2>
            <p className="text-sm text-gray-500 mt-1">Keep it short and helpful</p>
          </div>

          <div className="relative">
            <Textarea
              placeholder="e.g. Bring waterproofs if it has been raining, the ford crossing can get deep!"
              value={reviewShortNote}
              onChange={(e) => {
                if (e.target.value.length <= 200) setReviewShortNote(e.target.value);
              }}
              className="min-h-[100px] resize-none"
            />
            <span className={cn(
              "absolute bottom-2 right-3 text-xs",
              reviewShortNote.length > 180 ? "text-amber-500" : "text-gray-400"
            )}>
              {reviewShortNote.length}/200
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setReviewStep(3)}>
              Back
            </Button>
            <Button
              className="flex-1 rounded-full bg-green-600 hover:bg-green-700"
              onClick={handleSubmitRideReview}
              disabled={submittingReview}
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Thank You + Optional Long Note */}
      {reviewStep === 5 && (
        <div className="space-y-5">
          <div className="text-center py-4">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900">Thank you for your review!</h2>
            <p className="text-sm text-gray-500 mt-2">
              Your insights help the riding community explore with confidence
            </p>
          </div>

          {reviewTags.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {reviewTags.map((tagId) => {
                const tag = REVIEW_TAGS.find((t) => t.id === tagId);
                return tag ? (
                  <Badge key={tagId} variant="secondary" className="gap-1">
                    {tag.emoji} {tag.label}
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Anything else you&apos;d like to note?</h3>
            <p className="text-xs text-gray-500">
              Optional — share a longer story about your experience. This helps enthusiasts get the full picture.
            </p>
            <Textarea
              placeholder="Share more details about your ride..."
              value={reviewLongNote}
              onChange={(e) => setReviewLongNote(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={resetReviewState}>
              Skip
            </Button>
            {reviewLongNote.trim() && (
              <Button
                className="flex-1 rounded-full bg-green-600 hover:bg-green-700"
                onClick={handleSubmitLongNote}
              >
                Save Note
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const drawerContent = (
    <div className="h-full overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : reviewStep !== null ? (
          reviewFlowContent
        ) : activeFullPanel === "discussion" ? (
          fullDiscussionPanel
        ) : activeFullPanel === "waypoints" ? (
          fullWaypointsPanel
        ) : route ? (
          <div>
            {/* PHOTO CAROUSEL - Full bleed at top of card */}
            {displayPhotosForCarousel.length > 0 && (
              <div className="relative group">
                <div className="relative h-52 overflow-hidden">
                  {displayPhotosForCarousel.map((photo: any, idx: number) => (
                    <div
                      key={photo.id || idx}
                      className={cn(
                        "absolute inset-0 transition-opacity duration-300",
                        idx === currentPhotoIndex ? "opacity-100" : "opacity-0 pointer-events-none"
                      )}
                    >
                      <Image
                        src={photo.url}
                        alt={photo.caption || `Route photo ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}

                  {/* Photo count badge */}
                  <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <ImageIcon className="h-3 w-3" />
                    {currentPhotoIndex + 1} / {displayPhotosForCarousel.length}
                  </div>

                  {/* Navigation arrows - visible on hover */}
                  {displayPhotosForCarousel.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : displayPhotosForCarousel.length - 1));
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <ChevronLeft className="h-4 w-4 text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhotoIndex((prev) => (prev < displayPhotosForCarousel.length - 1 ? prev + 1 : 0));
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <ChevronRight className="h-4 w-4 text-gray-700" />
                      </button>
                    </>
                  )}

                  {/* Dot indicators */}
                  {displayPhotosForCarousel.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {displayPhotosForCarousel.map((_: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPhotoIndex(idx);
                          }}
                          className={cn(
                            "h-2 rounded-full transition-all",
                            idx === currentPhotoIndex ? "bg-white w-4" : "bg-white/50 w-2"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* AUTHOR - above title, like OS Maps */}
              {route?.owner && (
                <Link href={`/profile/${route.owner.id}`} className="flex items-center gap-2.5 group">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={route.owner.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-green-100 text-green-800">
                      {route.owner.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-600 group-hover:text-green-700 transition-colors">
                    {route.owner.name}
                  </span>
                </Link>
              )}

              {/* TITLE */}
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{route.title}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {route.featured && <Badge className="text-xs bg-amber-500">Featured</Badge>}
                  {isOwner && <Badge variant="outline" className="text-xs">Your Route</Badge>}
                  {activeHazards.length > 0 && (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      {activeHazards.length} Hazard{activeHazards.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>

              {/* DIFFICULTY + TIMES RIDDEN */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge
                  className={cn(
                    "text-sm px-3 py-1",
                    getDifficultyInfo(route.difficulty).color
                  )}
                >
                  {getDifficultyInfo(route.difficulty).label}
                </Badge>
                {(route.completions_count > 0) && (
                  <span className="text-sm text-gray-500">
                    🐴 {route.completions_count} {route.completions_count === 1 ? "person has" : "people have"} ridden this
                  </span>
                )}
              </div>

              {/* STATS - Distance, Time, Total Ascent, Total Descent */}
              <div className="grid grid-cols-4 gap-2 py-3 border-y bg-slate-50/50 rounded-lg px-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">
                    {Number(route.distance_km || 0).toFixed(1)}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Distance (km)</p>
                </div>
                <div className="text-center border-l border-slate-200">
                  <p className="text-lg font-bold text-slate-900">
                    {route.distance_km
                      ? (() => {
                          const mins = Math.floor((Number(route.distance_km) / 8) * 60);
                          return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ""}` : `${mins}m`;
                        })()
                      : "—"}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">🐴 Ride</p>
                </div>
                <div className="text-center border-l border-slate-200">
                  <p className="text-lg font-bold text-slate-900">
                    {route.elevation_gain ? `${Math.round(route.elevation_gain)}` : "—"}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Ascent (m)</p>
                </div>
                <div className="text-center border-l border-slate-200">
                  <p className="text-lg font-bold text-slate-900">
                    {route.elevation_loss ? `${Math.round(route.elevation_loss)}` : "—"}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Descent (m)</p>
                </div>
              </div>

              {/* DESCRIPTION with Read More */}
              {route.description && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className={cn(
                    "text-sm text-slate-600",
                    !showFullDescription && "line-clamp-3"
                  )}>
                    {route.description}
                  </p>
                  {route.description.length > 150 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-xs text-green-600 hover:text-green-700 font-medium mt-1"
                    >
                      {showFullDescription ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              )}

              {/* ROUTE MAP SNAPSHOT - full width */}
              {(() => {
                const geo = route.geometry || route.route_geometry;
                const snapshotUrl = getMapboxThumbnailUrl(geo, {
                  width: 600,
                  height: 200,
                  routeColor: "166534",
                  routeWeight: 3,
                });
                return snapshotUrl ? (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-100 border">
                    <img src={snapshotUrl} alt="Route map" className="w-full h-full object-cover" />
                  </div>
                ) : null;
              })()}

              {/* I'VE RIDDEN THIS ROUTE! button */}
              {userId && !isOwner && (
                <Button
                  onClick={() => setReviewStep(1)}
                  className="w-full rounded-xl h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-base shadow-sm"
                >
                  🐴 I&apos;ve ridden this route!
                </Button>
              )}

            {/* Terrain/Surface Tags */}
            {(route.terrain_tags?.length > 0 || route.surface) && (
              <div className="flex flex-wrap gap-2">
                {route.terrain_tags?.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {route.surface && (
                  <Badge variant="outline" className="text-xs">
                    {route.surface}
                  </Badge>
                )}
              </div>
            )}

            {/* Secondary Action Icons Row */}
            <div className="flex items-center justify-around py-2 border rounded-lg bg-slate-50">
              <button 
                onClick={handleDownloadGPX}
                className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Download className="h-5 w-5 text-slate-600" />
                <span className="text-xs text-slate-500">Export GPX</span>
              </button>
              {(isOwner || isAdmin) && onEditRoute && (
                <button 
                  onClick={() => onEditRoute(routeId!, route)}
                  className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Pencil className="h-5 w-5 text-slate-600" />
                  <span className="text-xs text-slate-500">Copy & Edit</span>
                </button>
              )}
              <button 
                onClick={() => setReportDialogOpen(true)}
                className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Flag className="h-5 w-5 text-slate-600" />
                <span className="text-xs text-slate-500">Report</span>
              </button>
            </div>

            <Separator />

            {/* NEARBY STAYS - Always Visible Carousel */}
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
                        <NearbyPropertyCard 
                          property={property} 
                          onShowOnMap={onShowPropertyOnMap}
                        />
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* DISCUSSION PREVIEW CARD */}
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
                    <AvatarFallback className="text-xs">
                      {comments[0]?.user?.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
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

            {/* WAYPOINTS & HAZARDS ROW */}
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="border rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setActiveFullPanel("waypoints")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Waypoints
                  </span>
                  <Badge variant="outline" className="text-xs">{waypoints.length}</Badge>
                </div>
              </div>
              <div 
                className="border rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors relative"
                onClick={() => setHazardDialogOpen(true)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Hazards
                  </span>
                  {activeHazards.length > 0 ? (
                    <Badge variant="destructive" className="text-xs">{activeHazards.length}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Report</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* ROUTE STATS - Engagement */}
            <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 rounded-lg">
              <div className="text-center">
                <p className="text-xl font-bold">{likesCount}</p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{route.completions_count || 0}</p>
                <p className="text-xs text-muted-foreground">Completions</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{route.shares_count || 0}</p>
                <p className="text-xs text-muted-foreground">Shares</p>
              </div>
            </div>

            {/* Safety Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900">
                ⚠️ Always respect land access rules, closures, and local
                regulations. Check conditions before setting out.
              </p>
            </div>

            {/* Hazard Reporting Dialog - Opens from Hazards card */}
            <Dialog open={hazardDialogOpen} onOpenChange={setHazardDialogOpen}>
              <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Report a Hazard</DialogTitle>
                      <DialogDescription>
                        Help other riders and walkers by reporting hazards on this route.
                      </DialogDescription>
                    </DialogHeader>

                    {/* Location Status Banner */}
                    {locationStatus === "checking" && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                        <span className="text-sm text-blue-700">Checking your location...</span>
                      </div>
                    )}
                    {locationStatus === "near" && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700">Location verified - you&apos;re near the route</span>
                      </div>
                    )}
                    {locationStatus === "far" && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-700">Too far from route</span>
                        </div>
                        <p className="text-sm text-orange-600">{locationError}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={checkUserLocation}
                        >
                          Try Again
                        </Button>
                      </div>
                    )}
                    {locationStatus === "error" && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-700">Location Error</span>
                        </div>
                        <p className="text-sm text-red-600">{locationError}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={checkUserLocation}
                        >
                          Try Again
                        </Button>
                      </div>
                    )}

                    {/* Only show form when location is verified or admin/owner */}
                    {(locationStatus === "near" || isAdmin || isOwner) && (
                      <div className="space-y-4">
                        {(isAdmin || isOwner) && locationStatus !== "near" && (
                          <p className="text-xs text-muted-foreground italic">
                            As {isAdmin ? "an admin" : "the route owner"}, you can report hazards without location verification.
                          </p>
                        )}
                        <div>
                          <Label>Hazard Type *</Label>
                          <Select
                            value={newHazard.hazard_type}
                            onValueChange={(v) => setNewHazard((prev) => ({ ...prev, hazard_type: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                              {HAZARD_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Title *</Label>
                          <Input
                            placeholder="Brief description..."
                            value={newHazard.title}
                            onChange={(e) => setNewHazard((prev) => ({ ...prev, title: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Details</Label>
                          <Textarea
                            placeholder="Additional details..."
                            value={newHazard.description}
                            onChange={(e) => setNewHazard((prev) => ({ ...prev, description: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Severity</Label>
                          <Select
                            value={newHazard.severity}
                            onValueChange={(v) => setNewHazard((prev) => ({ ...prev, severity: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                              <SelectItem value="medium">Medium - Use caution</SelectItem>
                              <SelectItem value="high">High - Significant danger</SelectItem>
                              <SelectItem value="critical">Critical - Do not proceed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                <DialogFooter>
                  <Button
                    onClick={handleSubmitHazard}
                    disabled={submittingHazard || (locationStatus !== "near" && !isAdmin && !isOwner)}
                  >
                    {submittingHazard ? "Submitting..." : "Report Hazard"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            </div>
          </div>
        ) : null}

        
        {/* Report Comment Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Comment</DialogTitle>
              <DialogDescription>
                Please tell us why you&apos;re reporting this comment. Our moderation team will review it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reason *</Label>
                <Select value={reportReason} onValueChange={setReportReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spam">Spam</SelectItem>
                    <SelectItem value="harassment">Harassment or bullying</SelectItem>
                    <SelectItem value="hate_speech">Hate speech</SelectItem>
                    <SelectItem value="misinformation">Misinformation</SelectItem>
                    <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleReportComment} 
                disabled={submittingReport || !reportReason}
                variant="destructive"
              >
                {submittingReport ? "Reporting..." : "Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Hazard Confirmation Dialog */}
        <Dialog open={deleteHazardDialogOpen} onOpenChange={setDeleteHazardDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete Hazard Report
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this hazard report? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {hazardToDelete && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={SEVERITY_COLORS[hazardToDelete.severity as keyof typeof SEVERITY_COLORS]}
                  >
                    {hazardToDelete.severity}
                  </Badge>
                  <Badge variant="secondary">
                    {HAZARD_TYPES.find((t) => t.value === hazardToDelete.hazard_type)?.label}
                  </Badge>
                </div>
                <p className="font-medium">{hazardToDelete.title}</p>
                {hazardToDelete.description && (
                  <p className="text-sm text-muted-foreground">{hazardToDelete.description}</p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteHazardDialogOpen(false);
                  setHazardToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteHazard}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Hazard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );

  return (
    <>
      {/* Backdrop - blurred overlay. Click dismisses modal but keeps route */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300",
          "bg-black/40 backdrop-blur-sm",
        )}
        onClick={onDismiss || onClose}
      />

      {/* Centered Modal Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-100",
            "w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden",
            "animate-in zoom-in-95 slide-in-from-bottom-4 fade-in duration-300",
            // Mobile: a bit taller
            "md:max-h-[80vh]",
          )}
        >
          {/* Modal Header - green accent bar + close button */}
          <div className="flex items-center justify-between px-5 py-3 border-b bg-gradient-to-r from-green-50 to-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-green-600 rounded-full" />
              <h2 className="font-semibold text-gray-900 truncate">
                {route?.title || "Route Details"}
              </h2>
            </div>
            <button
              onClick={onDismiss || onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0">
            {drawerContent}
          </div>

          {/* Bottom Action Bar */}
          <div className="shrink-0 border-t bg-white px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant={liked ? "default" : "outline"}
                size="sm"
                onClick={handleLike}
                className="gap-1.5 rounded-full"
              >
                <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                {likesCount > 0 ? likesCount : "Like"}
              </Button>
              <Button
                variant={favorited ? "default" : "outline"}
                size="sm"
                onClick={handleFavorite}
                className="gap-1.5 rounded-full"
              >
                <Bookmark className={cn("h-4 w-4", favorited && "fill-current")} />
                {favorited ? "Saved" : "Save"}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-1.5 rounded-full"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
