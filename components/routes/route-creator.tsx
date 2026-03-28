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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  Link,
  X,
  Eraser,
  PlusCircle,
  Map,
  MapPin,
  Check,
} from "lucide-react";
import { RoutesPanelHeader } from "./routes-panel-header";
import {
  QuickAddWaypointDialog,
  TempRouteWaypoint,
} from "./quick-add-waypoint-dialog";

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
  isEditing?: boolean;
  isMobile?: boolean;
  onMapClick?: () => void;
  onWaypointPlacementModeChange?: (enabled: boolean, handler: (lat: number, lng: number) => void) => void;
  tempRouteWaypointsForDisplay?: TempRouteWaypoint[];
}

export interface RouteData {
  title: string;
  description: string;
  visibility: "private" | "link" | "public";
  difficulty: "unrated" | "easy" | "moderate" | "difficult" | "severe";
  routeType: "circular" | "linear";
  waypoints: Waypoint[];
  routeWaypoints?: TempRouteWaypoint[]; // POIs/instructions/cautions added during planning
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
  isEditing = false,
  isMobile = false,
  onMapClick,
  onWaypointPlacementModeChange,
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

  // Route waypoints (POIs/instructions/cautions) - added during planning
  const [tempRouteWaypoints, setTempRouteWaypoints] = useState<TempRouteWaypoint[]>(
    existingRoute?.routeWaypoints || []
  );
  const [waypointPlacementMode, setWaypointPlacementMode] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddPosition, setQuickAddPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Notify parent when waypoint placement mode changes
  useEffect(() => {
    if (onWaypointPlacementModeChange) {
      onWaypointPlacementModeChange(waypointPlacementMode, handleMapClickForWaypoint);
    }
  }, [waypointPlacementMode]);

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

  // Waypoint placement handlers
  const handleToggleWaypointMode = () => {
    setWaypointPlacementMode((prev) => !prev);
    if (!waypointPlacementMode) {
      toast.info("Click on the map to add a waypoint");
    }
  };

  const handleMapClickForWaypoint = (lat: number, lng: number) => {
    if (!waypointPlacementMode) return;
    setQuickAddPosition({ lat, lng });
    setQuickAddOpen(true);
  };

  const handleAddWaypoint = (waypoint: TempRouteWaypoint) => {
    setTempRouteWaypoints((prev) => [...prev, waypoint]);
    toast.success(`Waypoint "${waypoint.name}" added`);
    setWaypointPlacementMode(false); // Exit waypoint mode after adding
  };

  const handleRemoveWaypoint = (id: string) => {
    setTempRouteWaypoints((prev) => prev.filter((wp) => wp.id !== id));
    toast.success("Waypoint removed");
  };

  const handleSave = async () => {
    // Validation with detailed messages
    const errors: string[] = [];
    
    if (!title.trim()) {
      errors.push("Route name is required");
    }
    
    if (waypoints.length < 2) {
      errors.push("Add at least 2 waypoints to create a route");
    }
    
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    setSaving(true);
    try {
      const routeData: RouteData = {
        title: title.trim(),
        description: description.trim(),
        visibility,
        difficulty,
        routeType,
        waypoints,
        routeWaypoints: tempRouteWaypoints.length > 0 ? tempRouteWaypoints : undefined,
        geometry: {
          type: "LineString",
          coordinates: waypoints.map((wp) => [wp.lng, wp.lat]),
        },
        distanceKm,
        estimatedTimeMinutes: rideTimeMinutes,
      };

      await onSave(routeData);
      toast.success("Route saved successfully!");
    } catch (error: any) {
      console.error("Save route error:", error);
      toast.error(error?.message || "Failed to save route. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header with menu, search, profile, close - desktop only */}
      {!isMobile && (
        <RoutesPanelHeader
          onClose={onCancel}
          showSearch={false}
        />
      )}
      
      {/* Title bar */}
      <div className={`px-4 py-2 border-b bg-background ${isMobile ? "text-center" : ""}`}>
        <h2 className="text-lg font-semibold">{isEditing ? "Edit Route" : "Create Route"}</h2>
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
          <Label className="text-sm font-medium">Visibility</Label>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                value: "public" as const,
                icon: Globe,
                label: "Public",
                desc: "Visible to everyone",
              },
              {
                value: "link" as const,
                icon: Link,
                label: "Anyone with\nLink",
                desc: "Shared via link",
              },
              {
                value: "private" as const,
                icon: Lock,
                label: "Private",
                desc: "Only you can see",
              },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 cursor-pointer transition-all text-center",
                  visibility === opt.value
                    ? "border-[#267347] bg-[#267347]/5 shadow-sm"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                )}
              >
                {visibility === opt.value && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#267347] flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                <opt.icon className={cn(
                  "h-7 w-7",
                  visibility === opt.value ? "text-[#267347]" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs font-semibold leading-tight whitespace-pre-line",
                  visibility === opt.value ? "text-foreground" : "text-muted-foreground"
                )}>
                  {opt.label}
                </span>
                <p className="text-[10px] text-muted-foreground leading-tight px-1">
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>
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

      {/* Bottom actions - hidden on mobile (handled by parent bottom sheet) */}
      {!isMobile && (
        <div className="px-4 py-4 border-t bg-background space-y-3">
          {/* Save requirements hint */}
          {(waypoints.length < 2 || !title.trim()) && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              {!title.trim() && <p>• Enter a route name</p>}
              {waypoints.length < 2 && <p>• Add at least 2 waypoints on the map</p>}
            </div>
          )}
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={onCancel}
          >
            CANCEL
          </Button>
          <Button
            className="w-full bg-[#2E8B57] hover:bg-[#256b45]"
            onClick={handleSave}
            disabled={saving || waypoints.length < 2 || !title.trim()}
          >
            {saving ? "SAVING..." : "SAVE ROUTE"}
          </Button>
        </div>
      )}

      {/* Hidden save button for mobile - triggered by parent */}
      {isMobile && (
        <button
          data-mobile-save
          onClick={handleSave}
          className="hidden"
          disabled={saving || waypoints.length < 2 || !title.trim()}
        />
      )}

      {/* Mobile save requirements hint */}
      {isMobile && (waypoints.length < 2 || !title.trim()) && (
        <div className="mx-4 mb-4 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          {!title.trim() && <p>• Enter a route name</p>}
          {waypoints.length < 2 && <p>• Add at least 2 waypoints on the map</p>}
        </div>
      )}

      {/* Quick Add Waypoint Dialog */}
      <QuickAddWaypointDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        position={quickAddPosition}
        onAdd={handleAddWaypoint}
      />
    </div>
  );
}

