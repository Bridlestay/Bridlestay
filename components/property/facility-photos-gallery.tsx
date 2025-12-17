"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, Expand } from "lucide-react";

interface FacilityPhoto {
  url: string;
  category: string;
  order?: number;
}

interface FacilityPhotosGalleryProps {
  photos: FacilityPhoto[];
}

const CATEGORY_LABELS: Record<string, { name: string; icon: string }> = {
  stables: { name: "Stables", icon: "🏠" },
  paddock: { name: "Paddock / Turnout", icon: "🌿" },
  arena: { name: "Arena", icon: "🏟️" },
  tack_room: { name: "Tack Room", icon: "🎠" },
  wash_bay: { name: "Wash Bay", icon: "🚿" },
  parking: { name: "Parking", icon: "🚛" },
};

export function FacilityPhotosGallery({ photos }: FacilityPhotosGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!photos || photos.length === 0) return null;

  // Group photos by category
  const photosByCategory = photos.reduce((acc, photo) => {
    const category = photo.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(photo);
    return acc;
  }, {} as Record<string, FacilityPhoto[]>);

  const categories = Object.keys(photosByCategory);

  // Get filtered photos based on selected category
  const displayPhotos = selectedCategory 
    ? photosByCategory[selectedCategory] || []
    : photos;

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % displayPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + displayPhotos.length) % displayPhotos.length);
  };

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All ({photos.length})
        </Button>
        {categories.map((category) => {
          const info = CATEGORY_LABELS[category] || { name: category, icon: "📷" };
          const count = photosByCategory[category].length;
          return (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {info.icon} {info.name} ({count})
            </Button>
          );
        })}
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {displayPhotos.map((photo, index) => {
          const categoryInfo = CATEGORY_LABELS[photo.category] || { name: photo.category, icon: "📷" };
          return (
            <div
              key={`${photo.category}-${index}`}
              className="relative group aspect-square cursor-pointer"
              onClick={() => openLightbox(index)}
            >
              <Image
                src={photo.url}
                alt={`${categoryInfo.name} ${index + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-lg flex items-center justify-center">
                <Expand className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* Category Badge */}
              {selectedCategory === null && (
                <Badge 
                  className="absolute top-2 left-2 bg-black/60 text-white text-xs"
                >
                  {categoryInfo.icon} {categoryInfo.name}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          <div className="relative h-[80vh]">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Main Image */}
            <div className="relative w-full h-full flex items-center justify-center p-8">
              <Image
                src={displayPhotos[currentIndex]?.url || ""}
                alt={`Facility photo ${currentIndex + 1}`}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>

            {/* Navigation */}
            {displayPhotos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={prevPhoto}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={nextPhoto}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Caption */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full">
              {CATEGORY_LABELS[displayPhotos[currentIndex]?.category]?.icon || "📷"}{" "}
              {CATEGORY_LABELS[displayPhotos[currentIndex]?.category]?.name || displayPhotos[currentIndex]?.category}{" "}
              • {currentIndex + 1} of {displayPhotos.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

