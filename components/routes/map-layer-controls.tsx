"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  routeLineWidth: number;
  monochrome?: boolean;
}

interface MapLayerControlsProps {
  settings: LayerSettings;
  onSettingsChange: (settings: LayerSettings) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
  showPanel?: boolean;
  onPanelChange?: (open: boolean) => void;
}

export function MapLayerControls({
  settings,
  onSettingsChange,
  onZoomIn,
  onZoomOut,
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
      <div className={cn("absolute bottom-20 right-4 flex flex-col gap-2 z-20", className)}>
        {/* Layer toggle button */}
        <Button
          variant="secondary"
          size="icon"
          className="h-11 w-11 rounded-full shadow-lg bg-white hover:bg-gray-100"
          onClick={() => setShowLayerPanel(!showLayerPanel)}
        >
          <Layers className="h-5 w-5 text-gray-700" />
        </Button>

        {/* Zoom controls */}
        <div className="flex flex-col bg-white rounded-full shadow-lg overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-none hover:bg-gray-100"
            onClick={onZoomIn}
          >
            <Plus className="h-4 w-4 text-gray-700" />
          </Button>
          <div className="h-px bg-gray-200" />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-none hover:bg-gray-100"
            onClick={onZoomOut}
          >
            <Minus className="h-4 w-4 text-gray-700" />
          </Button>
        </div>
      </div>

      {/* Layer settings panel - slides up from bottom on mobile, side panel on desktop */}
      {showLayerPanel && (
        <div className="absolute inset-x-0 bottom-0 z-30 lg:inset-auto lg:right-20 lg:bottom-4 lg:w-80">
          <Card className="rounded-t-2xl lg:rounded-2xl shadow-2xl max-h-[70vh] overflow-y-auto">
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
                  <div className="flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-green-600 rounded" />
                      <span className="text-sm">Footpaths</span>
                      <span className="text-xs text-gray-400">(Hidden)</span>
                    </div>
                    <Switch
                      checked={settings.showFootpaths}
                      onCheckedChange={(v) => updateSetting("showFootpaths", v)}
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
                </div>
              </div>

              {/* Route Style */}
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-3 block">
                  Route Line Width
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[settings.routeLineWidth]}
                    onValueChange={([v]) => updateSetting("routeLineWidth", v)}
                    min={2}
                    max={8}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500 w-6 text-center">
                    {settings.routeLineWidth}
                  </span>
                </div>
              </div>

              {/* Visual Settings */}
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-3 block">
                  Visual Settings
                </Label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Monochrome Map</span>
                  </div>
                  <Switch
                    checked={settings.monochrome || false}
                    onCheckedChange={(v) => updateSetting("monochrome", v)}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-6">
                  Grayscale map makes routes stand out
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

