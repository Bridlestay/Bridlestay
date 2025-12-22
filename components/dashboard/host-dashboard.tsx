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
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Plus, CheckCircle2, XCircle, Eye, Edit, Trash2, Calendar, DollarSign } from "lucide-react";
import { PendingReviews } from "./pending-reviews";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function HostDashboard({ user }: { user: any }) {
  const [properties, setProperties] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [hostProfile, setHostProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // Fetch host profile
      const { data: profile } = await supabase
        .from("host_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setHostProfile(profile);

      // Fetch properties (exclude removed properties)
      const { data: props } = await supabase
        .from("properties")
        .select("*")
        .eq("host_id", user.id)
        .or("removed.is.null,removed.eq.false")
        .order("created_at", { ascending: false });

      setProperties(props || []);

      // Fetch bookings for host's properties
      const { data: bookingData } = await supabase
        .from("bookings")
        .select(
          `
          *,
          properties!inner (id, name, host_id),
          users:guest_id (id, name, email, avatar_url)
        `
        )
        .eq("properties.host_id", user.id)
        .order("created_at", { ascending: false });

      setBookings(bookingData || []);
      setLoading(false);
    };

    fetchData();
  }, [user.id]);

  const handleStripeConnect = async () => {
    try {
      const response = await fetch("/api/host/connect", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleBookingAction = async (bookingId: string, action: "accept" | "decline") => {
    try {
      const response = await fetch(`/api/booking/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: `Booking ${action}ed successfully`,
      });

      // Refresh bookings
      const supabase = createClient();
      const { data: bookingData } = await supabase
        .from("bookings")
        .select(
          `
          *,
          properties!inner (id, name, host_id),
          users:guest_id (name, email)
        `
        )
        .eq("properties.host_id", user.id)
        .order("created_at", { ascending: false });

      setBookings(bookingData || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDelete = async (propertyId: string) => {
    try {
      const response = await fetch("/api/host/listings/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: data.error || "Failed to delete property",
        });
        return;
      }

      toast({
        title: "Success!",
        description: "Your property has been deleted.",
      });

      // Refresh the page
      window.location.reload();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete property",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Reviews */}
      <PendingReviews userId={user.id} userRole={user.role || "host"} />
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/host/property/new">
          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Add New Property</p>
                  <p className="text-sm text-muted-foreground">List a new equestrian stay</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/host/calendar">
          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">Booking Calendar</p>
                  <p className="text-sm text-muted-foreground">View & manage your bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/host/earnings">
          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Earnings Dashboard</p>
                  <p className="text-sm text-muted-foreground">View income & payouts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stripe Connect Status */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Account</CardTitle>
        </CardHeader>
        <CardContent>
          {!hostProfile?.stripe_connect_id ? (
            <div>
              <p className="text-muted-foreground mb-4">
                Connect your Stripe account to receive payouts
              </p>
              <Button onClick={handleStripeConnect}>
                Connect Stripe Account
              </Button>
            </div>
          ) : hostProfile.payout_enabled ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Payouts enabled</span>
            </div>
          ) : (
            <div>
              <p className="text-yellow-600 mb-4">
                Complete your Stripe account setup to enable payouts
              </p>
              <Button onClick={handleStripeConnect} variant="outline">
                Complete Setup
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Properties */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Properties</CardTitle>
          <Link href="/host/property/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : properties.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No properties yet</p>
              <Link href="/host/property/new">
                <Button className="mt-4">Add Your First Property</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-semibold">{property.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {property.city}, {property.county} •{" "}
                      {formatGBP(property.nightly_price_pennies)}/night
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/property/${property.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/host/property/${property.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/host/availability?propertyId=${property.id}`}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Availability
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/host/pricing?propertyId=${property.id}`}>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Pricing
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Property</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{property.name}&quot;? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(property.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : bookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No bookings yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Link 
                          href={`/profile/${booking.users.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0"
                        >
                          <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                            <AvatarImage src={booking.users.avatar_url || undefined} />
                            <AvatarFallback>
                              {booking.users.name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div>
                          <p className="font-medium">{booking.users.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.users.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{booking.properties.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(booking.start_date), "MMM d")}</p>
                        <p className="text-muted-foreground">
                          to {format(new Date(booking.end_date), "MMM d")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatGBP(booking.host_payout_pennies || (booking.base_price_pennies - booking.host_fee_pennies - booking.host_fee_vat_pennies))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          booking.status === "accepted"
                            ? "bg-green-600"
                            : booking.status === "requested"
                            ? "bg-yellow-600"
                            : "bg-gray-600"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {booking.status === "requested" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleBookingAction(booking.id, "accept")}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBookingAction(booking.id, "decline")}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Decline
                          </Button>
                        </div>
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

