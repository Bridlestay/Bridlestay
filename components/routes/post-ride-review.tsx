"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Star, Trophy, Clock, Ruler, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PostRideReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  routeTitle: string;
  rideStats: {
    distance_km: number;
    duration_minutes: number;
    avg_speed_kmh?: number;
  };
  onSubmit: (review: {
    rating: number;
    difficulty: string;
    review_text: string;
  }) => Promise<void>;
}

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy", emoji: "😊", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "moderate", label: "Moderate", emoji: "🙂", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "difficult", label: "Difficult", emoji: "😤", color: "bg-orange-100 text-orange-700 border-orange-300" },
];

export function PostRideReview({
  open,
  onOpenChange,
  routeId,
  routeTitle,
  rideStats,
  onSubmit,
}: PostRideReviewProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [difficulty, setDifficulty] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    if (!difficulty) {
      toast.error("Please rate the difficulty");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        rating,
        difficulty,
        review_text: reviewText.trim(),
      });
      toast.success("Thanks for your review!");
      onOpenChange(false);
      // Reset form
      setRating(0);
      setDifficulty("");
      setReviewText("");
    } catch (error) {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Route Completed! 🎉</DialogTitle>
          <DialogDescription className="text-center">
            Great ride on <span className="font-medium text-foreground">{routeTitle}</span>!
          </DialogDescription>
        </DialogHeader>

        {/* Ride stats */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <Ruler className="h-4 w-4 mx-auto text-gray-500 mb-1" />
            <p className="text-lg font-bold">{rideStats.distance_km.toFixed(1)}</p>
            <p className="text-xs text-gray-500">km</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <Clock className="h-4 w-4 mx-auto text-gray-500 mb-1" />
            <p className="text-lg font-bold">{formatDuration(rideStats.duration_minutes)}</p>
            <p className="text-xs text-gray-500">duration</p>
          </div>
          {rideStats.avg_speed_kmh && (
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <TrendingUp className="h-4 w-4 mx-auto text-gray-500 mb-1" />
              <p className="text-lg font-bold">{rideStats.avg_speed_kmh.toFixed(1)}</p>
              <p className="text-xs text-gray-500">km/h</p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* Star rating */}
          <div>
            <Label className="text-sm font-medium mb-2 block">How would you rate this route?</Label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-10 w-10 transition-colors",
                      (hoveredRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-gray-600 mt-2">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent!"}
              </p>
            )}
          </div>

          {/* Difficulty rating */}
          <div>
            <Label className="text-sm font-medium mb-2 block">How difficult did you find it?</Label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDifficulty(opt.value)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-center",
                    difficulty === opt.value
                      ? opt.color + " border-current"
                      : "bg-gray-50 border-transparent hover:bg-gray-100"
                  )}
                >
                  <span className="text-2xl block">{opt.emoji}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Written review */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Write a review <span className="text-gray-400">(optional)</span>
            </Label>
            <Textarea
              placeholder="Share your experience with other riders..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

