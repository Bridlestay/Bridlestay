"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface WaypointCardProps {
  waypoint: {
    id: string;
    lat: number;
    lng: number;
    name?: string | null;
    description?: string | null;
    icon_type?: string | null;
    photo_url?: string | null;
    photos?: Array<{ id: string; url: string; caption?: string }>;
    order_index: number;
    snapped?: boolean;
    snapped_to_path_type?: string | null;
    tag?: string | null;
    pending_suggestions_count?: number;
  };
  index?: number;
  waypointNumber?: string; // "S", "1", "2", "F"
  distanceFromPrevious?: number; // in meters
  distanceFromStart?: number; // in km
  onShowOnMap?: () => void;
  onEdit?: () => void;
  onSuggestEdit?: () => void;
  isOwner?: boolean;
}

const TAG_CONFIG: Record<string, { label: string; className: string }> = {
  instruction: { label: "Instruction", className: "bg-blue-100 text-blue-700 border-blue-200" },
  poi: { label: "Point of Interest", className: "bg-purple-100 text-purple-700 border-purple-200" },
  caution: { label: "Caution", className: "bg-amber-100 text-amber-700 border-amber-200" },
  note: { label: "Note", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

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

export function WaypointCard({
  waypoint,
  waypointNumber,
  distanceFromPrevious,
  onShowOnMap,
  onEdit,
  onSuggestEdit,
  isOwner,
}: WaypointCardProps) {
  const [expanded, setExpanded] = useState(false);
  const iconConfig = waypoint.icon_type ? (ICON_MAP[waypoint.icon_type] || ICON_MAP.other) : ICON_MAP.other;
  const Icon = iconConfig.icon;

  // Generate a name if not provided
  const displayName = waypoint.name || "Waypoint";

  // Format distance
  const distanceText = distanceFromPrevious
    ? distanceFromPrevious < 1000
      ? `${Math.round(distanceFromPrevious)} m`
      : `${(distanceFromPrevious / 1000).toFixed(2)} km`
    : null;

  // Get all photos (primary + additional)
  const allPhotos = [
    ...(waypoint.photo_url ? [{ id: "primary", url: waypoint.photo_url, caption: null }] : []),
    ...(waypoint.photos || []),
  ];

  // Number circle color based on type (muted colors like Komoot)
  const getNumberCircleColor = () => {
    if (waypointNumber === "S") return "bg-green-600 text-white";
    if (waypointNumber === "F") return "bg-red-600 text-white";
    return "bg-slate-800 text-white";
  };

  return (
    <div className="relative mb-8">
      {/* Number Circle - positioned absolutely to overlay the timeline */}
      <div className={`absolute left-[-40px] top-2 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm ${getNumberCircleColor()}`}>
        {waypointNumber || waypoint.order_index + 1}
      </div>

      {/* Collapsed View - Always Visible */}
      <div
        className="flex items-start gap-3 py-2 pr-2 cursor-pointer hover:bg-slate-50 transition-colors rounded-lg bg-white"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Tag (small gray text) */}
          {waypoint.tag && TAG_CONFIG[waypoint.tag] && (
            <p className="text-xs text-slate-500 mb-0.5">{TAG_CONFIG[waypoint.tag].label}</p>
          )}

          {/* Name */}
          <h4 className="font-semibold text-base leading-tight text-slate-900">{displayName}</h4>
        </div>

        {/* Thumbnail Photo */}
        {allPhotos[0] && (
          <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
            <Image
              src={allPhotos[0].url}
              alt={displayName}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0 text-slate-400">
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="px-1 pb-4 bg-white" onClick={(e) => e.stopPropagation()}>
          {/* Description */}
          {waypoint.description && (
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              {waypoint.description}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {waypoint.icon_type && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {iconConfig.label}
              </Badge>
            )}
            {waypoint.tag && TAG_CONFIG[waypoint.tag] && (
              <Badge variant="outline" className={`text-xs ${TAG_CONFIG[waypoint.tag].className}`}>
                {TAG_CONFIG[waypoint.tag].label}
              </Badge>
            )}
          </div>

          {/* Photos Grid */}
          {allPhotos.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {allPhotos.slice(0, 4).map((photo, idx) => (
                <div key={photo.id || idx} className="relative h-24 rounded-md overflow-hidden">
                  <Image
                    src={photo.url}
                    alt={photo.caption || displayName}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Show on Map */}
            {onShowOnMap && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50 h-8"
                onClick={onShowOnMap}
              >
                <MapPin className="h-3.5 w-3.5 mr-1" />
                Show on map
              </Button>
            )}

            {/* Edit / Suggest Edit */}
            {isOwner && onEdit ? (
              <button
                onClick={onEdit}
                className="relative text-slate-600 hover:text-slate-900 transition-colors p-1"
                title="Edit waypoint"
              >
                <Pencil className="h-4 w-4" />
                {waypoint.pending_suggestions_count && waypoint.pending_suggestions_count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white text-[9px] rounded-full flex items-center justify-center font-semibold">
                    {waypoint.pending_suggestions_count}
                  </span>
                )}
              </button>
            ) : onSuggestEdit ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={onSuggestEdit}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Suggest an edit
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

