"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Layers,
  Map as MapIcon,
  Mountain,
  Satellite,
  X,
  Minus,
  Plus,
  MapPin,
  AlertTriangle,
  Home,
  Landmark,
  Crosshair,
  Save,
  RotateCcw,
  Navigation2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ROUTE_STYLE_DEFAULTS = {
  routeColor: "#3B82F6",
  routeThickness: 4,
  routeOpacity: 80,
};

const ROUTE_STYLE_STORAGE_KEY = "padoq_route_style_defaults";

export type MapType = "standard" | "topographic" | "aerial";

export interface LayerSettings {
  mapType: MapType;
  showBridleways: boolean;
  showFootpaths: boolean;
  showByways: boolean;
  showRestrictedByways: boolean;
  showWaymarkers: boolean;
  showHazards: boolean;
  showProperties: boolean;
  showPOIs: boolean;
  routeColor: string;
  routeThickness: number;
  routeOpacity: number;
}

interface MapLayerControlsProps {
  settings: LayerSettings;
  onSettingsChange: (settings: LayerSettings) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocateMe?: () => void;
  onResetNorth?: () => void;
  isLocating?: boolean;
  mapBearing?: number;
  className?: string;
  showPanel?: boolean;
  onPanelChange?: (open: boolean) => void;
}

