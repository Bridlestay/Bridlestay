"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronRight, Clock } from "lucide-react";
import { PropertyReviewDialog } from "@/components/reviews/property-review-dialog";
import { GuestReviewDialog } from "@/components/reviews/guest-review-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";

export function ReviewsSection({ userId }: { userId: string }) {
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [pastReviews, setPastReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [userId]);

  const fetchReviews = async () => {
    try {
      // Get reviewable bookings
      const res1 = await fetch("/api/reviews/reviewable-bookings");
      if (res1.ok) {
        const data = await res1.json();
        setPendingReviews(data.bookings || []);
      }

      // Get past reviews written by user
      const res2 = await fetch(`/api/reviews/written-by-user/${userId}`);
      if (res2.ok) {
        const data = await res2.json();
        setPastReviews(data.reviews || []);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmitted = () => {
    setDialogOpen(false);
    setSelectedBooking(null);
    fetchReviews();
    toast.success("Review submitted successfully!");
  };

  const calculateDaysLeft = (endDate: string) => {
    const checkout = new Date(endDate);
    const deadline = new Date(checkout);
    deadline.setDate(deadline.getDate() + 14);
    
    const now = new Date();
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Reviews</h2>
          <p className="text-muted-foreground">
            Manage your reviews and see what others have said about you
          </p>
        </div>

        {/* Pending Reviews to Write */}
        {pendingReviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Reviews to write
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingReviews.slice(0, 3).map((booking) => {
                const daysLeft = calculateDaysLeft(booking.end_date);
                const isUrgent = daysLeft <= 3;

                return (
                  <div
                    key={booking.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {booking.reviewType === "property" ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {booking.property?.main_image_url ? (
                          <img
                            src={booking.property.main_image_url}
                            alt={booking.property.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            🏠
                          </div>
                        )}
                      </div>
                    ) : (
                      <Avatar className="w-16 h-16">
                        <AvatarImage
                          src={booking.guest?.avatar_url || undefined}
                          alt={booking.guest?.name}
                        />
                        <AvatarFallback className="text-xl">
                          {booking.guest?.name?.[0]?.toUpperCase() || "G"}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {booking.reviewType === "property"
                              ? booking.property?.name
                              : booking.guest?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(booking.end_date), "MMMM d, yyyy")}
                          </p>
                        </div>
                        <Badge
                          variant={isUrgent ? "destructive" : "secondary"}
                          className="flex items-center gap-1 flex-shrink-0"
                        >
                          {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                        </Badge>
                      </div>

                      <Button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setDialogOpen(true);
                        }}
                        size="sm"
                        className="mt-3"
                      >
                        Write review
                      </Button>
                    </div>
                  </div>
                );
              })}

              {pendingReviews.length > 3 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/profile/reviews">
                    See all {pendingReviews.length} pending reviews
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Past Reviews Written */}
        {pastReviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Past reviews you've written</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pastReviews.slice(0, 3).map((review) => (
                <div
                  key={review.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage
                      src={review.property?.main_image_url || review.reviewed_user?.avatar_url || undefined}
                      alt={review.property?.name || review.reviewed_user?.name}
                    />
                    <AvatarFallback>
                      {(review.property?.name || review.reviewed_user?.name)?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold">
                          {review.property?.name || review.reviewed_user?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(review.created_at), "MMMM yyyy")}
                        </p>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.overall_rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {review.review_text}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full" asChild>
                <Link href="/profile/reviews">
                  See all reviews
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {pendingReviews.length === 0 && pastReviews.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
              <p className="text-muted-foreground">
                Reviews from your stays will appear here
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Property Review Dialog */}
      {selectedBooking?.reviewType === "property" && (
        <PropertyReviewDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          booking={selectedBooking}
          onSuccess={handleReviewSubmitted}
        />
      )}

      {/* Guest Review Dialog */}
      {selectedBooking?.reviewType === "guest" && (
        <GuestReviewDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          booking={selectedBooking}
          onSuccess={handleReviewSubmitted}
        />
      )}
    </>
  );
}

