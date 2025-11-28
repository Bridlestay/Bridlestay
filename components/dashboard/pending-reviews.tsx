"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";

interface PendingReview {
  id: string;
  property_name: string;
  property_id: string;
  check_out: string;
  guest_name?: string;
  guest_id?: string;
  type: "property" | "user";
}

export function PendingReviews({ userId, userRole }: { userId: string; userRole: string }) {
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingReviews();
  }, [userId]);

  const fetchPendingReviews = async () => {
    try {
      const response = await fetch(`/api/reviews/pending?userId=${userId}&role=${userRole}`);
      const data = await response.json();

      if (response.ok) {
        setPendingReviews(data.pendingReviews || []);
      }
    } catch (error) {
      console.error("Error fetching pending reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Pending Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (pendingReviews.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Pending Reviews ({pendingReviews.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingReviews.map((review) => (
          <div
            key={review.id}
            className="flex items-center justify-between p-3 bg-muted rounded-lg"
          >
            <div className="flex-1">
              <p className="font-medium">
                {review.type === "property" ? review.property_name : `${review.guest_name}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {review.type === "property" 
                  ? "Rate your recent stay" 
                  : "Review your guest"}
              </p>
              <p className="text-xs text-muted-foreground">
                Checked out {new Date(review.check_out).toLocaleDateString()}
              </p>
            </div>
            <Link href={`/bookings/${review.id}/review`}>
              <Button size="sm">
                Leave Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}



