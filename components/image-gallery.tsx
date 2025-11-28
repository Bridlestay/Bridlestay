"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageGalleryProps {
  images: { url: string }[];
  propertyName: string;
}

export function ImageGallery({ images, propertyName }: ImageGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openGallery = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeGallery = () => {
    setIsOpen(false);
    document.body.style.overflow = "unset";
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
    if (e.key === "Escape") closeGallery();
  };

  if (images.length === 0) {
    return (
      <div className="col-span-2 h-96 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">No photos available</p>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Main Image */}
        <div
          className="relative h-96 md:col-span-2 lg:col-span-1 rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => openGallery(0)}
        >
          <Image
            src={images[0].url}
            alt={propertyName}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>

        {/* Grid of smaller images */}
        <div className="grid grid-cols-2 gap-4">
          {images.slice(1, 5).map((photo, idx) => (
            <div
              key={idx}
              className="relative h-44 rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => openGallery(idx + 1)}
            >
              <Image
                src={photo.url}
                alt={`${propertyName} - ${idx + 2}`}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
          ))}
        </div>

        {/* Show all photos button */}
        {images.length > 5 && (
          <div className="col-span-2 flex justify-center">
            <Button
              variant="outline"
              onClick={() => openGallery(0)}
              className="mt-4"
            >
              View all {images.length} photos
            </Button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close button */}
          <button
            onClick={closeGallery}
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/10 p-2 rounded-full transition-colors"
            aria-label="Close gallery"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 text-white bg-black/50 px-4 py-2 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Previous button */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 z-50 text-white hover:bg-white/10 p-3 rounded-full transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>

          {/* Next button */}
          <button
            onClick={goToNext}
            className="absolute right-4 z-50 text-white hover:bg-white/10 p-3 rounded-full transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          {/* Current image */}
          <div className="relative w-full h-full max-w-7xl max-h-[90vh] mx-4">
            <Image
              src={images[currentIndex].url}
              alt={`${propertyName} - ${currentIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          {/* Thumbnail strip at bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 overflow-x-auto max-w-[90vw] p-2">
            {images.map((image, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                  idx === currentIndex
                    ? "ring-2 ring-white scale-110"
                    : "opacity-50 hover:opacity-100"
                }`}
              >
                <Image
                  src={image.url}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}



