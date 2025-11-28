"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface SearchFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

export interface FilterState {
  priceMin: number;
  priceMax: number;
  arenaType: "any" | "indoor" | "outdoor" | "both";
  propertyType: string;
  minStables: number;
  bridlewayAccess: boolean;
  wifi?: boolean;
  parking?: boolean;
  paddock?: boolean;
  washBay?: boolean;
}

const PROPERTY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "bnb", label: "B&B" },
  { value: "cottage", label: "Cottage" },
  { value: "farm_stay", label: "Farm Stay" },
  { value: "manor", label: "Manor House" },
  { value: "glamping", label: "Glamping" },
  { value: "other", label: "Other" },
];

export function SearchFilters({ onFilterChange, initialFilters }: SearchFiltersProps) {
  const [priceRange, setPriceRange] = useState<[number, number]>([
    initialFilters?.priceMin || 50,
    initialFilters?.priceMax || 5000,
  ]);
  const [arenaType, setArenaType] = useState<FilterState["arenaType"]>(
    initialFilters?.arenaType || "any"
  );
  const [propertyType, setPropertyType] = useState(
    initialFilters?.propertyType || "all"
  );
  const [minStables, setMinStables] = useState(initialFilters?.minStables || 0);
  const [bridlewayAccess, setBridlewayAccess] = useState(
    initialFilters?.bridlewayAccess || false
  );
  const [wifi, setWifi] = useState(initialFilters?.wifi || false);
  const [parking, setParking] = useState(initialFilters?.parking || false);
  const [paddock, setPaddock] = useState(initialFilters?.paddock || false);
  const [washBay, setWashBay] = useState(initialFilters?.washBay || false);

  const handleApplyFilters = () => {
    onFilterChange({
      priceMin: priceRange[0],
      priceMax: priceRange[1],
      arenaType,
      propertyType,
      minStables,
      bridlewayAccess,
      wifi,
      parking,
      paddock,
      washBay,
    });
  };

  const handleClearFilters = () => {
    setPriceRange([50, 5000]);
    setArenaType("any");
    setPropertyType("all");
    setMinStables(0);
    setBridlewayAccess(false);
    setWifi(false);
    setParking(false);
    setPaddock(false);
    setWashBay(false);
    onFilterChange({
      priceMin: 50,
      priceMax: 5000,
      arenaType: "any",
      propertyType: "all",
      minStables: 0,
      bridlewayAccess: false,
      wifi: false,
      parking: false,
      paddock: false,
      washBay: false,
    });
  };

  const hasActiveFilters =
    priceRange[0] !== 50 ||
    priceRange[1] !== 5000 ||
    arenaType !== "any" ||
    propertyType !== "all" ||
    minStables > 0 ||
    bridlewayAccess ||
    wifi ||
    parking ||
    paddock ||
    washBay;

  return (
    <Card className="p-4 lg:sticky lg:top-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["price", "arena", "property"]} className="space-y-2">
        {/* Price Range */}
        <AccordionItem value="price">
          <AccordionTrigger className="text-sm font-medium">
            Price per Night
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="px-2">
              <Slider
                min={50}
                max={5000}
                step={50}
                value={priceRange}
                onValueChange={(value) => setPriceRange(value as [number, number])}
                className="mb-4"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">£{priceRange[0]}</span>
                <span className="text-muted-foreground">to</span>
                <span className="font-medium">£{priceRange[1]}</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Arena Type */}
        <AccordionItem value="arena">
          <AccordionTrigger className="text-sm font-medium">
            Arena Type
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            <div className="space-y-2">
              {[
                { value: "any", label: "Any" },
                { value: "indoor", label: "Indoor Arena" },
                { value: "outdoor", label: "Outdoor Arena" },
                { value: "both", label: "Both Indoor & Outdoor" },
              ].map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`arena-${option.value}`}
                    checked={arenaType === option.value}
                    onCheckedChange={() => setArenaType(option.value as any)}
                  />
                  <Label
                    htmlFor={`arena-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Property Type */}
        <AccordionItem value="property">
          <AccordionTrigger className="text-sm font-medium">
            Property Type
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        {/* Stables */}
        <AccordionItem value="stables">
          <AccordionTrigger className="text-sm font-medium">
            Minimum Stables
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <Select
              value={minStables.toString()}
              onValueChange={(value) => setMinStables(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
                <SelectItem value="5">5+</SelectItem>
                <SelectItem value="10">10+</SelectItem>
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        {/* Bridleway Access */}
        <AccordionItem value="bridleway">
          <AccordionTrigger className="text-sm font-medium">
            Access
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bridleway"
                checked={bridlewayAccess}
                onCheckedChange={(checked) => setBridlewayAccess(checked as boolean)}
              />
              <Label htmlFor="bridleway" className="text-sm font-normal cursor-pointer">
                Direct Bridleway Access
              </Label>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Amenities */}
        <AccordionItem value="amenities">
          <AccordionTrigger className="text-sm font-medium">
            Amenities
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="wifi"
                checked={wifi}
                onCheckedChange={(checked) => setWifi(checked as boolean)}
              />
              <Label htmlFor="wifi" className="text-sm font-normal cursor-pointer">
                WiFi
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="parking"
                checked={parking}
                onCheckedChange={(checked) => setParking(checked as boolean)}
              />
              <Label htmlFor="parking" className="text-sm font-normal cursor-pointer">
                Parking
              </Label>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Horse Facilities */}
        <AccordionItem value="horse-facilities">
          <AccordionTrigger className="text-sm font-medium">
            Horse Facilities
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="paddock"
                checked={paddock}
                onCheckedChange={(checked) => setPaddock(checked as boolean)}
              />
              <Label htmlFor="paddock" className="text-sm font-normal cursor-pointer">
                Paddock/Turnout
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="washBay"
                checked={washBay}
                onCheckedChange={(checked) => setWashBay(checked as boolean)}
              />
              <Label htmlFor="washBay" className="text-sm font-normal cursor-pointer">
                Wash Bay
              </Label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button onClick={handleApplyFilters} className="w-full mt-6">
        Apply Filters
      </Button>
    </Card>
  );
}

