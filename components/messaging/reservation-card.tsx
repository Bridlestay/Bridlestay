"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Users, Loader2, ExternalLink, Hash, Moon, ShieldAlert } from "lucide-react";
import { formatGBP } from "@/lib/fees";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";
import Image from "next/image";

interface ReservationCardProps {
  propertyId: string;
  otherUserId: string;
}

export function ReservationCard({ propertyId, otherUserId }: ReservationCardProps) {
  const [booking, setBooking] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, [propertyId, otherUserId]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(
        `/api/messages/booking-details?propertyId=${propertyId}&otherUserId=${otherUserId}`
      );
      const data = await response.json();

      if (response.ok) {
        setBooking(data.booking);
        setProperty(data.booking?.properties || data.property);
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!property) {
    return null;
  }

  // Check if property is removed
  const isRemoved = property.removed === true;

  // Sort photos by sort_order and get the first one as cover
  const sortedPhotos = property.property_photos?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [];
  const coverPhoto = sortedPhotos[0];
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
      case "confirmed":
        return "bg-green-600";
      case "requested":
        return "bg-orange-600";
      case "cancelled":
      case "declined":
        return "bg-red-600";
      case "completed":
        return "bg-blue-600";
      default:
        return "bg-gray-600";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "accepted":
        return "Accepted";
      case "requested":
        return "Pending";
      case "declined":
        return "Declined";
      case "cancelled":
        return "Cancelled";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "accepted":
        return "Your reservation is confirmed! The host has accepted your booking.";
      case "requested":
        return "Awaiting host confirmation. You'll be notified once the host responds.";
      case "declined":
        return "The host declined this booking request.";
      case "cancelled":
        return "This reservation has been cancelled.";
      case "completed":
        return "This reservation has ended. We hope you had a great stay!";
      default:
        return "";
    }
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{booking ? "Reservation" : "Property"}</span>
          {booking && (
            <Badge className={getStatusColor(booking.status)}>
              {getStatusText(booking.status)}
            </Badge>
          )}
        </CardTitle>
        {booking && (
          <p className="text-xs text-muted-foreground pt-2">
            {getStatusMessage(booking.status)}
          </p>
        )}
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="space-y-4 pb-6">
        {/* Property Removed Notice */}
        {isRemoved && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-800 text-sm">Property Removed</h4>
                <p className="text-red-700 text-xs mt-1">
                  This property has been removed from padoq by an administrator.
                  {property.removal_reason && (
                    <span className="block mt-1">
                      <strong>Reason:</strong> {property.removal_reason}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Property Image */}
        {coverPhoto?.url && (
          <div className={`relative h-40 rounded-lg overflow-hidden ${isRemoved ? 'opacity-60' : ''}`}>
            <Image
              src={coverPhoto.url}
              alt={property.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Property Name */}
        <div className={isRemoved ? 'opacity-60' : ''}>
          <h3 className="font-semibold text-base mb-1">{property.name}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {property.city}, {property.county}
          </p>
        </div>

        {/* Booking Details */}
        {booking ? (
          <div className="space-y-4 pt-2 border-t">
            {/* Confirmation Code */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Hash className="h-3 w-3" />
                <span className="font-medium">Confirmation code</span>
              </div>
              <p className="text-sm font-mono font-semibold">
                {booking.id.slice(0, 13).toUpperCase()}
              </p>
            </div>

            <Separator />

            {/* Dates & Duration */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                DATES
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Check-in</p>
                  <p className="text-sm font-medium">
                    {format(new Date(booking.start_date), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">After 3:00 PM</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Check-out</p>
                  <p className="text-sm font-medium">
                    {format(new Date(booking.end_date), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">Before 11:00 AM</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <span>
                  {booking.nights} {booking.nights === 1 ? "night" : "nights"}
                </span>
              </div>
            </div>

            <Separator />

            {/* Guests & Horses */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                <Users className="h-3 w-3" />
                WHO'S COMING
              </h4>
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-medium">{booking.guests || 1}</span>{" "}
                  {(booking.guests || 1) === 1 ? "guest" : "guests"}
                </p>
                <p>
                  <span className="font-medium">{booking.horses || 0}</span>{" "}
                  {(booking.horses || 0) === 1 ? "horse" : "horses"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Payment Info */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">
                PAYMENT INFO
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    £{(booking.total_charge_pennies / 100 / booking.nights).toFixed(2)} × {booking.nights} {booking.nights === 1 ? "night" : "nights"}
                  </span>
                  <span>{formatGBP(booking.base_price_pennies)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Guest service fee</span>
                  <span>{formatGBP(booking.guest_fee_pennies + booking.guest_fee_vat_pennies)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-semibold">Total (GBP)</span>
                  <span className="text-lg font-bold">
                    {formatGBP(booking.total_charge_pennies)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nightly rate</span>
              <span className="text-lg font-bold">
                {formatGBP(property.nightly_price_pennies)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {isRemoved ? (
            <Button variant="outline" className="w-full opacity-50" size="sm" disabled>
              <ShieldAlert className="h-4 w-4 mr-2" />
              Listing Unavailable
            </Button>
          ) : (
            <Link href={`/property/${property.id}`} target="_blank" className="block">
              <Button variant="outline" className="w-full" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Listing
              </Button>
            </Link>
          )}
          {booking && (
            <Link href={`/dashboard`} className="block">
              <Button variant="default" className="w-full" size="sm">
                View Full Details
              </Button>
            </Link>
          )}
        </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

