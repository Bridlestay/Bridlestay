"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

interface TripsSectionProps {
  bookings: any[];
}

export function TripsSection({ bookings }: TripsSectionProps) {
  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-serif text-2xl font-bold mb-2">
          No trips yet
        </h3>
        <p className="text-muted-foreground">
          Your completed trips will appear here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="font-serif text-3xl font-bold mb-2">
          Where I&apos;ve been
        </h2>
        <p className="text-muted-foreground">
          {bookings.length} {bookings.length === 1 ? "trip" : "trips"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.map((booking) => (
          <Card
            key={booking.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                <MapPin className="h-12 w-12 text-muted-foreground" />
              </div>

              <h3 className="font-semibold mb-1">
                {booking.properties?.city || "Unknown"}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {booking.properties?.county || "United Kingdom"}
              </p>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(booking.end_date), "MMMM yyyy")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

