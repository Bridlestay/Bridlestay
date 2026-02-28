"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface PhotoLightboxProps {
  open: boolean;
  photos: any[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function PhotoLightbox({
  open,
  photos,
  currentIndex,
  onClose,
  onIndexChange,
}: PhotoLightboxProps) {
  if (!open || photos.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors z-10"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Photo counter */}
      <div className="absolute top-4 left-4 text-white/80 text-sm font-medium">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Main photo */}
      <div
        className="relative w-full h-full max-w-4xl max-h-[85vh] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={photos[currentIndex]?.url}
          alt={photos[currentIndex]?.caption || "Photo"}
          fill
          className="object-contain"
          sizes="100vw"
          priority
        />
      </div>

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(currentIndex > 0 ? currentIndex - 1 : photos.length - 1);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(currentIndex < photos.length - 1 ? currentIndex + 1 : 0);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        </>
      )}

      {/* Caption */}
      {photos[currentIndex]?.caption && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/90 text-sm bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full max-w-md text-center">
          {photos[currentIndex].caption}
        </div>
      )}
    </div>
  );
}
