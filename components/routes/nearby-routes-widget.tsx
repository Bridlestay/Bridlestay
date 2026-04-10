"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Ruler, ChevronRight, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface NearbyRoutesWidgetProps {
  propertyId: string;
}

export function NearbyRoutesWidget({ propertyId }: NearbyRoutesWidgetProps) {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}/nearby-routes`);
        if (res.ok) {
          const data = await res.json();
          setRoutes(data.routes || []);
        }
      } catch (error) {
        console.error("Failed to fetch nearby routes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [propertyId]);

  if (loading) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Nearby Routes</h2>
        <p className="text-muted-foreground">Loading routes...</p>
      </Card>
    );
  }

  if (routes.length === 0) {
    return null; // Don't show widget if no routes
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Nearby Routes</h2>
        <Link href={`/routes?nearPropertyId=${propertyId}`}>
          <Button variant="ghost" size="sm">
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <p className="text-muted-foreground mb-6">
        Explore riding routes near this property
      </p>

      <div className="space-y-4">
        {routes.map((route) => {
          const firstPhoto = route.route_photos?.[0]?.url;
          const difficultyColors: Record<string, string> = {
            unrated: "bg-gray-100 text-gray-800 border-gray-300",
            easy: "bg-green-100 text-green-800 border-green-300",
            moderate: "bg-amber-100 text-amber-800 border-amber-300",
            medium: "bg-amber-100 text-amber-800 border-amber-300",
            difficult: "bg-orange-100 text-orange-800 border-orange-300",
            hard: "bg-red-100 text-red-800 border-red-300",
            severe: "bg-red-200 text-red-900 border-red-400",
          };

          return (
            <Link
              key={route.id}
              href={`/routes?routeId=${route.id}`}
              className="block group"
            >
              <Card className="p-4 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer">
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="relative w-32 h-24 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                    {firstPhoto ? (
                      <Image
                        src={firstPhoto}
                        alt={route.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <MapPin className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {route.featured && (
                      <div className="absolute top-1 right-1">
                        <Badge className="bg-amber-500 text-white text-xs">⭐</Badge>
                      </div>
                    )}
                    {route.distance_from_property_km && (
                      <div className="absolute bottom-1 left-1">
                        <Badge variant="secondary" className="bg-white/90 text-foreground text-xs">
                          {route.distance_from_property_km.toFixed(1)} km away
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                        {route.title}
                      </h3>
                      {route.avg_rating > 0 && (
                        <div className="flex items-center gap-1 text-sm flex-shrink-0">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="font-medium">{route.avg_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                      {route.description || "No description"}
                    </p>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={
                          `text-xs ${difficultyColors[
                            route.difficulty as keyof typeof difficultyColors
                          ] || difficultyColors.medium}`
                        }
                      >
                        {route.difficulty || "medium"}
                      </Badge>

                      <Badge variant="outline" className="gap-1 text-xs">
                        <Ruler className="h-3 w-3" />
                        {route.distance_km ? `${route.distance_km.toFixed(1)} km` : "N/A"}
                      </Badge>

                      {route.distance_km && (
                        <>
                          <Badge variant="outline" className="gap-1 text-xs text-blue-600">
                            🐴 {Math.floor((route.distance_km / 12) * 60)}m
                          </Badge>
                          <Badge variant="outline" className="gap-1 text-xs text-primary">
                            🚶 {Math.floor((route.distance_km / 5) * 60)}m
                          </Badge>
                        </>
                      )}

                      {route.elevation_gain_m && route.elevation_gain_m > 0 && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <TrendingUp className="h-3 w-3" />
                          {route.elevation_gain_m}m
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}


