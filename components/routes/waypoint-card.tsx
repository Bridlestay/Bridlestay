"use client";

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
  Image as LucideImage,
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

export function WaypointCard({
  waypoint,
  waypointNumber,
  distanceFromPrevious,
  onShowOnMap,
  onEdit,
  onSuggestEdit,
  isOwner,
}: WaypointCardProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const iconConfig = waypoint.icon_type
    ? ICON_MAP[waypoint.icon_type] || ICON_MAP.other
    : null;
  const Icon = iconConfig?.icon;
  const tagConfig = waypoint.tag ? TAG_CONFIG[waypoint.tag] : null;

  const displayName = waypoint.name || "Waypoint";

  // Combine primary photo with community photos
  const allPhotos = [
    ...(waypoint.photo_url
      ? [{ id: "primary", url: waypoint.photo_url, caption: null }]
      : []),
    ...(waypoint.photos || []),
  ];

  const getNumberCircleColor = () => {
    if (waypointNumber === "S") return "bg-green-600 text-white";
    if (waypointNumber === "F") return "bg-red-600 text-white";
    return "bg-slate-800 text-white";
  };

  return (
    <div className="relative mb-6">
      {/* Number circle — overlays the timeline dotted line */}
      <div
        className={`absolute left-[-40px] top-2 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm ${getNumberCircleColor()}`}
      >
        {waypointNumber || waypoint.order_index + 1}
      </div>

      {/* Photo Collage */}
      {allPhotos.length === 1 && (
        <div className="relative w-full h-36 rounded-lg overflow-hidden mb-2">
          <Image
            src={allPhotos[0].url}
            alt={displayName}
            fill
            className="object-cover"
          />
        </div>
      )}
      {allPhotos.length === 2 && (
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden h-32 mb-2">
          {allPhotos.map((photo, idx) => (
            <div key={photo.id || idx} className="relative">
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
      {allPhotos.length >= 3 && (
        <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden h-40 mb-2">
          {/* Large image — left 2/3 */}
          <div className="col-span-2 relative">
            <Image
              src={allPhotos[0].url}
              alt={displayName}
              fill
              className="object-cover"
            />
          </div>
          {/* Two stacked images — right 1/3 */}
          <div className="flex flex-col gap-1">
            <div className="relative flex-1">
              <Image
                src={allPhotos[1].url}
                alt={allPhotos[1].caption || displayName}
                fill
                className="object-cover"
              />
            </div>
            <div className="relative flex-1">
              <Image
                src={allPhotos[2].url}
                alt={allPhotos[2].caption || displayName}
                fill
                className="object-cover"
              />
              {allPhotos.length > 3 && (
                <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <LucideImage className="h-2.5 w-2.5" />
                  {allPhotos.length} images
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Name */}
      <h4 className="font-bold text-base text-slate-900 leading-snug">
        {displayName}
      </h4>

      {/* Icon + Tag inline (Komoot style: "🏛 Historic Site · Instruction") */}
      {(iconConfig || tagConfig) && (
        <div className="flex items-center gap-1.5 mt-0.5">
          {iconConfig && Icon && (
            <>
              <Icon className={`h-3.5 w-3.5 ${iconConfig.color}`} />
              <span className="text-xs font-medium text-slate-600">
                {iconConfig.label}
              </span>
            </>
          )}
          {iconConfig && tagConfig && (
            <span className="text-xs text-slate-300">·</span>
          )}
          {tagConfig && (
            <span className="text-xs font-medium text-slate-600">
              {tagConfig.label}
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {waypoint.description && (
        <div className="mt-1.5">
          <p
            className={`text-sm text-slate-600 leading-relaxed ${
              !showFullDescription ? "line-clamp-2" : ""
            }`}
          >
            {waypoint.description}
          </p>
          {waypoint.description.length > 120 && !showFullDescription && (
            <button
              onClick={() => setShowFullDescription(true)}
              className="text-sm font-medium text-slate-900 hover:underline mt-0.5"
            >
              Read more
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-2">
        {onShowOnMap && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50 h-7 px-2"
            onClick={onShowOnMap}
          >
            <MapPin className="h-3.5 w-3.5 mr-1" />
            Show on map
          </Button>
        )}

        {isOwner && onEdit ? (
          <button
            onClick={onEdit}
            className="relative text-slate-400 hover:text-slate-700 transition-colors p-1"
            title="Edit waypoint"
          >
            <Pencil className="h-3.5 w-3.5" />
            {waypoint.pending_suggestions_count &&
              waypoint.pending_suggestions_count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white text-[9px] rounded-full flex items-center justify-center font-semibold">
                  {waypoint.pending_suggestions_count}
                </span>
              )}
          </button>
        ) : onSuggestEdit ? (
          <button
            onClick={onSuggestEdit}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1"
            title="Suggest an edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
