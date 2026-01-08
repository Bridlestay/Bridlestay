"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Pencil,
  Magnet,
  Undo2,
  Trash2,
  Clock,
  Ruler,
  Circle,
  Route,
  Lock,
  Globe,
  Link2,
  X,
  Palette,
  Eraser,
  PlusCircle,
} from "lucide-react";

// Types
export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  snapped: boolean;
  pathType?: "bridleway" | "boat" | "footpath" | "permissive" | "road" | null;
}

export interface RouteCreatorProps {
  onSave: (routeData: RouteData) => Promise<void>;
  onCancel: () => void;
  mapRef: React.RefObject<any>;
  existingRoute?: RouteData | null;
  onRouteTypeChange?: (routeType: "circular" | "linear") => void;
}

export interface RouteData {
  title: string;
  description: string;
  visibility: "private" | "link" | "public";
  difficulty: "unrated" | "easy" | "moderate" | "difficult" | "severe";
  routeType: "circular" | "linear";
  waypoints: Waypoint[];
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  distanceKm: number;
  estimatedTimeMinutes: number;
}

export function RouteCreator({
  onSave,
  onCancel,
  mapRef,
  existingRoute,
  onRouteTypeChange,
}: RouteCreatorProps) {
  // Route metadata
  const [title, setTitle] = useState(existingRoute?.title || "");
  const [description, setDescription] = useState(existingRoute?.description || "");
  const [visibility, setVisibility] = useState<"private" | "link" | "public">(
    existingRoute?.visibility || "private"
  );
  const [difficulty, setDifficulty] = useState<
    "unrated" | "easy" | "moderate" | "difficult" | "severe"
  >(existingRoute?.difficulty || "unrated");

  // Use waypoints from existingRoute prop (controlled by parent)
  const waypoints = existingRoute?.waypoints || [];
  const routeType = existingRoute?.routeType || "linear";
  const [distanceKm, setDistanceKm] = useState(0);
  const [displayUnits, setDisplayUnits] = useState<"km" | "miles">("km");
  const [saving, setSaving] = useState(false);

  // Calculate distance when waypoints change
  useEffect(() => {
    if (waypoints.length < 2) {
      setDistanceKm(0);
      return;
    }

    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      total += haversineDistance(
        waypoints[i - 1].lat,
        waypoints[i - 1].lng,
        waypoints[i].lat,
        waypoints[i].lng
      );
    }

    // Add closing segment for circular routes
    if (routeType === "circular" && waypoints.length > 2) {
      total += haversineDistance(
        waypoints[waypoints.length - 1].lat,
        waypoints[waypoints.length - 1].lng,
        waypoints[0].lat,
        waypoints[0].lng
      );
    }

    setDistanceKm(total);
  }, [waypoints, routeType]);

  const haversineDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const displayDistance = displayUnits === "km" ? distanceKm : distanceKm * 0.621371;
  const distanceLabel = displayUnits === "km" ? "km" : "mi";

  const rideTimeMinutes = Math.round((distanceKm / 10) * 60);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a route name");
      return;
    }

    if (waypoints.length < 2) {
      toast.error("Please add at least 2 waypoints");
      return;
    }

    setSaving(true);
    try {
      const routeData: RouteData = {
        title,
        description,
        visibility,
        difficulty,
        routeType,
        waypoints,
        geometry: {
          type: "LineString",
          coordinates: waypoints.map((wp) => [wp.lng, wp.lat]),
        },
        distanceKm,
        estimatedTimeMinutes: rideTimeMinutes,
      };

      await onSave(routeData);
    } catch (error) {
      toast.error("Failed to save route");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Route</h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Route Type Badge - auto-detected, not selectable */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Route Type</Label>
          <div className="flex items-center gap-2">
            <Badge 
              variant={routeType === "circular" ? "default" : "secondary"}
              className={routeType === "circular" ? "bg-green-600" : ""}
            >
              {routeType === "circular" ? (
                <>
                  <Circle className="h-3 w-3 mr-1" />
                  Circular
                </>
              ) : (
                <>
                  <Route className="h-3 w-3 mr-1" />
                  Linear
                </>
              )}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {routeType === "circular" 
                ? "Route connects back to start" 
                : "Click near start point to make circular"}
            </span>
          </div>
        </div>

        <Separator />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
              <Clock className="h-3.5 w-3.5" />
              Route time
            </div>
            <div className="text-2xl font-bold">
              {distanceKm > 0 ? formatTime(rideTimeMinutes) : "0 min"}
            </div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
              <Ruler className="h-3.5 w-3.5" />
              Route distance
            </div>
            <div className="text-2xl font-bold">
              {distanceKm > 0 ? displayDistance.toFixed(2) : "0.00"} {distanceLabel}
            </div>
          </div>
        </div>

        {/* Unit toggle */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={displayUnits === "km" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDisplayUnits("km")}
          >
            Kilometres
          </Button>
          <Button
            variant={displayUnits === "miles" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDisplayUnits("miles")}
          >
            Miles
          </Button>
        </div>

        {/* Waypoint count */}
        {waypoints.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            {waypoints.length} waypoint{waypoints.length !== 1 ? "s" : ""} plotted
          </div>
        )}

        <Separator />

        {/* Route name */}
        <div className="space-y-2">
          <Label htmlFor="route-name">Route name*</Label>
          <div className="relative">
            <Input
              id="route-name"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              placeholder="100 characters"
              maxLength={100}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {title.length}/100
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="route-description">Route description</Label>
          <Textarea
            id="route-description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
            placeholder="5000 characters"
            rows={4}
            maxLength={5000}
          />
          <span className="text-xs text-muted-foreground">
            {description.length}/5000
          </span>
        </div>

        <Separator />

        {/* Visibility */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Who can see this route?</Label>
          <RadioGroup
            value={visibility}
            onValueChange={(v) => setVisibility(v as typeof visibility)}
            className="space-y-2"
          >
            <label 
              htmlFor="private"
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                visibility === "private" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="private" id="private" className="mt-0.5" />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Private
                </div>
                <p className="text-xs text-muted-foreground">
                  Only you can see this route
                </p>
              </div>
            </label>
            <label 
              htmlFor="link"
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                visibility === "link" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="link" id="link" className="mt-0.5" />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Anyone with Link
                </div>
                <p className="text-xs text-muted-foreground">
                  Only people with a link can see
                </p>
              </div>
            </label>
            <label 
              htmlFor="public"
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                visibility === "public" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="public" id="public" className="mt-0.5" />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Public
                </div>
                <p className="text-xs text-muted-foreground">
                  Anyone can see the route
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        <Separator />

        {/* Difficulty */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Difficulty</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help text-xs">ⓘ</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Rate the difficulty based on terrain, elevation, and obstacles
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              ["unrated", "easy", "moderate", "difficult", "severe"] as const
            ).map((level) => (
              <Button
                key={level}
                variant={difficulty === level ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficulty(level)}
                className={
                  difficulty === level
                    ? level === "easy"
                      ? "bg-green-600 hover:bg-green-700"
                      : level === "moderate"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : level === "difficult"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : level === "severe"
                      ? "bg-red-600 hover:bg-red-700"
                      : ""
                    : ""
                }
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-4 py-4 border-t bg-background space-y-3">
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={onCancel}
        >
          CANCEL
        </Button>
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={saving || waypoints.length < 2 || !title.trim()}
        >
          {saving ? "SAVING..." : "SAVE ROUTE"}
        </Button>
      </div>
    </div>
  );
}

// Route style options
export interface RouteStyle {
  color: string;
  thickness: number;
  opacity: number;
}

const ROUTE_COLORS = [
  { name: "Dark", value: "#374151" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#059669" },
  { name: "Orange", value: "#D97706" },
  { name: "Purple", value: "#7C3AED" },
];

const THICKNESS_OPTIONS = [2, 3, 4, 6, 8];

// Tool mode for the route creator
export type ToolMode = "plot" | "erase" | "insert";

// Toolbar component for the map - styled like OS Maps
export function RouteCreatorToolbar({
  isPlotting,
  setIsPlotting,
  snapEnabled,
  setSnapEnabled,
  toolMode,
  setToolMode,
  onUndo,
  onClear,
  canUndo,
  routeStyle,
  onStyleChange,
}: {
  isPlotting: boolean;
  setIsPlotting: (v: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (v: boolean) => void;
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
  routeStyle?: RouteStyle;
  onStyleChange?: (style: RouteStyle) => void;
}) {
  const [showStylePopup, setShowStylePopup] = useState(false);
  const [localStyle, setLocalStyle] = useState<RouteStyle>(
    routeStyle || { color: "#3B82F6", thickness: 4, opacity: 100 }
  );

  // Cantra brand green color
  const activeColor = "bg-[#2E8B57]";
  const activeTextColor = "text-white";

  const handleStyleChange = (newStyle: Partial<RouteStyle>) => {
    const updated = { ...localStyle, ...newStyle };
    setLocalStyle(updated);
    onStyleChange?.(updated);
  };

  const handleToolClick = (mode: ToolMode) => {
    if (toolMode === mode && isPlotting) {
      // Clicking active tool deselects it
      setIsPlotting(false);
    } else {
      setToolMode(mode);
      setIsPlotting(true);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-10">
      <Card className="p-1.5 bg-white shadow-lg border-0">
        <div className="flex items-center gap-0.5">
          {/* Plot */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleToolClick("plot")}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all ${
                  isPlotting && toolMode === "plot"
                    ? `${activeColor} ${activeTextColor} shadow-sm` 
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <Pencil className="h-5 w-5" />
                <span className="text-[11px] mt-1 font-semibold tracking-wide">Plot</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Click on map to add waypoints</p>
            </TooltipContent>
          </Tooltip>

          {/* Erase */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleToolClick("erase")}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all ${
                  isPlotting && toolMode === "erase"
                    ? `${activeColor} ${activeTextColor} shadow-sm` 
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <Eraser className="h-5 w-5" />
                <span className="text-[11px] mt-1 font-semibold tracking-wide">Erase</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Click waypoints to remove them</p>
            </TooltipContent>
          </Tooltip>

          {/* Insert */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleToolClick("insert")}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all ${
                  isPlotting && toolMode === "insert"
                    ? `${activeColor} ${activeTextColor} shadow-sm` 
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <PlusCircle className="h-5 w-5" />
                <span className="text-[11px] mt-1 font-semibold tracking-wide">Insert</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Click on route line to insert a waypoint</p>
            </TooltipContent>
          </Tooltip>

          {/* Snap */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSnapEnabled(!snapEnabled)}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all ${
                  snapEnabled 
                    ? `${activeColor} ${activeTextColor} shadow-sm` 
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <Magnet className="h-5 w-5" />
                <span className="text-[11px] mt-1 font-semibold tracking-wide">Snap</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Snap waypoints to roads & paths</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-12 bg-gray-200 mx-1" />

          {/* Undo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all ${
                  canUndo 
                    ? "hover:bg-gray-100 text-gray-600" 
                    : "text-gray-300 cursor-not-allowed"
                }`}
              >
                <Undo2 className="h-5 w-5" />
                <span className="text-[11px] mt-1 font-semibold tracking-wide">Undo</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Undo last action</p>
            </TooltipContent>
          </Tooltip>

          {/* Clear All */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onClear}
                className="flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all hover:bg-gray-100 text-gray-600"
              >
                <Trash2 className="h-5 w-5" />
                <span className="text-[11px] mt-1 font-semibold tracking-wide">Clear</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Clear all waypoints</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-12 bg-gray-200 mx-1" />

          {/* Style - with popup */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowStylePopup(!showStylePopup)}
                  className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all ${
                    showStylePopup 
                      ? `${activeColor} ${activeTextColor} shadow-sm` 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <Palette className="h-5 w-5" />
                  <span className="text-[11px] mt-1 font-semibold tracking-wide">Style</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Route style options</p>
              </TooltipContent>
            </Tooltip>

            {/* Style Popup */}
            {showStylePopup && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border p-4 z-50">
                <div className="space-y-4">
                  {/* Line Colour */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Line Colour
                    </label>
                    <div className="flex gap-2">
                      {ROUTE_COLORS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => handleStyleChange({ color: c.value })}
                          className={`w-8 h-8 rounded-full transition-all ${
                            localStyle.color === c.value
                              ? "ring-2 ring-offset-2 ring-[#2E8B57] scale-110"
                              : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Line Thickness */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Line Thickness
                    </label>
                    <div className="flex items-center gap-2">
                      {THICKNESS_OPTIONS.map((t) => (
                        <button
                          key={t}
                          onClick={() => handleStyleChange({ thickness: t })}
                          className={`flex-1 h-8 rounded border-2 transition-all flex items-center justify-center ${
                            localStyle.thickness === t
                              ? "border-[#2E8B57] bg-[#2E8B57]/10"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div
                            className="rounded-full bg-gray-800"
                            style={{ height: `${t}px`, width: "24px" }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Line Transparency */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Line Transparency
                      </label>
                      <span className="text-sm text-gray-500">
                        {100 - localStyle.opacity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={localStyle.opacity}
                      onChange={(e) =>
                        handleStyleChange({ opacity: parseInt(e.target.value) })
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2E8B57]"
                    />
                  </div>

                  {/* Preview */}
                  <div className="pt-2 border-t">
                    <label className="text-xs text-gray-500 block mb-2">Preview</label>
                    <div className="h-4 rounded-full" 
                      style={{ 
                        backgroundColor: localStyle.color,
                        height: `${localStyle.thickness * 2}px`,
                        opacity: localStyle.opacity / 100 
                      }} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Path layer toggles for the create route sidebar
export function PathLayerToggles({
  layers,
  onToggle,
}: {
  layers: {
    bridleways: boolean;
    boats: boolean;
    footpaths: boolean;
    permissive: boolean;
  };
  onToggle: (layer: string, enabled: boolean) => void;
}) {
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-sm">Public Rights of Way</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[#8B4513]" />
            <Label htmlFor="bridleways" className="text-sm font-normal cursor-pointer">
              Bridleways
            </Label>
          </div>
          <Switch
            id="bridleways"
            checked={layers.bridleways}
            onCheckedChange={(checked) => onToggle("bridleways", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[#2E8B57]" />
            <Label htmlFor="boats" className="text-sm font-normal cursor-pointer">
              BOATs
            </Label>
          </div>
          <Switch
            id="boats"
            checked={layers.boats}
            onCheckedChange={(checked) => onToggle("boats", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[#D2691E]" />
            <Label htmlFor="footpaths" className="text-sm font-normal cursor-pointer">
              Footpaths
            </Label>
          </div>
          <Switch
            id="footpaths"
            checked={layers.footpaths}
            onCheckedChange={(checked) => onToggle("footpaths", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[#9370DB]" />
            <Label htmlFor="permissive" className="text-sm font-normal cursor-pointer">
              Permissive Paths
            </Label>
          </div>
          <Switch
            id="permissive"
            checked={layers.permissive}
            onCheckedChange={(checked) => onToggle("permissive", checked)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-2 border-t">
        Toggle layers to see public paths on the map
      </p>
    </Card>
  );
}
