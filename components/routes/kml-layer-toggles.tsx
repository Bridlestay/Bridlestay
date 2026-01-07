"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Path colors matching routes-map-v2.tsx
const PATH_COLORS = {
  bridleway: "#8B4513",
  footpath: "#228B22",
  byway: "#9932CC",
  restricted_byway: "#FF8C00",
};

interface KMLLayerTogglesProps {
  layers: {
    bridleways: boolean;
    boats: boolean;
    footpaths: boolean;
    permissive: boolean;
  };
  onToggle: (layer: string, enabled: boolean) => void;
}

export function KMLLayerToggles({ layers, onToggle }: KMLLayerTogglesProps) {
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-sm">Public Rights of Way</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="bridleways" className="text-sm font-normal flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: PATH_COLORS.bridleway }}
            />
            Bridleways
            <span className="text-xs text-muted-foreground">(horse-friendly)</span>
          </Label>
          <Switch
            id="bridleways"
            checked={layers.bridleways}
            onCheckedChange={(checked) => onToggle("bridleways", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="boats" className="text-sm font-normal flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: PATH_COLORS.byway }}
            />
            Byways (BOATs)
          </Label>
          <Switch
            id="boats"
            checked={layers.boats}
            onCheckedChange={(checked) => onToggle("boats", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="footpaths" className="text-sm font-normal flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: PATH_COLORS.footpath }}
            />
            Footpaths
          </Label>
          <Switch
            id="footpaths"
            checked={layers.footpaths}
            onCheckedChange={(checked) => onToggle("footpaths", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="permissive" className="text-sm font-normal flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: PATH_COLORS.restricted_byway }}
            />
            Restricted Byways
          </Label>
          <Switch
            id="permissive"
            checked={layers.permissive}
            onCheckedChange={(checked) => onToggle("permissive", checked)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-2 border-t">
        Worcestershire public rights of way data
      </p>
    </Card>
  );
}



