"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Home, User, Calendar, Clock } from "lucide-react";
import { PropertyReviewDialog } from "./property-review-dialog";
import { GuestReviewDialog } from "./guest-review-dialog";
import { toast } from "sonner";
import { format } from "date-fns";

export function ReviewsList() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchReviewableBookings();
  }, []);

  const fetchReviewableBookings = async () => {
    try {
      const res = await fetch("/api/reviews/reviewable-bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Error fetching reviewable bookings:", error);
      toast.error("Failed to load reviewable bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmitted = () => {
    setDialogOpen(false);
    setSelectedBooking(null);
    fetchReviewableBookings();
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

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pending Reviews</h3>
          <p className="text-muted-foreground">
            You don't have any stays to review right now. Reviews must be submitted within 14 days after checkout.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {bookings.map((booking) => {
          const daysLeft = calculateDaysLeft(booking.end_date);
          const isUrgent = daysLeft <= 3;

          return (
            <Card key={booking.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Image/Avatar */}
                  <div className="flex-shrink-0">
                    {booking.reviewType === "property" ? (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted">
                        {booking.property?.main_image_url ? (
                          <img
                            src={booking.property.main_image_url}
                            alt={booking.property.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <Avatar className="w-24 h-24">
                        <AvatarImage
                          src={booking.guest?.avatar_url || undefined}
                          alt={booking.guest?.name}
                        />
                        <AvatarFallback className="text-2xl">
                          {booking.guest?.name?.[0]?.toUpperCase() || "G"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">
                          {booking.reviewType === "property"
                            ? booking.property?.name
                            : booking.guest?.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(booking.start_date), "MMM d")} -{" "}
                            {format(new Date(booking.end_date), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={isUrgent ? "destructive" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                      </Badge>
                    </div>

                    {booking.reviewType === "property" && booking.property?.host && (
                      <div className="flex items-center gap-2 mb-3">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={booking.property.host.avatar_url || undefined}
                            alt={booking.property.host.name}
                          />
                          <AvatarFallback>
                            {booking.property.host.name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          Hosted by {booking.property.host.name}
                        </span>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setDialogOpen(true);
                      }}
                      className="w-full sm:w-auto"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      {booking.reviewType === "property"
                        ? "Review Property"
                        : "Review Guest"}
                    </Button>
                  </div>
                </div>

                {isUrgent && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive font-medium">
                      ⏰ Urgent: Review period expires in {daysLeft}{" "}
                      {daysLeft === 1 ? "day" : "days"}!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
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
