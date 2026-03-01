"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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

      {/* Photo metadata */}
      {(photos[currentIndex]?.user_name || photos[currentIndex]?.caption) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 max-w-md">
          {/* Uploaded by */}
          {photos[currentIndex]?.user_name && (
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Avatar className="h-5 w-5">
                <AvatarImage src={photos[currentIndex]?.user_avatar || undefined} />
                <AvatarFallback className="text-[8px] bg-slate-600 text-white">
                  {photos[currentIndex].user_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-white/90 text-xs font-medium">
                {photos[currentIndex].user_name}
              </span>
              {photos[currentIndex]?.source === "community" && (
                <Badge className="bg-blue-600 text-white text-[9px] h-4 px-1.5 ml-0.5">
                  Community
                </Badge>
              )}
            </div>
          )}

          {/* Caption */}
          {photos[currentIndex]?.caption && (
            <div className="text-white/90 text-sm bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-center">
              {photos[currentIndex].caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
