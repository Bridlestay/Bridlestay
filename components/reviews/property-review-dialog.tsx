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
import { toast } from "sonner";

interface PropertyReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  onSuccess: () => void;
}

export function PropertyReviewDialog({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: PropertyReviewDialogProps) {
  const [ratings, setRatings] = useState({
    overall_rating: 0,
    cleanliness_rating: 0,
    accuracy_rating: 0,
    communication_rating: 0,
    location_rating: 0,
    value_rating: 0,
    stable_quality_rating: 0,
    turnout_quality_rating: 0,
  });
  const [reviewText, setReviewText] = useState("");
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
      const res = await fetch("/api/reviews/property/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          propertyId: booking.property.id,
          ...ratings,
          review_text: reviewText,
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
            Review {booking?.property?.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Share your experience to help other travelers
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
              label="Cleanliness"
              category="cleanliness_rating"
              value={ratings.cleanliness_rating}
            />
            <StarRating
              label="Accuracy"
              category="accuracy_rating"
              value={ratings.accuracy_rating}
            />
            <StarRating
              label="Communication"
              category="communication_rating"
              value={ratings.communication_rating}
            />
            <StarRating
              label="Location"
              category="location_rating"
              value={ratings.location_rating}
            />
            <StarRating
              label="Value"
              category="value_rating"
              value={ratings.value_rating}
            />
          </div>

          {/* Equestrian-specific ratings */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-4">Equestrian Facilities</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StarRating
                label="Stable Quality"
                category="stable_quality_rating"
                value={ratings.stable_quality_rating}
              />
              <StarRating
                label="Turnout Quality"
                category="turnout_quality_rating"
                value={ratings.turnout_quality_rating}
              />
            </div>
          </div>

          {/* Review Text */}
          <div>
            <Label htmlFor="review-text">Your review (optional)</Label>
            <Textarea
              id="review-text"
              placeholder="Share details about your stay..."
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
