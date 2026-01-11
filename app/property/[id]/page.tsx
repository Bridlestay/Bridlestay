import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { CheckCircle2, Users, MapPin, Clock, Calendar, Shield, Zap, Share2 } from "lucide-react";
import { BookingForm } from "@/components/booking-form";
import { formatGBP } from "@/lib/fees";
import { ImageGallery } from "@/components/image-gallery";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { ReportButton } from "@/components/moderation/report-button";
import { CancellationPolicyDisplay } from "@/components/booking/cancellation-policy-display";
import { PropertyBadges } from "@/components/property-badges";
import { PropertyQA } from "@/components/property-qa";
import { MessageButton } from "@/components/messaging/message-button";
import { AmenitiesList } from "@/components/property/amenities-list";
import { PropertyReviewsDisplay } from "@/components/reviews/property-reviews-display";
import { NearbyRoutesWidget } from "@/components/routes/nearby-routes-widget";
import { FacilityPhotosGallery } from "@/components/property/facility-photos-gallery";
import { Metadata } from "next";

// Generate dynamic metadata for social sharing (Facebook, Twitter, etc.)
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select(`
      name,
      description,
      city,
      county,
      nightly_price_pennies,
      property_photos (url, is_cover, "order")
    `)
    .eq("id", id)
    .single();

  if (!property) {
    return {
      title: "Property Not Found | Cantra",
    };
  }

  // Get the cover photo or first photo
  const photos = property.property_photos || [];
  const coverPhoto = photos.find((p: any) => p.is_cover) || photos.sort((a: any, b: any) => a.order - b.order)[0];
  const imageUrl = coverPhoto?.url || "/og-image.png";
  
  const pricePerNight = (property.nightly_price_pennies / 100).toFixed(0);
  const description = property.description 
    ? property.description.substring(0, 160) + "..."
    : `Equestrian accommodation in ${property.city}, ${property.county}. From £${pricePerNight}/night on Cantra.`;

  return {
    title: `${property.name} | Cantra`,
    description: description,
    openGraph: {
      title: property.name,
      description: description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: property.name,
        },
      ],
      type: "website",
      siteName: "Cantra",
    },
    twitter: {
      card: "summary_large_image",
      title: property.name,
      description: description,
      images: [imageUrl],
    },
  };
}

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin_preview?: string }>;
}) {
  const { id } = await params;
  const { admin_preview } = await searchParams;
  const supabase = await createClient();

  // Get current user to check if they're the owner or admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is admin
  let isAdmin = false;
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = userData?.role === "admin";
  }

  const { data: property, error } = await supabase
    .from("properties")
    .select(
      `
      *,
      property_photos (url, "order", is_cover, category),
      property_amenities (*),
      property_equine (*),
      host:host_id (id, name, avg_response_time_hours)
    `
    )
    .eq("id", id)
    .single();

  // If not published, only the owner or admin (with preview param) can view
  const canViewUnpublished = property?.host_id === user?.id || (isAdmin && admin_preview === "true");
  if (!property?.published && !canViewUnpublished) {
    notFound();
  }

  // If property was removed by admin, show not found (unless owner or admin viewing)
  if (property?.removed && property?.host_id !== user?.id && !isAdmin) {
    notFound();
  }

  if (error || !property) {
    notFound();
  }

  const photos = property.property_photos || [];
  // Separate general photos from facility photos
  const generalPhotos = photos.filter((p: any) => !p.category);
  const facilityPhotos = photos.filter((p: any) => p.category);
  const sortedPhotos = generalPhotos.sort((a: any, b: any) => a.order - b.order);
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
        
        {/* Show warning if property is removed (owner viewing) */}
        {property.removed && property.host_id === user?.id && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Property Removed</h3>
                <p className="text-red-700 text-sm mt-1">
                  This property has been removed from Cantra by an administrator. 
                  It is no longer visible to other users.
                  {property.removal_reason && (
                    <span className="block mt-2">
                      <strong>Reason:</strong> {property.removal_reason}
                    </span>
                  )}
                </p>
                <p className="text-red-600 text-sm mt-2">
                  Please check your messages for more information from our admin team.
                </p>
              </div>
            </div>
          </div>
        )}

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
                        {property.instant_book && (
                          <Badge className="bg-green-600 text-white">
                            <Zap className="mr-1 h-4 w-4" />
                            Instant Book
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShareButton propertyId={property.id} propertyName={property.name} />
                      <FavoriteButton
                        propertyId={property.id}
                        variant="detail"
                        showCount={true}
                      />
                      <ReportButton
                        contentType="property"
                        contentId={property.id}
                        contentOwnerId={property.host_id}
                        contentPreview={property.name}
                        variant="icon"
                      />
                    </div>
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

            {/* Horse Facilities Photos */}
            {facilityPhotos.length > 0 && (
              <div className="border-t pt-6">
                <h2 className="font-serif text-2xl font-semibold mb-4">
                  🐴 Horse Facility Photos
                </h2>
                <p className="text-muted-foreground mb-4">
                  View our verified equine facilities - photos verified by the Cantra team
                </p>
                <FacilityPhotosGallery photos={facilityPhotos} />
              </div>
            )}

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
                <AmenitiesList amenities={amenities} />
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

            {/* Cancellation Policy */}
            <div className="border-t pt-6">
              <h2 className="font-serif text-2xl font-semibold mb-4">
                Cancellation Policy
              </h2>
              <CancellationPolicyDisplay 
                policyName={
                  property.cancellation_policy === 'moderate' 
                    ? 'standard' 
                    : (property.cancellation_policy as "flexible" | "standard" | "strict") || 'standard'
                }
                variant="full"
              />
            </div>

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
                      // Use property_equine.max_horses as the authoritative value
                      max_horses: equine?.max_horses ?? property.max_horses ?? 0,
                      minimum_nights: property.minimum_nights || 1,
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

