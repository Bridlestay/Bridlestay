"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  Star,
  Users,
  ImageIcon,
} from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

export interface GalleryPhoto {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
  source: "owner" | "community";
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  is_cover?: boolean;
}

interface RoutePhotoGalleryProps {
  photos: GalleryPhoto[];
  isOwner: boolean;
  coverPhotoId: string | null;
  onBack: () => void;
  onSetCover: (photoId: string) => void;
  onOpenLightbox: (index: number) => void;
}

export function RoutePhotoGallery({
  photos,
  isOwner,
  coverPhotoId,
  onBack,
  onSetCover,
  onOpenLightbox,
}: RoutePhotoGalleryProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0"
        >
          <ChevronDown className="h-5 w-5 rotate-90" />
        </Button>
        <h2 className="font-semibold text-lg">Photos</h2>
        <Badge variant="outline" className="ml-auto">
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ImageIcon className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No photos yet</p>
            <p className="text-xs mt-1">
              Complete this route and add photos in your review
            </p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 gap-1 p-1">
            {photos.map((photo, idx) => {
              const isCover = photo.id === coverPhotoId;
              const canSetCover =
                isOwner && !isCover && photo.source === "owner";

              return (
                <div key={photo.id} className="relative group mb-1 break-inside-avoid">
                  <button
                    onClick={() => onOpenLightbox(idx)}
                    className="block w-full relative overflow-hidden bg-muted rounded-sm"
                  >
                    <Image
                      src={photo.url}
                      alt={photo.caption || "Route photo"}
                      width={600}
                      height={400}
                      className="w-full h-auto object-cover transition-all duration-200 group-hover:brightness-95"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />

                    {/* Subtle overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
                  </button>

                  {/* Set as cover button (owner only, owner photos only) */}
                  {canSetCover && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetCover(photo.id);
                      }}
                      className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1 rounded-full hover:bg-black/90 shadow-lg"
                    >
                      Set as cover
                    </button>
                  )}

                  {/* Subtle cover indicator (no badge) */}
                  {isCover && (
                    <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-green-500 shadow-md flex items-center justify-center opacity-90">
                      <Star className="h-3 w-3 text-white fill-current" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
