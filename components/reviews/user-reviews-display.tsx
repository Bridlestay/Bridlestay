"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, ThumbsUp } from "lucide-react";
import { format } from "date-fns";

interface UserReviewsDisplayProps {
  userId: string;
}

export function UserReviewsDisplay({ userId }: UserReviewsDisplayProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchReviews();
  }, [userId]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching user reviews:", error);
    } finally {
      setLoading(false);
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
            This user hasn't received any reviews from hosts yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {stats.averageRating.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalReviews}</div>
                <div className="text-sm text-muted-foreground">Total Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.recommendationRate}%
                </div>
                <div className="text-sm text-muted-foreground">Would Host Again</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalStays}</div>
                <div className="text-sm text-muted-foreground">Stays Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            Reviews from Hosts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {reviews.map((review, index) => (
            <div key={review.id}>
              {index > 0 && <Separator className="my-6" />}
              
              {/* Host Info */}
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={review.reviewer?.avatar_url || undefined}
                    alt={review.reviewer?.name}
                  />
                  <AvatarFallback>
                    {review.reviewer?.name?.[0]?.toUpperCase() || "H"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{review.reviewer?.name || "Host"}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(review.created_at), "MMMM yyyy")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {renderStars(review.overall_rating)}
                      {review.would_recommend && (
                        <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                          <ThumbsUp className="h-3 w-3" />
                          Would host again
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Ratings */}
              {(review.communication_rating || review.cleanliness_rating || review.respect_rating) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {review.communication_rating && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Communication:</span>{" "}
                      <span className="font-medium">{review.communication_rating}/5</span>
                    </div>
                  )}
                  {review.cleanliness_rating && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Cleanliness:</span>{" "}
                      <span className="font-medium">{review.cleanliness_rating}/5</span>
                    </div>
                  )}
                  {review.respect_rating && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Respect:</span>{" "}
                      <span className="font-medium">{review.respect_rating}/5</span>
                    </div>
                  )}
                </div>
              )}

              {/* Review Text */}
              {review.review_text && (
                <p className="text-sm leading-relaxed">{review.review_text}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

