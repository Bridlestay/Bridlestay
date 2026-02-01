"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Home, Warehouse, MapPin } from "lucide-react";
import Image from "next/image";
import { HorseIcon } from "@/components/icons/horseshoe";

interface NearbyPropertyCardProps {
  property: {
    id: string;
    name: string;
    city: string;
    county: string;
    distanceKm: number;
    pricePerNight: number;
    maxGuests: number;
    avgRating: number;
    reviewCount: number;
    mainPhoto: string | null;
    stableCount: number;
    paddockCount: number;
    lat?: number;
    lng?: number;
  };
  onShowOnMap?: (propertyId: string, lat: number, lng: number) => void;
}

export function NearbyPropertyCard({ property, onShowOnMap }: NearbyPropertyCardProps) {
  const handleClick = () => {
    if (onShowOnMap && property.lat && property.lng) {
      onShowOnMap(property.id, property.lat, property.lng);
    }
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={handleClick}
    >
        {/* Property Image */}
        <div className="relative h-48 w-full bg-muted">
          {property.mainPhoto ? (
            <Image
              src={property.mainPhoto}
              alt={property.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Home className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {/* Distance Badge */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-white/90 text-foreground shadow-sm">
              {property.distanceKm} km away
            </Badge>
          </div>
        </div>

        {/* Property Info */}
        <div className="p-4 space-y-2">
          {/* Rating & Reviews */}
          {property.reviewCount > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{property.avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground">({property.reviewCount})</span>
            </div>
          )}

          {/* Property Name */}
          <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {property.name}
          </h3>

          {/* Location */}
          <p className="text-sm text-muted-foreground">
            {property.city}, {property.county}
          </p>

          {/* Facilities */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              Sleeps {property.maxGuests}
            </span>
            {property.stableCount > 0 && (
              <span className="flex items-center gap-1">
                <Warehouse className="h-4 w-4" />
                {property.stableCount} Stable{property.stableCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="pt-2 border-t">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold">£{property.pricePerNight}</span>
                <span className="text-sm text-muted-foreground">/night</span>
              </div>
              {/* Show on map indicator */}
              <div className="flex items-center gap-1 text-primary text-sm font-medium">
                <MapPin className="h-4 w-4" />
                <span>Show on map</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
  );
}

