"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { HorseshoeIcon } from "@/components/icons/horseshoe";
import { toast } from "sonner";
import { HorseDialog } from "@/components/horses/horse-dialog";
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

interface Horse {
  id: string;
  name: string;
  photo_url: string | null;
  breed: string;
  age: number | null;
  gender: string;
  color_markings: string | null;
  height_hands: number | null;
  temperament: string | null;
  quick_facts: string[] | null;
}

export function HorsesSection({ userId }: { userId: string }) {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchHorses();
  }, []);

  const fetchHorses = async () => {
    try {
      const res = await fetch("/api/horses");
      if (res.ok) {
        const data = await res.json();
        setHorses(data.horses || []);
      }
    } catch (error) {
      console.error("Error fetching horses:", error);
      toast.error("Failed to load horses");
    } finally {
      setLoading(false);
    }
  };

  const handleAddHorse = () => {
    setSelectedHorse(null);
    setDialogOpen(true);
  };

  const handleEditHorse = (horse: Horse) => {
    setSelectedHorse(horse);
    setDialogOpen(true);
  };

  const handleDeleteHorse = async (horseId: string) => {
    setDeleting(horseId);
    try {
      const res = await fetch(`/api/horses/${horseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete horse");
      }

      toast.success("Horse deleted successfully");
      fetchHorses();
    } catch (error) {
      toast.error("Failed to delete horse");
    } finally {
      setDeleting(null);
    }
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setSelectedHorse(null);
    fetchHorses();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>My Horses</CardTitle>
              <Badge variant="secondary">{horses.length}</Badge>
            </div>
            <Button onClick={handleAddHorse}>
              <Plus className="h-4 w-4 mr-2" />
              Add Horse
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {horses.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-4">
                <HorseshoeIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No horses yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your horses to quickly fill booking information
              </p>
              <Button onClick={handleAddHorse}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Horse
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {horses.map((horse) => (
                <Card key={horse.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    {/* Horse Photo */}
                    <div className="relative h-48 bg-muted">
                      {horse.photo_url ? (
                        <img
                          src={horse.photo_url}
                          alt={horse.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <HorseshoeIcon className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Horse Details */}
                    <div className="p-4">
                      <h3 className="text-lg font-bold mb-1">{horse.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {horse.breed}
                        {horse.age && ` • ${horse.age} years`}
                      </p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium capitalize">{horse.gender}</span>
                          {horse.height_hands && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span>{horse.height_hands} hands</span>
                            </>
                          )}
                        </div>
                        {horse.color_markings && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {horse.color_markings}
                          </p>
                        )}
                        {horse.temperament && (
                          <Badge variant="outline" className="capitalize">
                            {horse.temperament}
                          </Badge>
                        )}
                      </div>

                      {/* Quick Facts */}
                      {horse.quick_facts && horse.quick_facts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {horse.quick_facts.slice(0, 3).map((fact, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {fact}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditHorse(horse)}
                          className="flex-1"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={deleting === horse.id}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {horse.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {horse.name} from your horses. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteHorse(horse.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleting === horse.id ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <HorseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        horse={selectedHorse}
        onSuccess={handleSuccess}
      />
    </>
  );
}

