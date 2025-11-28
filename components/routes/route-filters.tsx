"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useState } from "react";
import { UK_COUNTIES } from "@/lib/constants/counties";

interface RouteFiltersProps {
  onFilterChange: (filters: any) => void;
}

const TERRAIN_OPTIONS = [
  "bridleway",
  "forest",
  "hill",
  "valley",
  "riverside",
  "moorland",
  "coastal",
  "parkland",
  "village",
  "countryside",
];

export function RouteFilters({ onFilterChange }: RouteFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [county, setCounty] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [distanceRange, setDistanceRange] = useState<[number, number]>([0, 50]);
  const [selectedTerrains, setSelectedTerrains] = useState<string[]>([]);

  const handleApply = () => {
    onFilterChange({
      q: searchQuery || undefined,
      county: county && county !== "all" ? county : undefined,
      difficulty: difficulty && difficulty !== "all" ? difficulty : undefined,
      minDistanceKm: distanceRange[0] > 0 ? distanceRange[0] : undefined,
      maxDistanceKm: distanceRange[1] < 50 ? distanceRange[1] : undefined,
      terrainTags: selectedTerrains.length > 0 ? selectedTerrains : undefined,
    });
  };

  const handleReset = () => {
    setSearchQuery("");
    setCounty("");
    setDifficulty("");
    setDistanceRange([0, 50]);
    setSelectedTerrains([]);
    onFilterChange({});
  };

  const toggleTerrain = (terrain: string) => {
    setSelectedTerrains((prev) =>
      prev.includes(terrain)
        ? prev.filter((t) => t !== terrain)
        : [...prev, terrain]
    );
  };

  return (
    <div className="space-y-6 p-4 bg-card border rounded-lg">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search">Search Routes</Label>
        <Input
          id="search"
          placeholder="Search by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* County */}
      <div className="space-y-2">
        <Label htmlFor="county">County</Label>
        <Select value={county} onValueChange={setCounty}>
          <SelectTrigger id="county">
            <SelectValue placeholder="All counties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All counties</SelectItem>
            {UK_COUNTIES.map((countyName) => (
              <SelectItem key={countyName} value={countyName}>
                {countyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <Label htmlFor="difficulty">Difficulty</Label>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger id="difficulty">
            <SelectValue placeholder="All difficulties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Distance Range */}
      <div className="space-y-2">
        <Label>
          Distance: {distanceRange[0]} - {distanceRange[1]} km
        </Label>
        <Slider
          min={0}
          max={50}
          step={1}
          value={distanceRange}
          onValueChange={(value) => setDistanceRange(value as [number, number])}
          className="mt-2"
        />
      </div>

      {/* Terrain Tags */}
      <div className="space-y-2">
        <Label>Terrain</Label>
        <div className="flex flex-wrap gap-2">
          {TERRAIN_OPTIONS.map((terrain) => (
            <Badge
              key={terrain}
              variant={selectedTerrains.includes(terrain) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleTerrain(terrain)}
            >
              {terrain}
              {selectedTerrains.includes(terrain) && (
                <X className="ml-1 h-3 w-3" />
              )}
            </Badge>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleApply} className="flex-1">
          Apply Filters
        </Button>
        <Button onClick={handleReset} variant="outline">
          Reset
        </Button>
      </div>
    </div>
  );
}


