"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatGBP } from "@/lib/fees";
import { CheckCircle2, X, Star } from "lucide-react";

interface Property {
  id: string;
  name: string;
  city: string;
  county: string;
  nightly_price_pennies: number;
  average_rating?: number;
  review_count?: number;
  property_amenities?: any;
  property_equine?: any;
  property_photos?: any[];
}

interface PropertyComparisonProps {
  properties: Property[];
}

export function PropertyComparison({ properties }: PropertyComparisonProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const selectedProperties = properties.filter((p) => selectedIds.includes(p.id));

  const handleToggleSelection = (propertyId: string) => {
    if (selectedIds.includes(propertyId)) {
      setSelectedIds(selectedIds.filter((id) => id !== propertyId));
    } else if (selectedIds.length < 3) {
      setSelectedIds([...selectedIds, propertyId]);
    }
  };

  const handleCompare = () => {
    if (selectedIds.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    setSelectedIds([]);
    setIsOpen(false);
  };

  const amenities = selectedProperties[0]?.property_amenities
    ? Array.isArray(selectedProperties[0].property_amenities)
      ? selectedProperties[0].property_amenities[0]
      : selectedProperties[0].property_amenities
    : null;

  const amenityKeys = amenities
    ? Object.keys(amenities).filter((key) => !["id", "property_id", "created_at"].includes(key))
    : [];

  return (
    <>
      {/* Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <Card className="shadow-lg">
            <CardContent className="pt-4 px-6 pb-4">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium">
                  {selectedIds.length} {selectedIds.length === 1 ? "property" : "properties"}{" "}
                  selected
                </p>
                {selectedIds.length >= 2 && (
                  <Button onClick={handleCompare}>Compare Properties</Button>
                )}
                <Button variant="ghost" onClick={handleClear}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Property Comparison</DialogTitle>
            <DialogDescription>Compare {selectedProperties.length} properties</DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Feature</TableHead>
                  {selectedProperties.map((property) => (
                    <TableHead key={property.id} className="text-center">
                      <div className="space-y-1">
                        <p className="font-semibold">{property.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.city}, {property.county}
                        </p>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Price */}
                <TableRow>
                  <TableCell className="font-medium">Price / Night</TableCell>
                  {selectedProperties.map((property) => (
                    <TableCell key={property.id} className="text-center">
                      <span className="font-semibold text-lg">
                        {formatGBP(property.nightly_price_pennies)}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>

                {/* Rating */}
                <TableRow>
                  <TableCell className="font-medium">Rating</TableCell>
                  {selectedProperties.map((property) => (
                    <TableCell key={property.id} className="text-center">
                      {property.average_rating ? (
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">
                            {property.average_rating.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground">
                            ({property.review_count})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No reviews</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Location */}
                <TableRow>
                  <TableCell className="font-medium">Location</TableCell>
                  {selectedProperties.map((property) => (
                    <TableCell key={property.id} className="text-center">
                      <div>
                        <p>{property.city}</p>
                        <p className="text-sm text-muted-foreground">{property.county}</p>
                      </div>
                    </TableCell>
                  ))}
                </TableRow>

                {/* Horse Capacity */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-medium">Horse Capacity</TableCell>
                  {selectedProperties.map((property) => {
                    const equine = Array.isArray(property.property_equine)
                      ? property.property_equine[0]
                      : property.property_equine;
                    return (
                      <TableCell key={property.id} className="text-center">
                        {equine?.max_horses || 0} horses
                      </TableCell>
                    );
                  })}
                </TableRow>

                {/* Stables */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-medium">Stables</TableCell>
                  {selectedProperties.map((property) => {
                    const equine = Array.isArray(property.property_equine)
                      ? property.property_equine[0]
                      : property.property_equine;
                    return (
                      <TableCell key={property.id} className="text-center">
                        {equine?.num_stables || 0}
                      </TableCell>
                    );
                  })}
                </TableRow>

                {/* Arena */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-medium">Arena</TableCell>
                  {selectedProperties.map((property) => {
                    const equine = Array.isArray(property.property_equine)
                      ? property.property_equine[0]
                      : property.property_equine;
                    return (
                      <TableCell key={property.id} className="text-center">
                        {equine?.has_arena ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-600 mx-auto" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>

                {/* Turnout */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-medium">Turnout</TableCell>
                  {selectedProperties.map((property) => {
                    const equine = Array.isArray(property.property_equine)
                      ? property.property_equine[0]
                      : property.property_equine;
                    return (
                      <TableCell key={property.id} className="text-center">
                        {equine?.has_turnout ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-600 mx-auto" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>

                {/* Key Amenities */}
                {amenityKeys.slice(0, 5).map((key) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium capitalize">
                      {key.replace(/_/g, " ")}
                    </TableCell>
                    {selectedProperties.map((property) => {
                      const amenities = Array.isArray(property.property_amenities)
                        ? property.property_amenities[0]
                        : property.property_amenities;
                      const hasAmenity = amenities?.[key];
                      return (
                        <TableCell key={property.id} className="text-center">
                          {hasAmenity ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-red-600 mx-auto" />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={handleClear}>
                Clear Selection
              </Button>
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return checkbox handler for use in property cards */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.propertyComparisonHandlers = {
              toggleSelection: ${handleToggleSelection.toString()},
              selectedIds: ${JSON.stringify(selectedIds)}
            };
          `,
        }}
      />
    </>
  );
}

// Export hook for use in property cards
export function usePropertyComparison() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (propertyId: string) => {
    if (selectedIds.includes(propertyId)) {
      setSelectedIds(selectedIds.filter((id) => id !== propertyId));
    } else if (selectedIds.length < 3) {
      setSelectedIds([...selectedIds, propertyId]);
    }
  };

  const isSelected = (propertyId: string) => selectedIds.includes(propertyId);

  const canSelect = selectedIds.length < 3;

  return {
    selectedIds,
    toggleSelection,
    isSelected,
    canSelect,
    selectedCount: selectedIds.length,
  };
}



