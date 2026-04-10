"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PencilIcon, Eye, Trash2, Clock, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
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

export default function MyListingsPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/sign-in");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!userData || userData.role !== "host") {
        router.push("/");
        return;
      }

      // Fetch user's properties (exclude removed properties)
      const { data: props } = await supabase
        .from("properties")
        .select(`
          *,
          property_photos (url, is_cover, order, category),
          property_equine (max_horses),
          property_amenities (*)
        `)
        .eq("host_id", user.id)
        .or("removed.is.null,removed.eq.false")
        .order("created_at", { ascending: false });

      // Add favorite counts to each property
      if (props) {
        for (const property of props) {
          const { count } = await supabase
            .from("favorites")
            .select("*", { count: "exact", head: true })
            .eq("property_id", property.id);
          (property as any).favorite_count = count || 0;
        }
      }

      setProperties(props || []);
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const handlePublish = async (propertyId: string) => {
    try {
      const response = await fetch("/api/host/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Publishing Failed",
          description: data.error || "Failed to publish property",
        });
        return;
      }

      // Check if it's pending verification or immediately published
      if (data.pendingVerification) {
        toast({
          title: "Submitted for Verification",
          description: data.message || "Your property has been submitted for verification. Our team will review it within 24-48 hours.",
        });
      } else {
        toast({
          title: "Success!",
          description: "Your property has been published and is now live.",
        });
      }

      // Refresh the properties
      window.location.reload();
    } catch (error: any) {
      console.error("Publish error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to publish property",
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

      // Refresh the properties
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

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-muted/30 py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <p className="text-center">Loading...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">My Listings</h1>
              <p className="text-muted-foreground">
                Manage your property listings
              </p>
            </div>
            <Link href="/host/property/new">
              <Button size="lg">Add New Property</Button>
            </Link>
          </div>

          {properties && properties.length > 0 ? (
            <div className="grid gap-6">
              {properties.map((property: any) => {
                const coverPhoto = property.property_photos?.find(
                  (p: any) => p.is_cover
                );
                const photoCount = property.property_photos?.length || 0;
                // Check both property_equine array and direct property for max_horses
                const equineData = Array.isArray(property.property_equine) 
                  ? property.property_equine[0] 
                  : property.property_equine;
                const maxHorses = equineData?.max_horses || property.max_horses || 0;

                return (
                  <Card key={property.id}>
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        {/* Photo */}
                        <div className="relative w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                          {coverPhoto ? (
                            <Image
                              src={coverPhoto.url}
                              alt={property.name}
                              fill
                              sizes="192px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              No photo
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-serif text-2xl font-bold mb-1">
                                {property.name}
                              </h3>
                              <p className="text-muted-foreground">
                                {property.city}, {property.county}
                              </p>
                            </div>
                            {property.published ? (
                              <Badge variant="default" className="bg-primary">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Published
                              </Badge>
                            ) : property.pending_verification ? (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                                <Clock className="mr-1 h-3 w-3" />
                                Pending Verification
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Draft
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 my-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Price:</span>
                              <p className="font-semibold">
                                £{(property.nightly_price_pennies / 100).toFixed(0)}/night
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Guests:</span>
                              <p className="font-semibold">{property.max_guests}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Horses:</span>
                              <p className="font-semibold">{maxHorses}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Photos:</span>
                              <p className="font-semibold">{photoCount}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">❤️ Favorites:</span>
                              <p className="font-semibold">{(property as any).favorite_count || 0}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">📤 Shares:</span>
                              <p className="font-semibold">{property.share_count || 0}</p>
                            </div>
                          </div>

                          {/* Verification Status Message */}
                          {property.pending_verification && !property.published && (
                            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-sm text-amber-800">
                                <Clock className="inline h-4 w-4 mr-1" />
                                <strong>Awaiting Verification</strong> - Our team is reviewing your listing. 
                                This usually takes 24-48 hours. We&apos;ll notify you when it&apos;s approved.
                              </p>
                            </div>
                          )}

                          {/* Publish Checklist */}
                          {!property.published && !property.pending_verification && (() => {
                            const amenities = Array.isArray(property.property_amenities) 
                              ? property.property_amenities[0] 
                              : property.property_amenities;
                            const photos = property.property_photos || [];
                            const facilityPhotos = photos.filter((p: any) => p.category);
                            
                            // Check which facility photos are needed
                            const hasPaddock = amenities?.paddock_available;
                            const hasArena = amenities?.arena_available;
                            const hasTackRoom = amenities?.tack_room;
                            const hasWashBay = amenities?.wash_bay;
                            
                            const paddockPhotos = facilityPhotos.filter((p: any) => p.category === 'paddock').length;
                            const arenaPhotos = facilityPhotos.filter((p: any) => p.category === 'arena').length;
                            const tackRoomPhotos = facilityPhotos.filter((p: any) => p.category === 'tack_room').length;
                            const washBayPhotos = facilityPhotos.filter((p: any) => p.category === 'wash_bay').length;
                            
                            const requirements = [];
                            if (photoCount < 8) {
                              requirements.push(`Add at least 8 property photos (${photoCount}/8)`);
                            }
                            if (!property.description || property.description.length < 200) {
                              requirements.push("Write a detailed description (min 200 characters)");
                            }
                            if (maxHorses === 0) {
                              requirements.push("Add horse capacity");
                            }
                            if (hasPaddock && paddockPhotos === 0) {
                              requirements.push("Add photos of your paddock/turnout area");
                            }
                            if (hasArena && arenaPhotos === 0) {
                              requirements.push("Add photos of your arena/riding area");
                            }
                            if (hasTackRoom && tackRoomPhotos === 0) {
                              requirements.push("Add photos of your tack room");
                            }
                            if (hasWashBay && washBayPhotos === 0) {
                              requirements.push("Add photos of your wash bay/grooming area");
                            }
                            
                            if (requirements.length === 0) return null;
                            
                            return (
                              <div className="mb-4">
                                <p className="text-sm font-medium text-yellow-600 mb-2">
                                  Complete these to submit for verification:
                                </p>
                                <ul className="text-sm space-y-1">
                                  {requirements.map((req, idx) => (
                                    <li key={idx} className="text-muted-foreground">
                                      • {req}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })()}

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Link href={`/host/property/${property.id}/edit`}>
                              <Button variant="outline" size="sm">
                                <PencilIcon className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                            </Link>
                            {property.published && (
                              <Link href={`/property/${property.id}`} target="_blank">
                                <Button variant="outline" size="sm">
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Live
                                </Button>
                              </Link>
                            )}
                            {!property.published &&
                              !property.pending_verification &&
                              (() => {
                                const amenities = Array.isArray(property.property_amenities) 
                                  ? property.property_amenities[0] 
                                  : property.property_amenities;
                                const photos = property.property_photos || [];
                                const facilityPhotos = photos.filter((p: any) => p.category);
                                
                                const hasPaddock = amenities?.paddock_available;
                                const hasArena = amenities?.arena_available;
                                const hasTackRoom = amenities?.tack_room;
                                const hasWashBay = amenities?.wash_bay;
                                
                                const paddockPhotos = facilityPhotos.filter((p: any) => p.category === 'paddock').length;
                                const arenaPhotos = facilityPhotos.filter((p: any) => p.category === 'arena').length;
                                const tackRoomPhotos = facilityPhotos.filter((p: any) => p.category === 'tack_room').length;
                                const washBayPhotos = facilityPhotos.filter((p: any) => p.category === 'wash_bay').length;
                                
                                const canSubmit = 
                                  photoCount >= 8 &&
                                  property.description?.length >= 200 &&
                                  maxHorses > 0 &&
                                  (!hasPaddock || paddockPhotos > 0) &&
                                  (!hasArena || arenaPhotos > 0) &&
                                  (!hasTackRoom || tackRoomPhotos > 0) &&
                                  (!hasWashBay || washBayPhotos > 0);
                                
                                return canSubmit ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handlePublish(property.id)}
                                  >
                                    Submit for Verification
                                  </Button>
                                ) : null;
                              })()}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Property</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &quot;{property.name}&quot;? This action cannot be undone.
                                    {property.published && (
                                      <span className="block mt-2 text-destructive font-medium">
                                        This property is currently published and visible to guests.
                                      </span>
                                    )}
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
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <h3 className="font-serif text-2xl font-bold mb-2">
                  No listings yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Create your first property listing to start hosting
                </p>
                <Link href="/host/property/new">
                  <Button size="lg">Create Your First Listing</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
