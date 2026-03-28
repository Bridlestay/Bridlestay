"use client";

import { X, Star, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertyQuickCardProps {
  property: any;
  onClose: () => void;
  onClick: () => void;
  className?: string;
}

export function PropertyQuickCard({
  property,
  onClose,
  onClick,
  className,
}: PropertyQuickCardProps) {
  if (!property) return null;

  const priceDisplay = property.nightly_price_pennies
    ? `£${(property.nightly_price_pennies / 100).toFixed(0)}/night`
    : null;

  const hasRating = property.average_rating && property.average_rating > 0;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md",
        "md:bottom-6 md:max-w-lg",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        className
      )}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-2xl transition-shadow duration-200"
        onClick={onClick}
      >
        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-0 right-0 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-bl-xl rounded-tr-2xl flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-gray-500" />
        </button>

        <div className="flex items-center gap-3 p-3">
          {/* Thumbnail */}
          <div className="flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden bg-gray-100">
            {property.mainPhoto ? (
              <img
                src={property.mainPhoto}
                alt={property.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Home className="h-6 w-6 text-gray-300" />
              </div>
            )}
          </div>

          {/* Property Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 truncate leading-tight">
              {property.name || "Unnamed Property"}
            </h3>

            {(property.city || property.county) && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {property.city}
                {property.city && property.county ? ", " : ""}
                {property.county}
              </p>
            )}

            <div className="flex items-center gap-3 mt-1.5">
              {priceDisplay && (
                <span className="text-sm font-semibold text-[#2E8B57]">
                  {priceDisplay}
                </span>
              )}
              {hasRating && (
                <span className="text-xs text-gray-600 flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {property.average_rating.toFixed(1)}
                  {property.review_count > 0 && (
                    <span className="text-gray-400">
                      ({property.review_count})
                    </span>
                  )}
                </span>
              )}
              {property.max_horses > 0 && (
                <span className="text-xs text-gray-600">
                  Up to {property.max_horses} horse
                  {property.max_horses > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="bg-green-50 px-3 py-1.5 border-t border-green-100 flex items-center justify-center">
          <p className="text-[11px] text-green-700 text-center font-medium">
            <span className="md:hidden">Tap for full details</span>
            <span className="hidden md:inline">Click for full details</span>
          </p>
        </div>
      </div>
    </div>
  );
}
