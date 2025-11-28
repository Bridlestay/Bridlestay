"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Ruler, Download, Share2, Flag, Clock, TrendingUp, Home } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WaypointCard } from "./waypoint-card";
import { NearbyPropertyCard } from "./nearby-property-card";
import { RouteCompletion } from "./route-completion";
import { calculateDistanceKm } from "@/lib/routes/distance-calculator";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface RouteDetailDrawerProps {
  routeId: string | null;
  open: boolean;
  onClose: () => void;
}

export function RouteDetailDrawer({
  routeId,
  open,
  onClose,
}: RouteDetailDrawerProps) {
  const [route, setRoute] = useState<any>(null);
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingWaypoints, setLoadingWaypoints] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!routeId || !open) return;

    const fetchRoute = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/routes/${routeId}`);
        if (res.ok) {
          const data = await res.json();
          setRoute(data.route);
        }
      } catch (error) {
        console.error("Failed to fetch route:", error);
        toast.error("Failed to load route details");
      } finally {
        setLoading(false);
      }
    };

    const fetchWaypoints = async () => {
      setLoadingWaypoints(true);
      try {
        const res = await fetch(`/api/routes/${routeId}/waypoints`);
        if (res.ok) {
          const data = await res.json();
          setWaypoints(data.waypoints || []);
        }
      } catch (error) {
        console.error("Failed to fetch waypoints:", error);
      } finally {
        setLoadingWaypoints(false);
      }
    };

    const fetchNearbyProperties = async () => {
      setLoadingProperties(true);
      try {
        const res = await fetch(`/api/routes/${routeId}/nearby-properties`);
        if (res.ok) {
          const data = await res.json();
          setNearbyProperties(data.properties || []);
        }
      } catch (error) {
        console.error("Failed to fetch nearby properties:", error);
      } finally {
        setLoadingProperties(false);
      }
    };

    fetchRoute();
    fetchWaypoints();
    fetchNearbyProperties();
  }, [routeId, open]);

  const handleDownloadGPX = async () => {
    if (!routeId) return;

    try {
      const res = await fetch(`/api/routes/${routeId}/gpx`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${route?.title || "route"}.gpx`;
        a.click();
        toast.success("GPX file downloaded!");
      }
    } catch (error) {
      toast.error("Failed to download GPX");
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/routes?routeId=${routeId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  if (!route && !loading) {
    return null;
  }

  const difficultyColors = {
    easy: "bg-green-100 text-green-800 border-green-300",
    medium: "bg-amber-100 text-amber-800 border-amber-300",
    hard: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : route ? (
          <div className="space-y-6">
            <SheetHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <SheetTitle className="text-2xl">{route.title}</SheetTitle>
                  {route.featured && (
                    <Badge className="mt-2">Featured Route</Badge>
                  )}
                </div>
                {route.avg_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">
                      {route.avg_rating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({route.review_count})
                    </span>
                  </div>
                )}
              </div>
              <SheetDescription>{route.description}</SheetDescription>
            </SheetHeader>

            {/* Metadata */}
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={
                  difficultyColors[
                    route.difficulty as keyof typeof difficultyColors
                  ] || difficultyColors.medium
                }
              >
                {route.difficulty}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Ruler className="h-3 w-3" />
                {route.distance_km.toFixed(1)} km
              </Badge>
              {route.distance_km && (
                <>
                  <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-300">
                    <Clock className="h-3 w-3" />
                    🐴 {Math.floor((route.distance_km / 12) * 60)}m ride
                  </Badge>
                  <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-300">
                    <Clock className="h-3 w-3" />
                    🚶 {Math.floor((route.distance_km / 5) * 60)}m walk
                  </Badge>
                </>
              )}
              {route.county && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {route.county}
                </Badge>
              )}
              {route.condition && (
                <Badge 
                  variant="outline"
                  className={
                    route.condition === 'excellent' ? 'bg-green-50 text-green-700 border-green-300' :
                    route.condition === 'good' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                    route.condition === 'fair' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                    route.condition === 'poor' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                    'bg-red-50 text-red-700 border-red-300'
                  }
                >
                  {route.condition}
                </Badge>
              )}
              {route.elevation_gain_m && route.elevation_gain_m > 0 && (
                <Badge variant="outline" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {route.elevation_gain_m}m climb
                </Badge>
              )}
            </div>

            {/* Owner */}
            {route.owner && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar>
                  <AvatarImage src={route.owner.avatar_url || undefined} />
                  <AvatarFallback>
                    {route.owner.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{route.owner.name}</p>
                  <p className="text-sm text-muted-foreground">Route Creator</p>
                </div>
                {route.owner.admin_verified && (
                  <Badge variant="outline">Verified</Badge>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleDownloadGPX} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download GPX
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Flag className="h-4 w-4" />
              </Button>
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="waypoints">
                  Waypoints {waypoints.length > 0 && `(${waypoints.length})`}
                </TabsTrigger>
                <TabsTrigger value="photos">
                  Photos {route.photos_count > 0 && `(${route.photos_count})`}
                </TabsTrigger>
                <TabsTrigger value="nearby">
                  <Home className="h-4 w-4 mr-1" />
                  Stays
                </TabsTrigger>
                <TabsTrigger value="comments">Discussion</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Terrain Tags */}
                {route.terrain_tags && route.terrain_tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Terrain</h3>
                    <div className="flex flex-wrap gap-2">
                      {route.terrain_tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Surface */}
                {route.surface && (
                  <div>
                    <h3 className="font-semibold mb-1">Surface</h3>
                    <p className="text-sm text-muted-foreground">
                      {route.surface}
                    </p>
                  </div>
                )}

                {/* Seasonal Notes */}
                {route.seasonal_notes && (
                  <div>
                    <h3 className="font-semibold mb-1">Seasonal Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      {route.seasonal_notes}
                    </p>
                  </div>
                )}

                {/* Safety Notice */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900">
                    ⚠️ Always respect land access rules, closures, and local
                    regulations. Check conditions before setting out.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="photos" className="space-y-4">
                {/* Route Completion & Photo Upload */}
                <RouteCompletion 
                  routeId={routeId || ''} 
                  userId={userId}
                  onCompletionChange={() => {
                    // Refresh route data to update photo count
                    if (routeId) {
                      fetch(`/api/routes/${routeId}`)
                        .then(res => res.json())
                        .then(data => setRoute(data.route))
                        .catch(console.error);
                    }
                  }}
                />

                {/* Stock Photos */}
                {route.route_photos && route.route_photos.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Stock Photos</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {route.route_photos.map((photo: any) => (
                        <div
                          key={photo.id}
                          className="relative h-48 rounded-lg overflow-hidden"
                        >
                          <Image
                            src={photo.url}
                            alt={photo.caption || "Route photo"}
                            fill
                            className="object-cover"
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm">
                              {photo.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="waypoints" className="space-y-4">
                {loadingWaypoints ? (
                  <p className="text-muted-foreground text-center py-8">Loading waypoints...</p>
                ) : waypoints.length > 0 ? (
                  <div className="space-y-3">
                    {waypoints.map((wp: any) => {
                      // Calculate distance from start if we have route geometry
                      let distanceFromStart: number | undefined;
                      if (route.geometry?.coordinates) {
                        const coords = route.geometry.coordinates;
                        const startPoint = coords[0];
                        
                        // Find closest point on route to this waypoint
                        let closestDistance = Infinity;
                        let accumulatedDistance = 0;
                        
                        for (let i = 0; i < coords.length; i++) {
                          const [lng, lat] = coords[i];
                          const dist = Math.sqrt(
                            Math.pow(lat - wp.lat, 2) + Math.pow(lng - wp.lng, 2)
                          );
                          
                          if (dist < closestDistance) {
                            closestDistance = dist;
                            distanceFromStart = accumulatedDistance;
                          }
                          
                          if (i > 0) {
                            accumulatedDistance += calculateDistanceKm([
                              coords[i - 1],
                              coords[i]
                            ]);
                          }
                        }
                      }
                      
                      return (
                        <WaypointCard
                          key={wp.id}
                          waypoint={wp}
                          distanceFromStart={distanceFromStart}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No waypoints marked on this route yet.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="nearby" className="space-y-4">
                {loadingProperties ? (
                  <p className="text-muted-foreground text-center py-8">Loading nearby stays...</p>
                ) : nearbyProperties.length > 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Found {nearbyProperties.length} {nearbyProperties.length === 1 ? 'property' : 'properties'} near this route
                    </p>
                    <div className="grid gap-4">
                      {nearbyProperties.map((property) => (
                        <NearbyPropertyCard key={property.id} property={property} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No properties found within 10km of this route.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comments" className="space-y-4">
                <p className="text-muted-foreground text-center py-8">
                  Comments coming soon...
                </p>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}


