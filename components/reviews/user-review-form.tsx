"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StarRating } from "./star-rating";
import { useToast } from "@/hooks/use-toast";

interface UserReviewFormProps {
  userId: string;
  userName: string;
  bookingId: string;
  onReviewSubmitted?: () => void;
}

export function UserReviewForm({
  userId,
  userName,
  bookingId,
  onReviewSubmitted,
}: UserReviewFormProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [respectRating, setRespectRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (overallRating === 0) {
      toast({
        variant: "destructive",
        title: "Rating required",
        description: "Please provide an overall rating",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/reviews/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewedUserId: userId,
          bookingId,
          overallRating,
          communicationRating: communicationRating || null,
          cleanlinessRating: cleanlinessRating || null,
          respectRating: respectRating || null,
          wouldRecommend,
          reviewText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });

      onReviewSubmitted?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review {userName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div>
            <Label className="text-lg font-semibold">
              Overall Experience <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2">
              <StarRating rating={overallRating} onRatingChange={setOverallRating} size="lg" />
            </div>
          </div>

          {/* Detailed Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Communication</Label>
              <StarRating rating={communicationRating} onRatingChange={setCommunicationRating} />
            </div>
            <div>
              <Label>Cleanliness</Label>
              <StarRating rating={cleanlinessRating} onRatingChange={setCleanlinessRating} />
            </div>
            <div>
              <Label>Respectfulness</Label>
              <StarRating rating={respectRating} onRatingChange={setRespectRating} />
            </div>
          </div>

          {/* Written Review */}
          <div>
            <Label>Your Review</Label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience..."
              rows={5}
              className="mt-2"
            />
          </div>

          {/* Would Recommend */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="recommend"
              checked={wouldRecommend}
              onCheckedChange={(checked) => setWouldRecommend(checked as boolean)}
            />
            <Label htmlFor="recommend" className="cursor-pointer">
              I would host {userName} again
            </Label>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}



