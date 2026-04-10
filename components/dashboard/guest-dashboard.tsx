"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatGBP } from "@/lib/fees";
import { format } from "date-fns";
import { PendingReviews } from "./pending-reviews";

export function GuestDashboard({ user }: { user: any }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("bookings")
        .select(
          `
          *,
          properties (name, county, city)
        `
        )
        .eq("guest_id", user.id)
        .order("created_at", { ascending: false });

      setBookings(data || []);
      setLoading(false);
    };

    fetchBookings();
  }, [user.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-primary";
      case "requested":
        return "bg-yellow-600";
      case "declined":
        return "bg-red-600";
      case "cancelled":
        return "bg-gray-600";
      case "completed":
        return "bg-blue-600";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Reviews */}
      <PendingReviews userId={user.id} userRole={user.role || "guest"} />
      
      <Card>
        <CardHeader>
          <CardTitle>Your Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No bookings yet</p>
              <Button className="mt-4" asChild>
                <a href="/search">Find Properties</a>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{booking.properties.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.properties.city}, {booking.properties.county}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(booking.start_date), "MMM d, yyyy")}</p>
                        <p className="text-muted-foreground">
                          to {format(new Date(booking.end_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatGBP(booking.total_charge_pennies)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {booking.status === "completed" && (
                        <Button size="sm" variant="outline">
                          Leave Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

