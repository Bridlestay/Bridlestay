"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "./star-rating";
import { useToast } from "@/hooks/use-toast";

interface PropertyReviewFormProps {
  propertyId: string;
  propertyName: string;
  bookingId: string;
  onReviewSubmitted?: () => void;
}

export function PropertyReviewForm({
  propertyId,
  propertyName,
  bookingId,
  onReviewSubmitted,
}: PropertyReviewFormProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [accuracyRating, setAccuracyRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [locationRating, setLocationRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [stableQualityRating, setStableQualityRating] = useState(0);
  const [turnoutQualityRating, setTurnoutQualityRating] = useState(0);
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
      const response = await fetch("/api/reviews/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          bookingId,
          overallRating,
          cleanlinessRating: cleanlinessRating || null,
          accuracyRating: accuracyRating || null,
          communicationRating: communicationRating || null,
          locationRating: locationRating || null,
          valueRating: valueRating || null,
          stableQualityRating: stableQualityRating || null,
          turnoutQualityRating: turnoutQualityRating || null,
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
        <CardTitle>Review your stay at {propertyName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div>
            <Label className="text-lg font-semibold">
              Overall Rating <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2">
              <StarRating rating={overallRating} onRatingChange={setOverallRating} size="lg" />
            </div>
          </div>

          {/* Detailed Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Cleanliness</Label>
              <StarRating rating={cleanlinessRating} onRatingChange={setCleanlinessRating} />
            </div>
            <div>
              <Label>Accuracy</Label>
              <StarRating rating={accuracyRating} onRatingChange={setAccuracyRating} />
            </div>
            <div>
              <Label>Communication</Label>
              <StarRating rating={communicationRating} onRatingChange={setCommunicationRating} />
            </div>
            <div>
              <Label>Location</Label>
              <StarRating rating={locationRating} onRatingChange={setLocationRating} />
            </div>
            <div>
              <Label>Value</Label>
              <StarRating rating={valueRating} onRatingChange={setValueRating} />
            </div>
          </div>

          {/* Equestrian-specific */}
          <div className="border-t pt-4">
            <Label className="font-semibold mb-2 block">Equestrian Facilities</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Stable Quality</Label>
                <StarRating rating={stableQualityRating} onRatingChange={setStableQualityRating} />
              </div>
              <div>
                <Label>Turnout Quality</Label>
                <StarRating rating={turnoutQualityRating} onRatingChange={setTurnoutQualityRating} />
              </div>
            </div>
          </div>

          {/* Written Review */}
          <div>
            <Label>Your Review</Label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience..."
              rows={6}
              className="mt-2"
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}



