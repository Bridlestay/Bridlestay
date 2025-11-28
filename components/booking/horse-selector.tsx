"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { HorseIcon } from "@/components/icons/horseshoe";

interface Horse {
  id: string;
  name: string;
  photo_url: string | null;
  breed: string;
  age: number | null;
  gender: string;
  height_hands: number | null;
  temperament: string | null;
  color_markings: string | null;
  quick_facts: string[] | null;
}

interface HorseSelectorProps {
  maxHorses: number;
  selectedHorseIds: string[];
  onSelectionChange: (horseIds: string[]) => void;
}

export function HorseSelector({
  maxHorses,
  selectedHorseIds,
  onSelectionChange,
}: HorseSelectorProps) {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);

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

  const toggleHorse = (horseId: string) => {
    const isSelected = selectedHorseIds.includes(horseId);
    
    if (isSelected) {
      // Deselect
      onSelectionChange(selectedHorseIds.filter(id => id !== horseId));
    } else {
      // Select if under limit
      if (selectedHorseIds.length < maxHorses) {
        onSelectionChange([...selectedHorseIds, horseId]);
      } else {
        toast.error(`Maximum ${maxHorses} horses allowed for this property`);
      }
    }
  };

  if (loading) {
    return (
      <div className="py-4">
        <Label className="mb-3 block">Your Horses</Label>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (horses.length === 0) {
    return (
      <div className="py-4">
        <Label className="mb-3 block">Your Horses</Label>
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mx-auto mb-3">
            <HorseIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            You haven't added any horses yet
          </p>
          <Button asChild size="sm">
            <Link href="/profile?section=horses" target="_blank">
              <Plus className="h-4 w-4 mr-2" />
              Add a Horse
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-4">
      <Label className="mb-3 block">
        Select Horses ({selectedHorseIds.length}/{maxHorses} max)
      </Label>
      
      <div className="space-y-3">
        {horses.map((horse) => {
          const isSelected = selectedHorseIds.includes(horse.id);
          const isDisabled = !isSelected && selectedHorseIds.length >= maxHorses;

          return (
            <Card
              key={horse.id}
              className={`p-4 cursor-pointer transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : isDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-primary/50"
              }`}
              onClick={() => !isDisabled && toggleHorse(horse.id)}
            >
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={isSelected}
                  disabled={isDisabled}
                  onCheckedChange={() => !isDisabled && toggleHorse(horse.id)}
                  className="mt-1"
                />

                {horse.photo_url ? (
                  <img
                    src={horse.photo_url}
                    alt={horse.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <HorseIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold">{horse.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {horse.breed}
                    {horse.age && ` • ${horse.age} years`}
                    {horse.gender && ` • ${horse.gender.charAt(0).toUpperCase() + horse.gender.slice(1)}`}
                    {horse.height_hands && ` • ${horse.height_hands}hh`}
                  </p>
                  {horse.temperament && (
                    <Badge variant="outline" className="mt-1 capitalize text-xs">
                      {horse.temperament}
                    </Badge>
                  )}
                  {horse.quick_facts && horse.quick_facts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {horse.quick_facts.slice(0, 2).map((fact, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {fact}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-3 text-center">
        <Button asChild variant="ghost" size="sm">
          <Link href="/profile?section=horses" target="_blank">
            <Plus className="h-4 w-4 mr-2" />
            Add a new horse
          </Link>
        </Button>
      </div>
    </div>
  );
}

