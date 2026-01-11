"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Calendar, AlertTriangle, Clock, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { format, differenceInHours, isAfter, isBefore, addHours } from "date-fns";
import { IssueReportForm } from "@/components/booking/issue-report-form";

interface TripsSectionProps {
  bookings: any[];
}

type BookingStatus = "upcoming" | "active" | "in_resolution_window" | "completed" | "cancelled";

export function TripsSection({ bookings }: TripsSectionProps) {
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showIssueForm, setShowIssueForm] = useState(false);

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

  const getBookingStatus = (booking: any): BookingStatus => {
    if (booking.status === "cancelled") return "cancelled";
    
    const now = new Date();
    const checkIn = new Date(booking.start_date);
    const checkOut = new Date(booking.end_date);
    const resolutionEnd = addHours(checkIn, 48);
    
    if (isBefore(now, checkIn)) return "upcoming";
    if (isAfter(now, checkIn) && isBefore(now, resolutionEnd)) return "in_resolution_window";
    if (isAfter(now, checkIn) && isBefore(now, checkOut)) return "active";
    return "completed";
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="h-3 w-3 mr-1" />Upcoming</Badge>;
      case "active":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case "in_resolution_window":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><AlertTriangle className="h-3 w-3 mr-1" />Report window open</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
    }
  };

  const canReportIssue = (booking: any) => {
    const status = getBookingStatus(booking);
    return status === "in_resolution_window";
  };

  // Separate into upcoming and past
  const now = new Date();
  const upcomingBookings = bookings.filter(b => new Date(b.start_date) > now && b.status !== "cancelled");
  const activeBookings = bookings.filter(b => {
    const checkIn = new Date(b.start_date);
    const checkOut = new Date(b.end_date);
    return checkIn <= now && checkOut > now && b.status !== "cancelled";
  });
  const pastBookings = bookings.filter(b => new Date(b.end_date) <= now || b.status === "cancelled");

  return (
    <>
      <div className="mb-8">
        <h2 className="font-serif text-3xl font-bold mb-2">
          My Trips
        </h2>
        <p className="text-muted-foreground">
          {bookings.length} {bookings.length === 1 ? "trip" : "trips"}
        </p>
      </div>

      {/* Active Trips */}
      {activeBookings.length > 0 && (
        <div className="mb-8">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Current Stay
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeBookings.map((booking) => {
              const status = getBookingStatus(booking);
              return (
                <Card key={booking.id} className="border-green-200 bg-green-50/30">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {booking.properties?.name || booking.properties?.city || "Property"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {booking.properties?.city}, {booking.properties?.county}
                        </p>
                      </div>
                      {getStatusBadge(status)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(booking.start_date), "MMM d")} - {format(new Date(booking.end_date), "MMM d, yyyy")}
                    </div>

                    {status === "in_resolution_window" && (
                      <div className="mt-4">
                        <p className="text-sm text-amber-700 mb-2">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          You have {Math.round(differenceInHours(addHours(new Date(booking.start_date), 48), now))} hours to report any issues.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowIssueForm(true);
                          }}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Report an Issue
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Trips */}
      {upcomingBookings.length > 0 && (
        <div className="mb-8">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Upcoming
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingBookings.map((booking) => {
              const status = getBookingStatus(booking);
              return (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold">
                        {booking.properties?.name || booking.properties?.city || "Property"}
                      </h3>
                      {getStatusBadge(status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {booking.properties?.city}, {booking.properties?.county}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(booking.start_date), "MMM d")} - {format(new Date(booking.end_date), "MMM d, yyyy")}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Trips */}
      {pastBookings.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            Where I&apos;ve been
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastBookings.map((booking) => {
              const status = getBookingStatus(booking);
              return (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">
                        {booking.properties?.city || "Unknown"}
                      </h3>
                      {getStatusBadge(status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {booking.properties?.county || "United Kingdom"}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(booking.end_date), "MMMM yyyy")}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Issue Report Dialog */}
      <Dialog open={showIssueForm} onOpenChange={setShowIssueForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <IssueReportForm
              bookingId={selectedBooking.id}
              propertyName={selectedBooking.properties?.name || "Property"}
              checkInDate={new Date(selectedBooking.start_date)}
              onSuccess={() => {
                setShowIssueForm(false);
                setSelectedBooking(null);
              }}
              onCancel={() => {
                setShowIssueForm(false);
                setSelectedBooking(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

