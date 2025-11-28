import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGBP } from "@/lib/fees";
import { CheckCircle2, Star } from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { PropertyBadges } from "@/components/property-badges";

interface PropertyCardProps {
  property: any;
}

export function PropertyCard({ property }: PropertyCardProps) {
  // Extract cover photo
  const coverPhoto = property.property_photos?.find((p: any) => p.is_cover) || property.property_photos?.[0];
  const imageUrl = coverPhoto?.url;

  // Extract equine data
  const equineData = Array.isArray(property.property_equine) 
    ? property.property_equine[0] 
    : property.property_equine;
  const maxHorses = equineData?.max_horses || 0;

  return (
    <Link href={`/property/${property.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="relative h-48 bg-muted">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={property.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
              {/* Favorite button - top left */}
              <div className="absolute top-2 left-2 z-10">
                <FavoriteButton propertyId={property.id} variant="card" />
              </div>
              
              {/* Verified badge - top right */}
              {property.admin_verified && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-blue-600 text-white">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                </div>
              )}
        </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-serif text-xl font-semibold flex-1">{property.name}</h3>
                {property.average_rating && property.review_count > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{property.average_rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({property.review_count})</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{property.city}, {property.county}</p>
              
              {/* Property Badges */}
              <PropertyBadges 
                createdAt={property.created_at}
                bookingCount={property.booking_count || 0}
                hostResponseTimeHours={property.host_response_time_hours}
                size="sm"
                className="mb-2"
              />
              
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Up to {property.max_guests} guests</span>
                <span>•</span>
                <span>{maxHorses} horses</span>
              </div>
              {property.favorite_count > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  ❤️ Saved by {property.favorite_count} {property.favorite_count === 1 ? 'person' : 'people'}
                </p>
              )}
            </CardContent>
        <CardFooter className="p-4 pt-0">
          <div className="w-full">
            <p className="text-lg font-semibold">
              {formatGBP(property.nightly_price_pennies)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / night
              </span>
            </p>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