// Route style options
export interface RouteStyle {
  color: string;
  thickness: number;
  opacity: number;
}

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
  isMobile = false,
  containerClassName,
  onExitCreation,
  waypointPlacementMode = false,
  onToggleWaypointMode,
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
  isMobile?: boolean;
  containerClassName?: string;
  onExitCreation?: () => void;
  waypointPlacementMode?: boolean;
  onToggleWaypointMode?: () => void;
}) {
  // padoq brand green color
  const activeColor = "bg-[#2E8B57]";
  const activeTextColor = "text-white";

  const handleToolClick = (mode: ToolMode) => {
    if (toolMode === mode && isPlotting) {
      // Clicking active tool deselects it
      setIsPlotting(false);
    } else {
      setToolMode(mode);
      setIsPlotting(true);
    }
  };

  // Mobile layout - compact horizontal toolbar
  if (isMobile) {
    return (
      <div className="flex items-center justify-around gap-1 w-full">
        {/* Plot */}
        <button
          onClick={() => handleToolClick("plot")}
          className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-md transition-all ${
            isPlotting && toolMode === "plot"
              ? `${activeColor} ${activeTextColor}`
              : "text-gray-600"
          }`}
        >
          <Pencil className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Plot</span>
        </button>

        {/* Erase */}
        <button
          onClick={() => handleToolClick("erase")}
          className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-md transition-all ${
            isPlotting && toolMode === "erase"
              ? `${activeColor} ${activeTextColor}`
              : "text-gray-600"
          }`}
        >
          <Eraser className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Erase</span>
        </button>

        {/* Waypoint */}
        {onToggleWaypointMode && (
          <button
            onClick={onToggleWaypointMode}
            className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-md transition-all ${
              waypointPlacementMode
                ? `${activeColor} ${activeTextColor}`
                : "text-gray-600"
            }`}
          >
            <MapPin className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">Waypoint</span>
          </button>
        )}

        {/* Snap */}
        <button
          onClick={() => setSnapEnabled(!snapEnabled)}
          className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-md transition-all ${
            snapEnabled
              ? `${activeColor} ${activeTextColor}`
              : "text-gray-600"
          }`}
        >
          <Magnet className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Snap</span>
        </button>

        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-md transition-all ${
            canUndo ? "text-gray-600" : "text-gray-300"
          }`}
        >
          <Undo2 className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Undo</span>
        </button>

        {/* Clear */}
        <button
          onClick={onClear}
          className="flex flex-col items-center justify-center px-2 py-1.5 rounded-md transition-all text-gray-600"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Clear</span>
        </button>

        {/* Exit */}
        {onExitCreation && (
          <button
            onClick={onExitCreation}
            className="flex flex-col items-center justify-center px-2 py-1.5 rounded-md transition-all text-gray-600 hover:text-red-600"
          >
            <X className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">Exit</span>
          </button>
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={cn("absolute top-20 right-4 z-30", containerClassName)}>
      <Card className="p-1.5 bg-white shadow-lg border-0 rounded-lg">
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

          {/* Waypoint (POI) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleToolClick("insert")}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all ${
                  isPlotting && toolMode === "insert"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <MapPin className="h-5 w-5" />
                <span className="text-[11px] mt-1 font-semibold tracking-wide">Waypoint</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Click on map to add a named waypoint (POI)</p>
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

          {/* Add Waypoint */}
          {onToggleWaypointMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleWaypointMode}
                  className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all ${
                    waypointPlacementMode
                      ? `${activeColor} ${activeTextColor} shadow-sm`
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <MapPin className="h-5 w-5" />
                  <span className="text-[11px] mt-1 font-semibold tracking-wide">Waypoint</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Add POI, instruction or caution to route</p>
              </TooltipContent>
            </Tooltip>
          )}

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

          {/* Exit route creation */}
          {onExitCreation && (
            <>
              <div className="w-px h-12 bg-gray-200 mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onExitCreation}
                    className="flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all hover:bg-red-50 text-gray-600 hover:text-red-600"
                  >
                    <X className="h-5 w-5" />
                    <span className="text-[11px] mt-1 font-semibold tracking-wide">Exit</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Exit route creation</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
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
