"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, ChevronDown, ChevronUp } from "lucide-react";

interface AmenitiesListProps {
  amenities: any;
}

// Define all possible amenities grouped by category
const AMENITIES_CONFIG = [
  {
    category: "Essentials",
    items: [
      { key: "wifi", label: "WiFi" },
      { key: "heating", label: "Heating" },
      { key: "air_con", label: "Air Conditioning" },
      { key: "hot_water", label: "Hot Water" },
      { key: "workspace", label: "Dedicated Workspace" },
    ],
  },
  {
    category: "Kitchen & Dining",
    items: [
      { key: "kitchen", label: "Kitchen" },
      { key: "oven", label: "Oven" },
      { key: "hob", label: "Hob/Stove" },
      { key: "microwave", label: "Microwave" },
      { key: "fridge", label: "Refrigerator" },
      { key: "freezer", label: "Freezer" },
      { key: "dishwasher", label: "Dishwasher" },
      { key: "coffee_maker", label: "Coffee Maker" },
      { key: "kettle", label: "Kettle" },
      { key: "cookware", label: "Cookware & Utensils" },
    ],
  },
  {
    category: "Laundry",
    items: [
      { key: "washer", label: "Washing Machine" },
      { key: "dryer", label: "Dryer" },
      { key: "drying_rack", label: "Drying Rack" },
      { key: "ironing_board", label: "Iron & Ironing Board" },
    ],
  },
  {
    category: "Bathroom",
    items: [
      { key: "shower", label: "Shower" },
      { key: "bathtub", label: "Bathtub" },
      { key: "hairdryer", label: "Hair Dryer" },
      { key: "toiletries", label: "Toiletries" },
    ],
  },
  {
    category: "Safety",
    items: [
      { key: "smoke_alarm", label: "Smoke Alarm" },
      { key: "carbon_monoxide_alarm", label: "Carbon Monoxide Alarm" },
      { key: "first_aid_kit", label: "First Aid Kit" },
      { key: "fire_extinguisher", label: "Fire Extinguisher" },
    ],
  },
  {
    category: "Access & Parking",
    items: [
      { key: "step_free_access", label: "Step-free Access" },
      { key: "private_entrance", label: "Private Entrance" },
      { key: "on_site_parking", label: "On-site Parking" },
      { key: "ev_charger", label: "EV Charger" },
    ],
  },
  {
    category: "Family & Pets",
    items: [
      { key: "cot", label: "Cot/Crib" },
      { key: "high_chair", label: "High Chair" },
      { key: "pets_allowed", label: "Pets Allowed" },
    ],
  },
  {
    category: "Entertainment",
    items: [
      { key: "tv", label: "TV" },
      { key: "streaming", label: "Streaming Services" },
      { key: "outdoor_seating", label: "Outdoor Seating" },
      { key: "bbq", label: "BBQ Grill" },
    ],
  },
];

export function AmenitiesList({ amenities }: AmenitiesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!amenities) return null;

  // Get all amenities (available and unavailable)
  const allAmenities = AMENITIES_CONFIG.flatMap(category =>
    category.items.map(item => ({
      ...item,
      category: category.category,
      available: amenities[item.key] === true,
    }))
  );

  // Split into available and unavailable
  const availableAmenities = allAmenities.filter(a => a.available);
  const unavailableAmenities = allAmenities.filter(a => !a.available);

  // Show first 6 by default
  const displayedAmenities = isExpanded
    ? allAmenities
    : [...availableAmenities.slice(0, 6), ...unavailableAmenities.slice(0, 0)]; // Show only available ones when collapsed

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isExpanded ? (
          // When expanded, show all organized by category
          AMENITIES_CONFIG.map((category) => {
            const categoryAmenities = category.items.map(item => ({
              ...item,
              available: amenities[item.key] === true,
            }));
            
            // Only show category if it has at least one amenity
            const hasAnyAmenity = categoryAmenities.some(a => a.available || isExpanded);
            if (!hasAnyAmenity) return null;

            return (
              <div key={category.category} className="col-span-2">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                  {category.category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryAmenities.map((amenity) => (
                    <div
                      key={amenity.key}
                      className={`flex items-center gap-3 ${
                        !amenity.available ? "opacity-60" : ""
                      }`}
                    >
                      {amenity.available ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <p
                        className={`text-sm ${
                          amenity.available ? "font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {amenity.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          // When collapsed, show only available amenities
          displayedAmenities.map((amenity) => (
            <div key={amenity.key} className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="font-medium">{amenity.label}</p>
            </div>
          ))
        )}
      </div>

      {/* Show more/less button */}
      <Button
        variant="outline"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full sm:w-auto"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4 mr-2" />
            Show Less
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-2" />
            Show All {allAmenities.length} Amenities
          </>
        )}
      </Button>
    </div>
  );
}

