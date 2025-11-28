"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
          <Label htmlFor="bridleways" className="text-sm font-normal">
            Bridleways
          </Label>
          <Switch
            id="bridleways"
            checked={layers.bridleways}
            onCheckedChange={(checked) => onToggle("bridleways", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="boats" className="text-sm font-normal">
            BOATs
          </Label>
          <Switch
            id="boats"
            checked={layers.boats}
            onCheckedChange={(checked) => onToggle("boats", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="footpaths" className="text-sm font-normal">
            Footpaths
          </Label>
          <Switch
            id="footpaths"
            checked={layers.footpaths}
            onCheckedChange={(checked) => onToggle("footpaths", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="permissive" className="text-sm font-normal">
            Permissive Paths
          </Label>
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



