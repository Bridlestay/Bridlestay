"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Star,
  MapPin,
  Ruler,
  Download,
  Share2,
  Flag,
  Clock,
  TrendingUp,
  Home,
  Heart,
  Bookmark,
  AlertTriangle,
  MessageCircle,
  Send,
  Plus,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
  MoreHorizontal,
  Upload,
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
import { WaypointCard } from "./waypoint-card";
import { NearbyPropertyCard } from "./nearby-property-card";
import { RouteCompletion } from "./route-completion";
import { WaypointMapPicker } from "./waypoint-map-picker";
import { calculateDistanceKm } from "@/lib/routes/distance-calculator";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface RouteDetailDrawerProps {
  routeId: string | null;
  open: boolean;
  onClose: () => void;
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

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : route ? (
          <div className="space-y-6">
            <SheetHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <SheetTitle className="text-2xl">{route.title}</SheetTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {route.featured && <Badge>Featured Route</Badge>}
                    {isOwner && <Badge variant="outline">Your Route</Badge>}
                </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                {route.avg_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">
                      {route.avg_rating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({route.review_count})
                    </span>
                  </div>
                )}
                  {activeHazards.length > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {activeHazards.length} Active Hazard{activeHazards.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>
              <SheetDescription>{route.description}</SheetDescription>
            </SheetHeader>

            {/* Display Photos Carousel */}
            {displayPhotosForCarousel.length > 0 && (
              <div className="relative h-48 rounded-lg overflow-hidden">
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 h-full pb-2">
                  {displayPhotosForCarousel.map((photo: any, idx: number) => (
                    <div 
                      key={photo.id || idx} 
                      className="relative flex-shrink-0 w-full h-full snap-center"
                    >
                      <Image
                        src={photo.url}
                        alt={photo.caption || `Route photo ${idx + 1}`}
                        fill
                        className="object-cover rounded-lg"
                      />
                      {photo.is_cover && (
                        <Badge className="absolute top-2 left-2 bg-amber-500">Cover</Badge>
                      )}
                    </div>
                  ))}
                </div>
                {displayPhotosForCarousel.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {displayPhotosForCarousel.map((_: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="w-2 h-2 rounded-full bg-white/70"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={getDifficultyInfo(route.difficulty).color}
              >
                {getDifficultyInfo(route.difficulty).label}
              </Badge>
              {route.distance_km && (
              <Badge variant="outline" className="gap-1">
                <Ruler className="h-3 w-3" />
                  {Number(route.distance_km).toFixed(1)} km
              </Badge>
              )}
              {route.distance_km && (
                <>
                  <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-300">
                    <Clock className="h-3 w-3" />
                    🐴 {Math.floor((Number(route.distance_km) / 12) * 60)}m ride
                  </Badge>
                  <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-300">
                    <Clock className="h-3 w-3" />
                    🚶 {Math.floor((Number(route.distance_km) / 5) * 60)}m walk
                  </Badge>
                </>
              )}
              {route.county && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {route.county}
                </Badge>
              )}
            </div>

            {/* Owner */}
            {route.owner && (
              <Link href={`/profile/${route.owner.id}`} className="block">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                <Avatar>
                  <AvatarImage src={route.owner.avatar_url || undefined} />
                  <AvatarFallback>
                    {route.owner.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{route.owner.name}</p>
                  <p className="text-sm text-muted-foreground">Route Creator</p>
                </div>
              </div>
              </Link>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleDownloadGPX} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download GPX
              </Button>
              <Button
                variant={liked ? "default" : "outline"}
                onClick={handleLike}
                className="gap-1"
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                {likesCount > 0 && likesCount}
              </Button>
              <Button
                variant={favorited ? "default" : "outline"}
                onClick={handleFavorite}
              >
                <Bookmark className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Edit Route Button for Owners */}
            {(isOwner || isAdmin) && (
              <Link href={`/routes/edit/${routeId}`} className="block">
                <Button variant="outline" className="w-full">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Route
                </Button>
              </Link>
            )}

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6 h-auto">
                <TabsTrigger value="overview" className="text-xs px-2">Overview</TabsTrigger>
                <TabsTrigger value="comments" className="text-xs px-2">
                  Discussion
                </TabsTrigger>
                <TabsTrigger value="photos" className="text-xs px-2">
                  Photos
                </TabsTrigger>
                <TabsTrigger value="waypoints" className="text-xs px-2">
                  Waypoints
                </TabsTrigger>
                <TabsTrigger value="hazards" className="text-xs px-2 relative">
                  Hazards
                  {activeHazards.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {activeHazards.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="nearby" className="text-xs px-2">
                  Stays
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Terrain Tags */}
                {route.terrain_tags && route.terrain_tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Terrain</h3>
                    <div className="flex flex-wrap gap-2">
                      {route.terrain_tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Surface */}
                {route.surface && (
                  <div>
                    <h3 className="font-semibold mb-1">Surface</h3>
                    <p className="text-sm text-muted-foreground">
                      {route.surface}
                    </p>
                  </div>
                )}

                {/* Seasonal Notes */}
                {route.seasonal_notes && (
                  <div>
                    <h3 className="font-semibold mb-1">Seasonal Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      {route.seasonal_notes}
                    </p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{likesCount}</p>
                    <p className="text-xs text-muted-foreground">Likes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{route.completions_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Completions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{route.shares_count || 0}</p>
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
              </TabsContent>

              <TabsContent value="hazards" className="space-y-4">
                {/* Report Hazard Button */}
                <Dialog open={hazardDialogOpen} onOpenChange={setHazardDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Report a Hazard
                    </Button>
                  </DialogTrigger>
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
                        <span className="text-sm text-green-700">Location verified - you're near the route</span>
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

                {/* Active Hazards */}
                {loadingHazards ? (
                  <p className="text-muted-foreground text-center py-8">Loading hazards...</p>
                ) : activeHazards.length > 0 ? (
                  <div className="space-y-3">
                    {activeHazards.map((hazard) => (
                      <div
                        key={hazard.id}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            <span className="font-medium">{hazard.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={SEVERITY_COLORS[hazard.severity as keyof typeof SEVERITY_COLORS]}
                            >
                              {hazard.severity}
                            </Badge>
                            {canDeleteHazard(hazard) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleResolveHazard(hazard.id)}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark Resolved
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => openDeleteHazardDialog(hazard)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                        
                        {hazard.description && (
                          <p className="text-sm text-muted-foreground">{hazard.description}</p>
                        )}
                        
                        {/* Reporter Info */}
                        <div className="flex items-center justify-between">
                          {hazard.reporter ? (
                            <Link 
                              href={`/profile/${hazard.reporter.id}`}
                              className="flex items-center gap-2 hover:underline"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={hazard.reporter.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {hazard.reporter.name?.[0]?.toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{hazard.reporter.name}</span>
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">Anonymous</span>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {HAZARD_TYPES.find((t) => t.value === hazard.hazard_type)?.label}
                          </Badge>
                        </div>
                        
                        {/* Date */}
                        <p className="text-xs text-muted-foreground">
                          Reported on {new Date(hazard.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })} ({formatDistanceToNow(new Date(hazard.created_at), { addSuffix: true })})
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">
                      No active hazards reported on this route.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Always check conditions before setting out.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="photos" className="space-y-6">
                {/* Owner/Admin Photo Upload */}
                {(isOwner || isAdmin) && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-medium mb-2">Add Route Photos</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload photos as the route {isOwner ? "author" : "admin"}.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      id="owner-photo-upload"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const formData = new FormData();
                        formData.append("file", file);
                        
                        toast.loading("Uploading photo...");
                        try {
                          const res = await fetch(`/api/routes/${routeId}/photos`, {
                            method: "POST",
                            body: formData,
                          });
                          
                          if (res.ok) {
                            toast.dismiss();
                            toast.success("Photo uploaded!");
                            // Refresh photos
                            const photosRes = await fetch(`/api/routes/${routeId}/photos`);
                            if (photosRes.ok) {
                              const data = await photosRes.json();
                              setPhotos(data.photos || []);
                            }
                          } else {
                            const data = await res.json();
                            toast.dismiss();
                            toast.error(data.error || "Failed to upload");
                          }
                        } catch {
                          toast.dismiss();
                          toast.error("Failed to upload photo");
                        }
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("owner-photo-upload")?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                  </div>
                )}

                {/* Route Completion & Photo Upload for regular users */}
                {!isOwner && !isAdmin && (
                <RouteCompletion 
                    routeId={routeId || ""}
                  userId={userId}
                  onCompletionChange={() => {
                    if (routeId) {
                      fetch(`/api/routes/${routeId}`)
                          .then((res) => res.json())
                          .then((data) => setRoute(data.route))
                        .catch(console.error);
                    }
                  }}
                />
                )}

                {/* Photos by Category */}
                <div className="space-y-6">
                  {/* Display Photos Section - for Authors/Admins */}
                  {(isOwner || isAdmin) && (
                  <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Display Photos</h4>
                      {(coverPhoto || apiDisplayPhotos.length > 0) ? (
                        <div className="grid grid-cols-3 gap-2">
                          {coverPhoto && (
                            <PhotoCard 
                              key={coverPhoto.id} 
                              photo={{...coverPhoto, is_cover: true}} 
                              routeId={routeId!}
                              isOwnerOrAdmin={true}
                              onUpdate={async () => {
                                const res = await fetch(`/api/routes/${routeId}/photos`);
                                if (res.ok) {
                                  const data = await res.json();
                                  setPhotos(data.photos || []);
                                  setCoverPhoto(data.coverPhoto || null);
                                  setApiDisplayPhotos(data.displayPhotos || []);
                                  setAuthorPhotos(data.authorPhotos || []);
                                  setUserPhotos(data.userPhotos || []);
                                }
                              }}
                              onDelete={() => setCoverPhoto(null)}
                              showActions
                            />
                          )}
                          {apiDisplayPhotos.map((photo: any) => (
                            <PhotoCard 
                          key={photo.id}
                              photo={photo} 
                              routeId={routeId!}
                              isOwnerOrAdmin={true}
                              onUpdate={async () => {
                                const res = await fetch(`/api/routes/${routeId}/photos`);
                                if (res.ok) {
                                  const data = await res.json();
                                  setPhotos(data.photos || []);
                                  setCoverPhoto(data.coverPhoto || null);
                                  setApiDisplayPhotos(data.displayPhotos || []);
                                  setAuthorPhotos(data.authorPhotos || []);
                                  setUserPhotos(data.userPhotos || []);
                                }
                              }}
                              onDelete={() => setApiDisplayPhotos(prev => prev.filter(p => p.id !== photo.id))}
                              showActions
                            />
                          ))}
                            </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No display photos yet. Upload photos below and use the menu to add them to display.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Route Photos Section - for NON-Authors only */}
                  {!isOwner && !isAdmin && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Route Photos</h4>
                      {(coverPhoto || apiDisplayPhotos.length > 0) ? (
                        <div className="grid grid-cols-3 gap-2">
                          {coverPhoto && (
                            <div className="relative h-36 rounded-lg overflow-hidden">
                              <Image src={coverPhoto.url} alt="Route photo" fill className="object-cover" />
                              <Badge className="absolute top-1 left-1 text-[10px] h-5 bg-amber-500">Cover</Badge>
                            </div>
                          )}
                          {apiDisplayPhotos.map((photo: any) => (
                            <div key={photo.id} className="relative h-36 rounded-lg overflow-hidden">
                              <Image src={photo.url} alt="Route photo" fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No featured photos for this route yet.
                        </p>
                      )}
                  </div>
                )}

                  {/* Author Photos */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Author Photos</h4>
                    {authorPhotos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {authorPhotos.map((photo: any) => (
                          <PhotoCard 
                            key={photo.id} 
                            photo={photo} 
                            routeId={routeId!}
                            isOwnerOrAdmin={isOwner || isAdmin}
                            onUpdate={async () => {
                              const res = await fetch(`/api/routes/${routeId}/photos`);
                              if (res.ok) {
                                const data = await res.json();
                                setPhotos(data.photos || []);
                                setCoverPhoto(data.coverPhoto || null);
                                setApiDisplayPhotos(data.displayPhotos || []);
                                setAuthorPhotos(data.authorPhotos || []);
                                setUserPhotos(data.userPhotos || []);
                              }
                            }}
                            onDelete={() => setAuthorPhotos(prev => prev.filter(p => p.id !== photo.id))}
                            showActions
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No author photos have been added yet.
                      </p>
                    )}
                  </div>

                  {/* User Photos - Always show with empty state */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">User Photos</h4>
                    {userPhotos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {userPhotos.map((photo: any) => (
                          <PhotoCard 
                            key={photo.id} 
                            photo={photo} 
                            routeId={routeId!}
                            isOwnerOrAdmin={isOwner || isAdmin}
                            onUpdate={async () => {
                              const res = await fetch(`/api/routes/${routeId}/photos`);
                              if (res.ok) {
                                const data = await res.json();
                                setPhotos(data.photos || []);
                                setCoverPhoto(data.coverPhoto || null);
                                setApiDisplayPhotos(data.displayPhotos || []);
                                setAuthorPhotos(data.authorPhotos || []);
                                setUserPhotos(data.userPhotos || []);
                              }
                            }}
                            onDelete={() => setUserPhotos(prev => prev.filter(p => p.id !== photo.id))}
                            showActions
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Currently no user photos have been added.
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="waypoints" className="space-y-4">
                {/* Add Waypoint Button - Any authenticated user can add waypoints */}
                {userId && (
                  <Dialog open={waypointDialogOpen} onOpenChange={(open) => {
                    setWaypointDialogOpen(open);
                    if (!open) {
                      setNewWaypoint({ name: "", description: "", icon_type: "other" });
                      setWaypointLocation(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Waypoint
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Waypoint</DialogTitle>
                        <DialogDescription>
                          Click directly on the green route line to place a waypoint. Must be within 30m of the route.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {/* Map Picker - Full width for better UX */}
                        <WaypointMapPicker
                          routeGeometry={route?.geometry || route?.route_geometry}
                          existingWaypoints={waypoints.map((w) => ({ lat: w.lat, lng: w.lng }))}
                          selectedLocation={waypointLocation}
                          onLocationSelect={setWaypointLocation}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label>Name *</Label>
                            <Input
                              placeholder="e.g., Viewpoint, Gate, Water crossing..."
                              value={newWaypoint.name}
                              onChange={(e) => setNewWaypoint((prev) => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Type</Label>
                            <Select
                              value={newWaypoint.icon_type}
                              onValueChange={(v) => setNewWaypoint((prev) => ({ ...prev, icon_type: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewpoint">🏞️ Viewpoint</SelectItem>
                                <SelectItem value="water">💧 Water</SelectItem>
                                <SelectItem value="hazard">⚠️ Hazard</SelectItem>
                                <SelectItem value="parking">🅿️ Parking</SelectItem>
                                <SelectItem value="pub">🍺 Pub/Restaurant</SelectItem>
                                <SelectItem value="gate">🚪 Gate</SelectItem>
                                <SelectItem value="rest">🪑 Rest Area</SelectItem>
                                <SelectItem value="historic">🏛️ Historic Site</SelectItem>
                                <SelectItem value="wildlife">🦌 Wildlife Spot</SelectItem>
                                <SelectItem value="bridge">🌉 Bridge</SelectItem>
                                <SelectItem value="ford">🌊 Ford/Crossing</SelectItem>
                                <SelectItem value="stile">🪜 Stile</SelectItem>
                                <SelectItem value="other">📍 Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label>Description (optional)</Label>
                            <Textarea
                              placeholder="Additional details about this point..."
                              value={newWaypoint.description}
                              onChange={(e) => setNewWaypoint((prev) => ({ ...prev, description: e.target.value }))}
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setWaypointDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddWaypoint}
                          disabled={submittingWaypoint || !waypointLocation || !newWaypoint.name.trim()}
                        >
                          {submittingWaypoint ? "Adding..." : "Add Waypoint"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {loadingWaypoints ? (
                  <p className="text-muted-foreground text-center py-8">Loading waypoints...</p>
                ) : waypoints.length > 0 ? (
                  <div className="space-y-3">
                    {waypoints.map((wp: any, index: number) => (
                      <div key={wp.id} className="relative group">
                        <WaypointCard
                          waypoint={wp}
                          index={index + 1}
                        />
                        {(isOwner || isAdmin) && (
                          <button
                            onClick={() => handleDeleteWaypoint(wp.id)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {isOwner || isAdmin ? "No waypoints yet. Add some to help guide others!" : "No waypoints marked on this route yet."}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="nearby" className="space-y-4">
                {loadingProperties ? (
                  <p className="text-muted-foreground text-center py-8">Loading nearby stays...</p>
                ) : nearbyProperties.length > 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Found {nearbyProperties.length} {nearbyProperties.length === 1 ? "property" : "properties"} near this route
                    </p>
                    <div className="grid gap-4">
                      {nearbyProperties.map((property) => (
                        <NearbyPropertyCard key={property.id} property={property} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No properties found within 10km of this route.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comments" className="space-y-4">
                {/* Loading state */}
                {loadingComments ? (
                  <p className="text-muted-foreground text-center py-8">Loading discussion...</p>
                ) : (
                  <>
                    {/* Horizontal Preview Mode - Shows first when not expanded */}
                    {!discussionExpanded && comments.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-muted-foreground">
                            {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
                          </h4>
                        </div>
                        
                        {/* Horizontal scroll preview of top comments */}
                        <ScrollArea className="w-full">
                          <div className="flex gap-3 pb-2">
                            {comments.slice(0, 5).map((comment: any) => (
                              <div
                                key={comment.id}
                                className="flex-shrink-0 w-64 p-3 bg-muted/50 rounded-xl border cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => setDiscussionExpanded(true)}
                              >
                                <div className="flex items-start gap-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarImage src={comment.user?.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {comment.user?.name?.[0]?.toUpperCase() || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{comment.user?.name || "Unknown"}</p>
                                    <p className="text-sm line-clamp-2 mt-0.5">{comment.body}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                                {(comment.replies?.length || 0) > 0 && (
                                  <p className="text-xs text-primary mt-2">
                                    {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>

                        {/* Expand button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setDiscussionExpanded(true)}
                        >
                          <ChevronDown className="h-4 w-4 mr-2" />
                          View All {comments.length} Comments
                        </Button>
                      </div>
                    )}

                    {/* No comments yet - show in collapsed mode */}
                    {!discussionExpanded && comments.length === 0 && (
                      <div className="text-center py-6">
                        <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground text-sm">No comments yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => setDiscussionExpanded(true)}
                        >
                          Start the Discussion
                        </Button>
                      </div>
                    )}

                    {/* Expanded Full Discussion View */}
                    {discussionExpanded && (
                      <>
                        {/* Collapse button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mb-2"
                          onClick={() => setDiscussionExpanded(false)}
                        >
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Collapse Discussion
                        </Button>

                        {/* Comment Input */}
                        {userId ? (
                          <div className="flex gap-2 items-start">
                            <Textarea
                              placeholder="Share your experience or ask a question..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="min-h-[60px] resize-none"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                                  e.preventDefault();
                                  handleSubmitComment();
                                }
                              }}
                            />
                            <Button
                              onClick={handleSubmitComment}
                              disabled={submittingComment || !newComment.trim()}
                              size="icon"
                              className="shrink-0"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center p-4 bg-muted rounded-lg">
                            <Link href="/auth/sign-in" className="text-primary hover:underline">
                              Sign in
                            </Link>{" "}
                            to join the discussion
                          </p>
                        )}

                        {/* Full Comments List - Instagram Style */}
                        {comments.length > 0 ? (
                          <div className="space-y-4">
                    {comments.map((comment) => {
                      const replyCount = comment.replies?.length || 0;
                      const isExpanded = expandedComments.has(comment.id);
                      const visibleReplies = isExpanded ? comment.replies : comment.replies?.slice(0, 2);
                      
                      return (
                        <div key={comment.id} className="space-y-2">
                          {/* Main Comment */}
                          <div className="flex gap-3">
                            <Link href={`/profile/${comment.user?.id}`}>
                              <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                                <AvatarImage src={comment.user?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {comment.user?.name?.[0]?.toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="flex-1 min-w-0">
                              <div className="bg-muted rounded-2xl px-4 py-2.5">
                                <Link 
                                  href={`/profile/${comment.user?.id}`}
                                  className="font-semibold text-sm hover:underline"
                                >
                                  {comment.user?.name || "Unknown"}
                                </Link>
                                <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.body}</p>
                              </div>
                              
                              {/* Comment Actions */}
                              <div className="flex items-center gap-4 mt-1 px-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                </span>
                                {userId && (
                                  <button
                                    onClick={() => setReplyingTo(
                                      replyingTo?.parentCommentId === comment.id && !replyingTo?.replyToId
                                        ? null 
                                        : { parentCommentId: comment.id }
                                    )}
                                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    Reply
                                  </button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="text-xs text-muted-foreground hover:text-foreground">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    {comment.user?.id === userId && (
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    )}
                                    {comment.user?.id !== userId && userId && (
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setReportingCommentId(comment.id);
                                          setReportDialogOpen(true);
                                        }}
                                        className="text-red-600"
                                      >
                                        <Flag className="h-4 w-4 mr-2" />
                                        Report
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>

                          {/* Reply Input - shown when replying to top-level comment */}
                          {replyingTo?.parentCommentId === comment.id && !replyingTo?.replyToId && (
                            <div className="ml-12 flex gap-2">
                              <Input
                                placeholder={`Reply to ${comment.user?.name || "user"}...`}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && replyText.trim()) {
                                    handleSubmitReply();
                                  } else if (e.key === "Escape") {
                                    setReplyingTo(null);
                                    setReplyText("");
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSubmitReply()}
                                disabled={submittingReply || !replyText.trim()}
                              >
                                {submittingReply ? "..." : "Post"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}

                          {/* Replies */}
                          {replyCount > 0 && (
                            <div className="ml-12 space-y-2">
                              {/* Show more replies toggle */}
                              {replyCount > 2 && !isExpanded && (
                                <button
                                  onClick={() => toggleExpandComment(comment.id)}
                                  className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
                                >
                                  <span className="h-px w-6 bg-muted-foreground/50" />
                                  View {replyCount - 2} more {replyCount - 2 === 1 ? "reply" : "replies"}
                                </button>
                              )}

                              {visibleReplies?.map((reply: any) => (
                                <div key={reply.id} className="space-y-2">
                                  <div className="flex gap-2">
                                    <Link href={`/profile/${reply.user?.id}`}>
                                      <Avatar className="h-7 w-7 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                                        <AvatarImage src={reply.user?.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">
                                          {reply.user?.name?.[0]?.toUpperCase() || "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                      <div className="bg-muted/60 rounded-2xl px-3 py-2">
                                        <Link 
                                          href={`/profile/${reply.user?.id}`}
                                          className="font-semibold text-xs hover:underline"
                                        >
                                          {reply.user?.name || "Unknown"}
                                        </Link>
                                        <p className="text-sm whitespace-pre-wrap break-words">{reply.body}</p>
                                      </div>
                                      <div className="flex items-center gap-4 mt-0.5 px-2">
                                        <span className="text-xs text-muted-foreground">
                                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                                        </span>
                                        {/* Reply to reply button */}
                                        {userId && (
                                          <button
                                            onClick={() => setReplyingTo(
                                              replyingTo?.replyToId === reply.id
                                                ? null
                                                : { 
                                                    parentCommentId: comment.id, 
                                                    replyToId: reply.id, 
                                                    replyToName: reply.user?.name 
                                                  }
                                            )}
                                            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            Reply
                                          </button>
                                        )}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button className="text-xs text-muted-foreground hover:text-foreground">
                                              <MoreHorizontal className="h-3 w-3" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="start">
                                            {reply.user?.id === userId && (
                                              <DropdownMenuItem 
                                                onClick={() => handleDeleteComment(reply.id, true, comment.id)}
                                                className="text-red-600"
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                              </DropdownMenuItem>
                                            )}
                                            {reply.user?.id !== userId && userId && (
                                              <DropdownMenuItem 
                                                onClick={() => {
                                                  setReportingCommentId(reply.id);
                                                  setReportDialogOpen(true);
                                                }}
                                                className="text-red-600"
                                              >
                                                <Flag className="h-4 w-4 mr-2" />
                                                Report
                                              </DropdownMenuItem>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Reply input for replying to a reply */}
                                  {replyingTo?.replyToId === reply.id && (
                                    <div className="ml-9 flex gap-2">
                                      <Input
                                        placeholder={`Reply to ${reply.user?.name || "user"}...`}
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        className="text-sm"
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && replyText.trim()) {
                                            handleSubmitReply();
                                          } else if (e.key === "Escape") {
                                            setReplyingTo(null);
                                            setReplyText("");
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => handleSubmitReply()}
                                        disabled={submittingReply || !replyText.trim()}
                                      >
                                        {submittingReply ? "..." : "Post"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setReplyingTo(null);
                                          setReplyText("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* Hide replies toggle */}
                              {isExpanded && replyCount > 2 && (
                                <button
                                  onClick={() => toggleExpandComment(comment.id)}
                                  className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
                                >
                                  <span className="h-px w-6 bg-muted-foreground/50" />
                                  Hide replies
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                              No comments yet. Be the first to share your thoughts!
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
        
        {/* Report Comment Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Comment</DialogTitle>
              <DialogDescription>
                Please tell us why you're reporting this comment. Our moderation team will review it.
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
      </SheetContent>
    </Sheet>
  );
}
