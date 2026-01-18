"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Droplet,
  AlertTriangle,
  Car,
  Beer,
  DoorOpen,
  Coffee,
  Landmark,
  Squirrel,
  MapPin,
  Navigation,
} from "lucide-react";
import Image from "next/image";

interface WaypointCardProps {
  waypoint: {
    id: string;
    lat: number;
    lng: number;
    name?: string | null;
    description?: string | null;
    icon_type?: string | null;
    photo_url?: string | null;
    order_index: number;
    snapped?: boolean;
    snapped_to_path_type?: string | null;
  };
  index?: number;
  distanceFromStart?: number; // in km
  onClick?: () => void;
}

const ICON_MAP: Record<string, { icon: any; color: string; label: string }> = {
  viewpoint: { icon: Eye, color: "text-blue-600", label: "Viewpoint" },
  water: { icon: Droplet, color: "text-cyan-600", label: "Water" },
  hazard: { icon: AlertTriangle, color: "text-red-600", label: "Hazard" },
  parking: { icon: Car, color: "text-gray-600", label: "Parking" },
  pub: { icon: Beer, color: "text-amber-600", label: "Pub" },
  gate: { icon: DoorOpen, color: "text-slate-600", label: "Gate" },
  rest: { icon: Coffee, color: "text-green-600", label: "Rest Area" },
  historic: { icon: Landmark, color: "text-purple-600", label: "Historic Site" },
  wildlife: { icon: Squirrel, color: "text-emerald-600", label: "Wildlife Spot" },
  bridge: { icon: Navigation, color: "text-indigo-600", label: "Bridge" },
  ford: { icon: Droplet, color: "text-blue-600", label: "Ford/Crossing" },
  stile: { icon: DoorOpen, color: "text-amber-600", label: "Stile" },
  other: { icon: MapPin, color: "text-gray-500", label: "Point of Interest" },
};

const PATH_TYPE_LABELS: Record<string, string> = {
  bridleways: "Bridleway",
  boats: "Byway (BOAT)",
  footpaths: "Footpath",
  permissive: "Permissive Path",
};

export function WaypointCard({ waypoint, index, distanceFromStart, onClick }: WaypointCardProps) {
  const iconConfig = waypoint.icon_type ? (ICON_MAP[waypoint.icon_type] || ICON_MAP.other) : ICON_MAP.other;
  const Icon = iconConfig.icon;

  // Generate a name if not provided
  const displayName = waypoint.name || `Waypoint ${index || waypoint.order_index + 1}`;

  return (
    <Card
      className={`overflow-hidden ${onClick ? "cursor-pointer hover:shadow-lg transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex gap-4 p-4">
        {/* Icon Badge */}
        <div className="flex-shrink-0">
          <div className={`rounded-full bg-muted p-3 ${iconConfig.color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-base leading-tight">{displayName}</h4>
            {distanceFromStart !== undefined && (
              <Badge variant="outline" className="flex-shrink-0 text-xs">
                {distanceFromStart.toFixed(1)} km
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mb-2">
            {waypoint.icon_type && (
              <Badge variant="secondary" className="text-xs">
                {iconConfig.label}
              </Badge>
            )}
            {waypoint.snapped && waypoint.snapped_to_path_type && (
              <Badge variant="outline" className="text-xs">
                On {PATH_TYPE_LABELS[waypoint.snapped_to_path_type] || waypoint.snapped_to_path_type}
              </Badge>
            )}
          </div>

          {waypoint.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {waypoint.description}
            </p>
          )}

          {/* Coordinates */}
          <p className="text-xs text-muted-foreground">
            {waypoint.lat.toFixed(5)}, {waypoint.lng.toFixed(5)}
          </p>

          {/* Photo */}
          {waypoint.photo_url && (
            <div className="relative h-32 w-full mt-2 rounded-md overflow-hidden">
              <Image
                src={waypoint.photo_url}
                alt={displayName}
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

