"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Camera, Send, Trash2 } from "lucide-react";
import Image from "next/image";

interface RoutePointComment {
  id: string;
  lat: number;
  lng: number;
  content: string;
  image_url?: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

interface AddCommentDialogProps {
  open: boolean;
  onClose: () => void;
  routeId: string;
  lat: number;
  lng: number;
  onSuccess: () => void;
}

export function AddCommentDialog({
  open,
  onClose,
  routeId,
  lat,
  lng,
  onSuccess,
}: AddCommentDialogProps) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("routeId", routeId);
      formData.append("lat", lat.toString());
      formData.append("lng", lng.toString());
      formData.append("content", content);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await fetch("/api/routes/comments", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add comment");
      }

      toast.success("Comment added!");
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Add Comment
          </DialogTitle>
          <DialogDescription>
            Share a tip, warning, or point of interest at this location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm">
            <span className="font-mono text-xs text-muted-foreground">
              📍 {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Your comment</Label>
            <Textarea
              id="comment"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Great viewpoint here! or Watch out for muddy section..."
              rows={4}
              maxLength={1000}
            />
            <span className="text-xs text-muted-foreground">
              {content.length}/1000
            </span>
          </div>

          <div className="space-y-2">
            <Label>Add photo (optional)</Label>
            {imagePreview ? (
              <div className="relative w-full h-40 rounded-lg overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Click to upload photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !content.trim()}>
            {submitting ? "Posting..." : "Post Comment"}
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RoutePointCommentsListProps {
  comments: RoutePointComment[];
  currentUserId?: string;
  onDelete?: (commentId: string) => void;
}

export function RoutePointCommentsList({
  comments,
  currentUserId,
  onDelete,
}: RoutePointCommentsListProps) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No comments on this route yet</p>
        <p className="text-sm">Click on the map to add a comment at a specific point</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <Card key={comment.id} className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={comment.user.avatar_url} />
              <AvatarFallback>
                {comment.user.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{comment.user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 mb-2">
                <MapPin className="h-3 w-3" />
                {comment.lat.toFixed(4)}, {comment.lng.toFixed(4)}
              </div>

              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

              {comment.image_url && (
                <div className="mt-3 relative h-48 rounded-lg overflow-hidden">
                  <Image
                    src={comment.image_url}
                    alt="Comment photo"
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {currentUserId === comment.user.id && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-destructive hover:text-destructive"
                  onClick={() => onDelete(comment.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

