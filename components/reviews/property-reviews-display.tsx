"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PropertyReviewsDisplayProps {
  propertyId: string;
  hostId?: string;
  currentUserId?: string;
}

export function PropertyReviewsDisplay({
  propertyId,
  hostId,
  currentUserId,
}: PropertyReviewsDisplayProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isHost = currentUserId && currentUserId === hostId;

  useEffect(() => {
    fetchReviews();
  }, [propertyId]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews/property/${propertyId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async (reviewId: string) => {
    if (!responseText.trim()) {
      toast.error("Please enter a response");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews/property/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          response: responseText.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit response");
      }

      toast.success("Response submitted successfully!");
      setRespondingTo(null);
      setResponseText("");
      fetchReviews();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
          <p className="text-muted-foreground">
            Be the first to review this property after your stay!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            {reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {reviews.map((review, index) => (
            <div key={review.id}>
              {index > 0 && <Separator className="my-6" />}
              
              {/* Reviewer Info */}
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={review.users?.avatar_url || undefined}
                    alt={review.users?.name}
                  />
                  <AvatarFallback>
                    {review.users?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{review.users?.name || "Guest"}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(review.created_at), "MMMM yyyy")}
                      </p>
                    </div>
                    {renderStars(review.overall_rating)}
                  </div>
                </div>
              </div>

              {/* Category Ratings */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {review.cleanliness_rating && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Cleanliness:</span>{" "}
                    <span className="font-medium">{review.cleanliness_rating}/5</span>
                  </div>
                )}
                {review.accuracy_rating && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Accuracy:</span>{" "}
                    <span className="font-medium">{review.accuracy_rating}/5</span>
                  </div>
                )}
                {review.communication_rating && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Communication:</span>{" "}
                    <span className="font-medium">{review.communication_rating}/5</span>
                  </div>
                )}
                {review.location_rating && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Location:</span>{" "}
                    <span className="font-medium">{review.location_rating}/5</span>
                  </div>
                )}
                {review.value_rating && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Value:</span>{" "}
                    <span className="font-medium">{review.value_rating}/5</span>
                  </div>
                )}
                {review.stable_quality_rating && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Stables:</span>{" "}
                    <span className="font-medium">{review.stable_quality_rating}/5</span>
                  </div>
                )}
                {review.turnout_quality_rating && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Turnout:</span>{" "}
                    <span className="font-medium">{review.turnout_quality_rating}/5</span>
                  </div>
                )}
              </div>

              {/* Review Text */}
              {review.review_text && (
                <p className="text-sm leading-relaxed mb-4">{review.review_text}</p>
              )}

              {/* Host Response */}
              {review.host_response && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1">Response from host</p>
                      <p className="text-sm">{review.host_response}</p>
                      {review.host_response_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(review.host_response_at), "MMMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Host Response Form */}
              {isHost && !review.host_response && (
                <div className="mt-4">
                  {respondingTo === review.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Write your response..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={4}
                        maxLength={1000}
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          {responseText.length}/1000 characters
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRespondingTo(null);
                              setResponseText("");
                            }}
                            disabled={submitting}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSubmitResponse(review.id)}
                            disabled={submitting}
                          >
                            {submitting ? "Submitting..." : "Submit Response"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRespondingTo(review.id)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Respond
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

