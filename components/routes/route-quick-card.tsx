"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Users, X, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMapboxThumbnailUrl } from "@/lib/routes/route-thumbnail";

interface RouteQuickCardProps {
  route: any;
  onClose: () => void;
  onClick: () => void;
  className?: string;
  // For browsing multiple routes (e.g., after cluster click)
  routes?: any[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

const DIFFICULTY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  easy: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  moderate: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  medium: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  difficult: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  hard: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  severe: { bg: "bg-red-200", text: "text-red-900", border: "border-red-400" },
  unrated: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
};

function SingleCard({ route, onClick }: { route: any; onClick: () => void }) {
  const [nearbyCount, setNearbyCount] = useState(0);

  useEffect(() => {
    if (!route?.id) return;
    setNearbyCount(0);
    fetch(`/api/routes/${route.id}/nearby-properties`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.properties) setNearbyCount(data.properties.length);
      })
      .catch(() => {});
  }, [route?.id]);

  if (!route) return null;

  const rideTimeMinutes = Math.round((route.distance_km || 0) / 8 * 60);
  const hours = Math.floor(rideTimeMinutes / 60);
  const mins = rideTimeMinutes % 60;
  const rideTimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const difficulty = (route.difficulty || "unrated").toLowerCase();
  const diffStyle = DIFFICULTY_STYLES[difficulty] || DIFFICULTY_STYLES.unrated;

  const thumbnailUrl = getMapboxThumbnailUrl(route.geometry, {
    width: 120,
    height: 80,
    routeColor: "166534",
    routeWeight: 4,
  });

  return (
    <div
      className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-2xl transition-shadow duration-200"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Route Thumbnail */}
        {thumbnailUrl && (
          <div className="flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={thumbnailUrl}
              alt={route.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Route Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 truncate leading-tight">
            {route.title || "Untitled Route"}
          </h3>

          {route.owner?.name && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Avatar className="h-4 w-4">
                <AvatarImage src={route.owner?.avatar_url} />
                <AvatarFallback className="text-[8px] bg-green-100 text-green-800">
                  {route.owner?.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-500 truncate">
                {route.owner.name}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-gray-600 flex items-center gap-1">
              {(route.distance_km || 0).toFixed(1)} km
            </span>
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {rideTimeStr}
            </span>
            {(route.completions_count !== undefined && route.completions_count > 0) && (
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {route.completions_count}
              </span>
            )}
            {nearbyCount > 0 && (
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Home className="h-3 w-3" />
                {nearbyCount}
              </span>
            )}
          </div>
        </div>

        {/* Difficulty Badge */}
        <div className="flex-shrink-0">
          <Badge
            variant="outline"
            className={cn(
              "text-[11px] px-2.5 py-0.5 font-semibold capitalize",
              diffStyle.bg,
              diffStyle.text,
              diffStyle.border
            )}
          >
            {difficulty === "unrated" ? "Unrated" : difficulty}
          </Badge>
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
  );
}

export function RouteQuickCard({
  route,
  onClose,
  onClick,
  className,
  routes,
  currentIndex = 0,
  onIndexChange,
}: RouteQuickCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(currentIndex);
  const allRoutes = routes && routes.length > 1 ? routes : [route];
  const isCarousel = allRoutes.length > 1;

  // Sync external index changes
  useEffect(() => {
    setActiveIdx(currentIndex);
    if (scrollRef.current && isCarousel) {
      const container = scrollRef.current;
      const cardWidth = container.firstElementChild
        ? (container.firstElementChild as HTMLElement).offsetWidth
        : 0;
      if (cardWidth > 0) {
        container.scrollTo({ left: currentIndex * cardWidth, behavior: "smooth" });
      }
    }
  }, [currentIndex, isCarousel]);

  // Handle scroll snap settling
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !isCarousel) return;
    const container = scrollRef.current;
    const cardWidth = container.firstElementChild
      ? (container.firstElementChild as HTMLElement).offsetWidth
      : 1;
    const newIdx = Math.round(container.scrollLeft / cardWidth);
    if (newIdx !== activeIdx && newIdx >= 0 && newIdx < allRoutes.length) {
      setActiveIdx(newIdx);
      onIndexChange?.(newIdx);
    }
  }, [activeIdx, allRoutes.length, isCarousel, onIndexChange]);

  // Debounced scroll end detection
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScroll = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(handleScroll, 80);
  }, [handleScroll]);

  if (!route) return null;

  // Single route: simple centered card (same on mobile and desktop)
  if (!isCarousel) {
    return (
      <div
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md",
          "md:bottom-6 md:max-w-lg",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
          className
        )}
      >
        <div className="relative">
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
          <SingleCard route={route} onClick={onClick} />
        </div>
      </div>
    );
  }

  // Multi-route: swipeable peek carousel on mobile, same centered on desktop
  return (
    <div
      className={cn(
        "fixed bottom-4 left-0 right-0 z-40",
        "md:left-1/2 md:-translate-x-1/2 md:w-[92%] md:max-w-lg md:right-auto",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        className
      )}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-0 right-4 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors md:right-0 md:rounded-bl-xl md:rounded-tr-2xl md:rounded-tl-none md:rounded-br-none md:shadow-none"
      >
        <X className="h-3.5 w-3.5 text-gray-500" />
      </button>

      {/* Scrollable carousel */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hidden px-[8%] md:px-0 md:overflow-visible md:gap-0"
        style={{ scrollPaddingLeft: "8%", scrollPaddingRight: "8%" }}
      >
        {allRoutes.map((r, idx) => (
          <div
            key={r.id || idx}
            className={cn(
              "flex-shrink-0 snap-center",
              // Mobile: 85% width so adjacent cards peek
              "w-[85%]",
              // Desktop: full width, hide non-active
              "md:w-full",
              idx !== activeIdx && "md:hidden"
            )}
          >
            <SingleCard
              route={r}
              onClick={() => {
                if (idx !== activeIdx) {
                  setActiveIdx(idx);
                  onIndexChange?.(idx);
                } else {
                  onClick();
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {allRoutes.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {allRoutes.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveIdx(idx);
                onIndexChange?.(idx);
                if (scrollRef.current) {
                  const cardWidth = scrollRef.current.firstElementChild
                    ? (scrollRef.current.firstElementChild as HTMLElement).offsetWidth
                    : 0;
                  scrollRef.current.scrollTo({ left: idx * cardWidth, behavior: "smooth" });
                }
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === activeIdx
                  ? "bg-green-600 w-4"
                  : "bg-gray-300 w-1.5"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
