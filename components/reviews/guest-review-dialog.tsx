"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface GuestReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  onSuccess: () => void;
}

export function GuestReviewDialog({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: GuestReviewDialogProps) {
  const [ratings, setRatings] = useState({
    overall_rating: 0,
    communication_rating: 0,
    cleanliness_rating: 0,
    respect_rating: 0,
  });
  const [reviewText, setReviewText] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleStarClick = (category: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [category]: rating }));
  };

  const handleSubmit = async () => {
    if (ratings.overall_rating === 0) {
      toast.error("Please provide an overall rating");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews/user/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          reviewedUserId: booking.guest.id,
          ...ratings,
          review_text: reviewText,
          would_recommend: wouldRecommend,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit review");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({
    label,
    category,
    value,
  }: {
    label: string;
    category: string;
    value: number;
  }) => (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(category, star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`h-6 w-6 ${
                star <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Review {booking?.guest?.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Share your experience hosting {booking?.guest?.name}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Rating - Required */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <StarRating
              label="Overall rating *"
              category="overall_rating"
              value={ratings.overall_rating}
            />
          </div>

          {/* Detailed Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StarRating
              label="Communication"
              category="communication_rating"
              value={ratings.communication_rating}
            />
            <StarRating
              label="Cleanliness"
              category="cleanliness_rating"
              value={ratings.cleanliness_rating}
            />
            <StarRating
              label="Respect for property"
              category="respect_rating"
              value={ratings.respect_rating}
            />
          </div>

          {/* Would Recommend */}
          <div className="flex items-center space-x-2 p-4 border rounded-lg">
            <Checkbox
              id="recommend"
              checked={wouldRecommend}
              onCheckedChange={(checked) => setWouldRecommend(checked as boolean)}
            />
            <Label
              htmlFor="recommend"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I would host {booking?.guest?.name} again
            </Label>
          </div>

          {/* Review Text */}
          <div>
            <Label htmlFor="review-text">Your review (optional)</Label>
            <Textarea
              id="review-text"
              placeholder="Share details about your guest..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={6}
              className="mt-2"
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reviewText.length}/2000 characters
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || ratings.overall_rating === 0}
              className="flex-1"
            >
              {submitting ? "Submitting..." : "Submit review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
