"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Phone, Calendar, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HorseIcon } from "@/components/icons/horseshoe";

interface Horse {
  id: string;
  name: string;
  photo_url: string | null;
  breed: string;
  age: number | null;
  gender: string;
  color_markings: string | null;
  height_hands: number | null;
  weight_kg: number | null;
  dietary_requirements: string | null;
  medical_conditions: string | null;
  current_medications: string | null;
  vaccination_date: string | null;
  passport_number: string | null;
  temperament: string | null;
  behavior_notes: string | null;
  turnout_preferences: string | null;
  experience_level: string | null;
  disciplines: string[] | null;
  vet_contact: string | null;
  farrier_contact: string | null;
  quick_facts: string[] | null;
}

interface HorseDetailsViewProps {
  bookingId: string;
}

export function HorseDetailsView({ bookingId }: HorseDetailsViewProps) {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHorses();
  }, [bookingId]);

  const fetchHorses = async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/horses`);
      if (res.ok) {
        const data = await res.json();
        setHorses(data.horses || []);
      }
    } catch (error) {
      console.error("Error fetching horses:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HorseIcon className="h-5 w-5" />
            Horses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (horses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HorseIcon className="h-5 w-5" />
            Horses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No horses for this booking</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HorseIcon className="h-5 w-5" />
          Horses ({horses.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {horses.map((horse, index) => (
          <div key={horse.id}>
            {index > 0 && <Separator className="mb-6" />}
            
            <div className="flex gap-4">
              {/* Horse Photo */}
              {horse.photo_url ? (
                <img
                  src={horse.photo_url}
                  alt={horse.name}
                  className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <HorseIcon className="h-10 w-10 text-muted-foreground" />
                </div>
              )}

              {/* Basic Info */}
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1">{horse.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {horse.breed}
                  {horse.age && ` • ${horse.age} years old`}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline" className="capitalize">
                    {horse.gender}
                  </Badge>
                  {horse.height_hands && (
                    <Badge variant="outline">{horse.height_hands} hands</Badge>
                  )}
                  {horse.temperament && (
                    <Badge variant="secondary" className="capitalize">
                      {horse.temperament}
                    </Badge>
                  )}
                  {horse.experience_level && (
                    <Badge variant="outline" className="capitalize">
                      {horse.experience_level.replace(/-/g, ' ')}
                    </Badge>
                  )}
                </div>

                {/* Quick Facts */}
                {horse.quick_facts && horse.quick_facts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {horse.quick_facts.map((fact, i) => (
                      <Badge key={i} className="text-xs">
                        {fact}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Physical Details */}
                {(horse.color_markings || horse.weight_kg) && (
                  <div className="text-sm text-muted-foreground mb-2">
                    {horse.color_markings && <p>{horse.color_markings}</p>}
                    {horse.weight_kg && <p>Weight: {horse.weight_kg} kg</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Important Information */}
            {(horse.dietary_requirements || horse.medical_conditions || horse.current_medications || horse.behavior_notes) && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      Important Information
                    </h4>
                    
                    {horse.dietary_requirements && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Dietary Requirements:</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">{horse.dietary_requirements}</p>
                      </div>
                    )}

                    {horse.medical_conditions && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Medical Conditions:</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">{horse.medical_conditions}</p>
                      </div>
                    )}

                    {horse.current_medications && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Current Medications:</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">{horse.current_medications}</p>
                      </div>
                    )}

                    {horse.behavior_notes && (
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Behavior Notes:</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">{horse.behavior_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Additional Details */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {horse.turnout_preferences && (
                <div>
                  <p className="font-medium mb-1">Turnout Preferences:</p>
                  <p className="text-muted-foreground capitalize">{horse.turnout_preferences.replace(/-/g, ' ')}</p>
                </div>
              )}

              {horse.disciplines && horse.disciplines.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Disciplines:</p>
                  <p className="text-muted-foreground">{horse.disciplines.join(', ')}</p>
                </div>
              )}

              {horse.vaccination_date && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Last Vaccinated:</p>
                    <p className="text-muted-foreground">
                      {new Date(horse.vaccination_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {horse.passport_number && (
                <div>
                  <p className="font-medium mb-1">Passport/Microchip:</p>
                  <p className="text-muted-foreground">{horse.passport_number}</p>
                </div>
              )}
            </div>

            {/* Emergency Contacts */}
            {(horse.vet_contact || horse.farrier_contact) && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold text-sm">Emergency Contacts</h4>
                </div>
                {horse.vet_contact && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Vet:</span> {horse.vet_contact}
                  </p>
                )}
                {horse.farrier_contact && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Farrier:</span> {horse.farrier_contact}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

