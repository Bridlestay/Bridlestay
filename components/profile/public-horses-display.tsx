"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HorseshoeIcon } from "@/components/icons/horseshoe";

interface Horse {
  id: string;
  name: string;
  photo_url: string | null;
  breed: string;
  age: number | null;
  gender: string;
  temperament: string | null;
  quick_facts: string[] | null;
}

interface PublicHorsesDisplayProps {
  horses: Horse[];
  userName: string;
}

export function PublicHorsesDisplay({ horses, userName }: PublicHorsesDisplayProps) {
  if (horses.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{userName}&apos;s Horses</CardTitle>
          <Badge variant="secondary">{horses.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
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

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium capitalize">{horse.gender}</span>
                    </div>
                    {horse.temperament && (
                      <Badge variant="outline" className="capitalize">
                        {horse.temperament}
                      </Badge>
                    )}
                  </div>

                  {/* Quick Facts */}
                  {horse.quick_facts && horse.quick_facts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-4">
                      {horse.quick_facts.slice(0, 3).map((fact, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {fact}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