export function MapLayerControls({
  settings,
  onSettingsChange,
  onZoomIn,
  onZoomOut,
  onLocateMe,
  onResetNorth,
  isLocating = false,
  mapBearing = 0,
  className,
  showPanel: externalShowPanel,
  onPanelChange,
}: MapLayerControlsProps) {
  const [internalShowPanel, setInternalShowPanel] = useState(false);
  
  // Use external state if provided, otherwise internal
  const showLayerPanel = externalShowPanel ?? internalShowPanel;
  const setShowLayerPanel = (open: boolean) => {
    setInternalShowPanel(open);
    onPanelChange?.(open);
  };

  const updateSetting = <K extends keyof LayerSettings>(
    key: K,
    value: LayerSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const mapTypes: { type: MapType; label: string; icon: React.ReactNode }[] = [
    { type: "standard", label: "Standard", icon: <MapIcon className="h-8 w-8" /> },
    { type: "topographic", label: "Topographic", icon: <Mountain className="h-8 w-8" /> },
    { type: "aerial", label: "Aerial", icon: <Satellite className="h-8 w-8" /> },
  ];

  return (
    <>
      {/* Floating control buttons - bottom right */}
      <TooltipProvider delayDuration={300}>
        <div className={cn("absolute bottom-20 right-4 flex flex-col gap-2 z-20", className)}>
          {/* Face North button — only visible when map is rotated */}
          {onResetNorth && Math.abs(mapBearing) > 1 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-11 w-11 rounded-full shadow-lg bg-white hover:bg-gray-100"
                  onClick={onResetNorth}
                >
                  <Navigation2
                    className="h-5 w-5 text-red-500 transition-transform duration-300"
                    style={{ transform: `rotate(${-mapBearing}deg)` }}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Face north</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Locate me button — mobile only */}
          {onLocateMe && (
            <div className="md:hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className={cn(
                      "h-11 w-11 rounded-full shadow-lg",
                      isLocating
                        ? "bg-green-50 hover:bg-green-100 border border-green-200"
                        : "bg-white hover:bg-gray-100"
                    )}
                    onClick={onLocateMe}
                  >
                    <Crosshair className={cn("h-5 w-5", isLocating ? "text-green-600" : "text-gray-700")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{isLocating ? "Re-centre on location" : "Find my location"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Layer toggle button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-11 w-11 rounded-full shadow-lg bg-white hover:bg-gray-100"
                onClick={() => setShowLayerPanel(!showLayerPanel)}
              >
                <Layers className="h-5 w-5 text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Map settings</p>
            </TooltipContent>
          </Tooltip>

          {/* Zoom controls */}
          <div className="flex flex-col w-11 bg-white rounded-full shadow-lg overflow-hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-11 rounded-none hover:bg-gray-100"
                  onClick={onZoomIn}
                >
                  <Plus className="h-4 w-4 text-gray-700" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Zoom in</p>
              </TooltipContent>
            </Tooltip>
            <div className="h-px bg-gray-200" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-11 rounded-none hover:bg-gray-100"
                  onClick={onZoomOut}
                >
                  <Minus className="h-4 w-4 text-gray-700" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Zoom out</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {/* Layer settings panel - slides up from bottom on mobile, side panel on desktop */}
      {showLayerPanel && (
        <div className="absolute inset-x-0 bottom-0 z-30 lg:inset-auto lg:right-20 lg:bottom-4 lg:w-80">
          <Card className="rounded-t-2xl lg:rounded-2xl shadow-2xl max-h-[70vh] overflow-y-auto scrollbar-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-lg">Map Settings</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowLayerPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 space-y-6">
              {/* Map Type Selection */}
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-3 block">
                  Map Type
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {mapTypes.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => updateSetting("mapType", type)}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-xl border-2 transition-all",
                        settings.mapType === type
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className={cn(
                        "text-gray-600 mb-1",
                        settings.mapType === type && "text-primary"
                      )}>
                        {icon}
                      </div>
                      <span className={cn(
                        "text-xs font-medium",
                        settings.mapType === type ? "text-primary" : "text-gray-600"
                      )}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Path Layers */}
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-3 block">
                  Path Layers
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-amber-700 rounded" />
                      <span className="text-sm">Bridleways</span>
                    </div>
                    <Switch
                      checked={settings.showBridleways}
                      onCheckedChange={(v) => updateSetting("showBridleways", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-purple-600 rounded" />
                      <span className="text-sm">Byways (BOATS)</span>
                    </div>
                    <Switch
                      checked={settings.showByways}
                      onCheckedChange={(v) => updateSetting("showByways", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-orange-500 rounded" />
                      <span className="text-sm">Restricted Byways</span>
                    </div>
                    <Switch
                      checked={settings.showRestrictedByways}
                      onCheckedChange={(v) => updateSetting("showRestrictedByways", v)}
                    />
                  </div>
                </div>
              </div>

              {/* Map Features */}
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-3 block">
                  Show on Map
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Waypoints</span>
                    </div>
                    <Switch
                      checked={settings.showWaymarkers}
                      onCheckedChange={(v) => updateSetting("showWaymarkers", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Hazards</span>
                    </div>
                    <Switch
                      checked={settings.showHazards}
                      onCheckedChange={(v) => updateSetting("showHazards", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm">Properties</span>
                    </div>
                    <Switch
                      checked={settings.showProperties}
                      onCheckedChange={(v) => updateSetting("showProperties", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Points of Interest</span>
                    </div>
                    <Switch
                      checked={settings.showPOIs}
                      onCheckedChange={(v) => updateSetting("showPOIs", v)}
                    />
                  </div>
                </div>
              </div>

              {/* Route Style */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-600 block">
                  Route Style
                </Label>

                {/* Line Colour */}
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">
                    Line Colour
                  </label>
                  <div className="flex gap-2">
                    {[
                      { name: "Dark", value: "#374151" },
                      { name: "Blue", value: "#3B82F6" },
                      { name: "Green", value: "#059669" },
                      { name: "Orange", value: "#D97706" },
                      { name: "Purple", value: "#7C3AED" },
                    ].map((c) => (
                      <button
                        key={c.value}
                        onClick={() => updateSetting("routeColor", c.value)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          settings.routeColor === c.value
                            ? "ring-2 ring-offset-2 ring-green-600 scale-110"
                            : "hover:scale-105"
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Line Thickness */}
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">
                    Line Thickness
                  </label>
                  <div className="flex items-center gap-2">
                    {[2, 3, 4, 6, 8].map((t) => (
                      <button
                        key={t}
                        onClick={() => updateSetting("routeThickness", t)}
                        className={cn(
                          "flex-1 h-8 rounded border-2 transition-all flex items-center justify-center",
                          settings.routeThickness === t
                            ? "border-green-600 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
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
                    <label className="text-xs font-medium text-gray-500">
                      Line Transparency
                    </label>
                    <span className="text-xs text-gray-500">
                      {100 - settings.routeOpacity}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.routeOpacity]}
                    onValueChange={([v]) => updateSetting("routeOpacity", v)}
                    min={20}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>

                {/* Preview */}
                <div className="pt-2 border-t">
                  <label className="text-xs text-gray-400 block mb-2">Preview</label>
                  <div
                    className="h-4 rounded-full"
                    style={{
                      backgroundColor: settings.routeColor,
                      height: `${settings.routeThickness * 2}px`,
                      opacity: settings.routeOpacity / 100,
                    }}
                  />
                </div>

                {/* Set as default / Reset */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-8"
                    onClick={() => {
                      const defaults = {
                        routeColor: settings.routeColor,
                        routeThickness: settings.routeThickness,
                        routeOpacity: settings.routeOpacity,
                      };
                      localStorage.setItem(ROUTE_STYLE_STORAGE_KEY, JSON.stringify(defaults));
                      toast.success("Route style saved as default");
                    }}
                  >
                    <Save className="h-3.5 w-3.5" />
                    Set as default
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-8 text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      const saved = localStorage.getItem(ROUTE_STYLE_STORAGE_KEY);
                      const defaults = saved ? JSON.parse(saved) : ROUTE_STYLE_DEFAULTS;
                      updateSetting("routeColor", defaults.routeColor);
                      updateSetting("routeThickness", defaults.routeThickness);
                      updateSetting("routeOpacity", defaults.routeOpacity);
                      toast.success("Route style reset");
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                </div>
              </div>

            </div>
          </Card>
        </div>
      )}
    </>
  );
}

