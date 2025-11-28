import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { CheckCircle2, Users, MapPin, Clock, Calendar, Shield, Zap } from "lucide-react";
import { BookingForm } from "@/components/booking-form";
import { formatGBP } from "@/lib/fees";
import { ImageGallery } from "@/components/image-gallery";
import { FavoriteButton } from "@/components/favorite-button";
import { PropertyBadges } from "@/components/property-badges";
import { PropertyQA } from "@/components/property-qa";
import { MessageButton } from "@/components/messaging/message-button";
import { PropertyReviewsDisplay } from "@/components/reviews/property-reviews-display";
import { NearbyRoutesWidget } from "@/components/routes/nearby-routes-widget";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user to check if they're the owner
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: property, error } = await supabase
    .from("properties")
    .select(
      `
      *,
      property_photos (url, "order", is_cover),
      property_amenities (*),
      property_equine (*),
      host:host_id (id, name, avg_response_time_hours)
    `
    )
    .eq("id", id)
    .single();

  // If not published, only the owner can view
  if (!property?.published && property?.host_id !== user?.id) {
    notFound();
  }

  if (error || !property) {
    notFound();
  }

  const photos = property.property_photos || [];
  const sortedPhotos = photos.sort((a: any, b: any) => a.order - b.order);
  const amenities = Array.isArray(property.property_amenities) 
    ? property.property_amenities[0] 
    : property.property_amenities;
  const equine = Array.isArray(property.property_equine)
    ? property.property_equine[0]
    : property.property_equine;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
        {/* Gallery */}
        <ImageGallery images={sortedPhotos} propertyName={property.name} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
            <div className="lg:col-span-2 space-y-6 min-w-0">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h1 className="font-serif text-4xl font-bold">
                          {property.name}
                        </h1>
                        {property.admin_verified && (
                          <Badge className="bg-blue-600 text-white">
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Verified Property
                          </Badge>
                        )}
                        {property.instant_book && (
                          <Badge className="bg-green-600 text-white">
                            <Zap className="mr-1 h-4 w-4" />
                            Instant Book
                          </Badge>
                        )}
                      </div>
                    </div>
                    <FavoriteButton
                      propertyId={property.id}
                      variant="detail"
                      showCount={true}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {property.city}, {property.county}
                    </span>
                  </div>
                  
                  {/* Property Badges */}
                  <PropertyBadges 
                    createdAt={property.created_at}
                    bookingCount={property.booking_count || 0}
                    hostResponseTimeHours={property.host_response_time_hours}
                    className="mb-4"
                  />
                  
                  <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Up to {property.max_guests} guests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🐴</span>
                      <span>{equine?.max_horses || 0} horses</span>
                    </div>
                    {property.review_count > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">
                          {property.average_rating.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground">
                          ({property.review_count} reviews)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

            <div className="border-t pt-6">
              <h2 className="font-serif text-2xl font-semibold mb-4">
                About this property
              </h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                {property.description}
              </p>
            </div>

            {/* Horse Facilities */}
            {equine && (
              <div className="border-t pt-6">
                <h2 className="font-serif text-2xl font-semibold mb-4">
                  Horse Facilities
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {equine.max_horses > 0 && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">
                          Accommodates {equine.max_horses} horse{equine.max_horses > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  )}
                  {equine.stable_count > 0 && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">
                          {equine.stable_count} stable{equine.stable_count > 1 ? 's' : ''}
                        </p>
                        {equine.stable_dimensions_text && (
                          <p className="text-sm text-muted-foreground">
                            {equine.stable_dimensions_text}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {equine.paddock_available && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Paddock</p>
                        {equine.paddock_size_acres && (
                          <p className="text-sm text-muted-foreground">
                            {equine.paddock_size_acres} acres
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {equine.arena_indoor && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Indoor Arena</p>
                        {equine.arena_size_m && (
                          <p className="text-sm text-muted-foreground">
                            {equine.arena_size_m}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {equine.arena_outdoor && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Outdoor Arena</p>
                        {equine.arena_size_m && (
                          <p className="text-sm text-muted-foreground">
                            {equine.arena_size_m}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {equine.direct_bridleway_access && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Direct Bridleway Access</p>
                      </div>
                    </div>
                  )}
                  {equine.trailer_parking && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Trailer Parking</p>
                      </div>
                    </div>
                  )}
                  {equine.lorry_parking && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Lorry Parking</p>
                      </div>
                    </div>
                  )}
                  {equine.wash_bay && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Wash Bay</p>
                      </div>
                    </div>
                  )}
                  {equine.tack_room && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Tack Room</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amenities */}
            {amenities && (
              <div className="border-t pt-6">
                <h2 className="font-serif text-2xl font-semibold mb-4">
                  Amenities
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {amenities.wifi && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">WiFi</p>
                      </div>
                    </div>
                  )}
                  {amenities.kitchen && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Kitchen</p>
                      </div>
                    </div>
                  )}
                  {amenities.washer && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Washing Machine</p>
                      </div>
                    </div>
                  )}
                  {amenities.on_site_parking && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">On-site Parking</p>
                      </div>
                    </div>
                  )}
                  {amenities.heating && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Heating</p>
                      </div>
                    </div>
                  )}
                  {amenities.tv && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">TV</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Check-in Info & House Rules */}
            <div className="border-t pt-6">
              <h2 className="font-serif text-2xl font-semibold mb-4">
                Check-in Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Check-in</p>
                    <p className="text-sm text-muted-foreground">
                      From {property.checkin_time || '15:00'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Check-out</p>
                    <p className="text-sm text-muted-foreground">
                      Until {property.checkout_time || '11:00'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Minimum Stay</p>
                    <p className="text-sm text-muted-foreground">
                      {property.min_nights || 1} night{(property.min_nights || 1) > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {property.max_nights && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Maximum Stay</p>
                      <p className="text-sm text-muted-foreground">
                        {property.max_nights} nights
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* House Rules */}
            {property.house_rules && (
              <div className="border-t pt-6">
                <h2 className="font-serif text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  House Rules
                </h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {property.house_rules}
                </p>
              </div>
            )}

          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card>
                <CardHeader>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {formatGBP(property.nightly_price_pennies)}
                    </span>
                    <span className="text-muted-foreground">/ night</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BookingForm 
                    propertyId={id} 
                    property={{
                      ...property,
                      max_horses: equine?.max_horses || 0,
                    }} 
                  />
                  
                  {/* Message Host Button - Private */}
                  {user && user.id !== property.host_id && (
                    <div className="pt-4 border-t space-y-2">
                      <p className="text-xs text-muted-foreground text-center">
                        💬 Send a private message
                      </p>
                      <MessageButton
                        recipientId={property.host_id}
                        recipientName={property.host?.name || "Host"}
                        propertyId={property.id}
                        propertyName={property.name}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Q&A Section - Full Width Below */}
        <div className="mt-12 max-w-4xl">
          <PropertyQA 
            propertyId={property.id} 
            hostId={property.host_id}
            currentUserId={user?.id}
          />
        </div>

        {/* Reviews Section */}
        <div className="mt-12 max-w-4xl">
          <h2 className="font-serif text-2xl font-bold mb-6">Guest Reviews</h2>
          <PropertyReviewsDisplay
            propertyId={property.id}
            hostId={property.host_id}
            currentUserId={user?.id}
          />
        </div>

        {/* Nearby Routes */}
        <div className="mt-12 max-w-4xl">
          <NearbyRoutesWidget propertyId={property.id} />
        </div>
        </div>
      </main>
    </>
  );
}

