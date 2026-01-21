"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, MapPin, Ruler, TrendingUp, Clock, AlertCircle, Lock, Link2, Globe } from "lucide-react";
import Image from "next/image";

interface RouteCardProps {
  route: any;
  onClick?: () => void;
  showVisibility?: boolean; // Show visibility status (for My Routes)
}

export function RouteCard({ route, onClick, showVisibility = false }: RouteCardProps) {
  // Use cover_photo_url if available, otherwise fall back to first photo
  const coverPhoto = route.cover_photo_url || route.route_photos?.[0]?.url;

  // Map all difficulty values to colors and labels
  const difficultyConfig: Record<string, { color: string; label: string }> = {
    unrated: { color: "bg-gray-100 text-gray-800 border-gray-300", label: "Unrated" },
    easy: { color: "bg-green-100 text-green-800 border-green-300", label: "Easy" },
    moderate: { color: "bg-amber-100 text-amber-800 border-amber-300", label: "Moderate" },
    medium: { color: "bg-amber-100 text-amber-800 border-amber-300", label: "Medium" },
    difficult: { color: "bg-orange-100 text-orange-800 border-orange-300", label: "Difficult" },
    hard: { color: "bg-red-100 text-red-800 border-red-300", label: "Hard" },
    severe: { color: "bg-red-200 text-red-900 border-red-400", label: "Severe" },
  };
  
  const getDifficultyInfo = (difficulty: string | undefined) => {
    if (!difficulty) return difficultyConfig.moderate;
    return difficultyConfig[difficulty.toLowerCase()] || difficultyConfig.moderate;
  };

  const conditionColors = {
    excellent: "bg-green-500/90",
    good: "bg-blue-500/90",
    fair: "bg-yellow-500/90",
    poor: "bg-orange-500/90",
    closed: "bg-red-500/90",
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-48 bg-muted">
        {coverPhoto ? (
          <Image
            src={coverPhoto}
            alt={route.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <MapPin className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Visibility badge for My Routes - positioned on left to not overlap delete button */}
        {showVisibility && (
          <div className="absolute top-3 left-3">
            <Badge 
              className={`shadow-lg ${
                route.visibility === 'public' 
                  ? 'bg-green-600 text-white' 
                  : route.visibility === 'link' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-600 text-white'
              }`}
            >
              {route.visibility === 'public' && <Globe className="h-3 w-3 mr-1" />}
              {route.visibility === 'link' && <Link2 className="h-3 w-3 mr-1" />}
              {route.visibility === 'private' && <Lock className="h-3 w-3 mr-1" />}
              {route.visibility === 'public' ? 'Public' : route.visibility === 'link' ? 'Link Only' : 'Private'}
            </Badge>
          </div>
        )}
        
        {/* Other badges overlay - right side */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {route.featured && (
            <Badge className="bg-amber-500 text-white shadow-lg">
              ⭐ Featured
            </Badge>
          )}
          {route.condition && route.condition !== 'good' && (
            <Badge className={`${conditionColors[route.condition as keyof typeof conditionColors] || 'bg-gray-500/90'} text-white shadow-lg capitalize`}>
              {route.condition === 'closed' && <AlertCircle className="h-3 w-3 mr-1" />}
              {route.condition}
            </Badge>
          )}
        </div>
        
        {/* Distance in bottom left */}
        {route.distance_km && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="secondary" className="bg-white/90 text-foreground shadow-md gap-1">
              <Ruler className="h-3 w-3" />
              {route.distance_km.toFixed(1)} km
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{route.title}</h3>
          {route.avg_rating > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{route.avg_rating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({route.review_count})
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {route.description || "No description available"}
        </p>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge
            variant="outline"
            className={getDifficultyInfo(route.difficulty).color}
          >
            {getDifficultyInfo(route.difficulty).label}
          </Badge>

          {route.distance_km && (
            <>
              <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300">
                <Clock className="h-3 w-3" />
                🐴 {Math.floor((route.distance_km / 12) * 60)}m
              </Badge>
              <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                <Clock className="h-3 w-3" />
                🚶 {Math.floor((route.distance_km / 5) * 60)}m
              </Badge>
            </>
          )}

          {route.county && (
            <Badge variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" />
              {route.county}
            </Badge>
          )}
          
          {route.elevation_gain_m && route.elevation_gain_m > 0 && (
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {route.elevation_gain_m}m
            </Badge>
          )}
        </div>

        {/* Terrain tags */}
        {route.terrain_tags && route.terrain_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {route.terrain_tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {route.terrain_tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{route.terrain_tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Owner info */}
        {route.owner && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Created by {route.owner.name}</span>
            {route.owner.admin_verified && (
              <Badge variant="outline" className="text-xs">
                Verified
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}


