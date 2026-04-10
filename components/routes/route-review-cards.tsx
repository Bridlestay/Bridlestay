"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { REVIEW_TAGS } from "./route-detail-constants";
import { PhotoLightbox } from "./route-photo-lightbox";

interface RouteReviewCardsProps {
  routeCompletions: any[];
  showAllReviews: boolean;
  onShowAllReviews: (show: boolean) => void;
}

export function RouteReviewCards({
  routeCompletions,
  showAllReviews,
  onShowAllReviews,
}: RouteReviewCardsProps) {
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [reviewLightboxOpen, setReviewLightboxOpen] = useState(false);
  const [reviewLightboxPhotos, setReviewLightboxPhotos] = useState<any[]>([]);
  const [reviewLightboxIndex, setReviewLightboxIndex] = useState(0);

  if (routeCompletions.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            Rider Reviews
          </h3>
          <span className="text-xs text-muted-foreground">
            {routeCompletions.length} {routeCompletions.length === 1 ? "review" : "reviews"}
          </span>
        </div>
        <div className="space-y-2">
          {(showAllReviews ? routeCompletions : routeCompletions.slice(0, 5)).map((completion: any) => {
            const reviewPhotos = completion.photos || [];
            const shortText = completion.short_note || completion.review_body || "";
            const longText = completion.long_note || "";
            const isExpanded = expandedReviews.has(completion.id);
            const hasMore = shortText.length > 120 || longText.length > 0 || reviewPhotos.length > 0 || (completion.tags?.length || 0) > 0;

            return (
              <div
                key={completion.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Compact view — always visible */}
                <div
                  className={cn(
                    "p-3 cursor-pointer hover:bg-gray-50/50 transition-colors",
                    isExpanded && "border-b border-gray-100"
                  )}
                  onClick={() => {
                    if (!hasMore) return;
                    setExpandedReviews((prev) => {
                      const next = new Set(prev);
                      if (next.has(completion.id)) {
                        next.delete(completion.id);
                      } else {
                        next.add(completion.id);
                      }
                      return next;
                    });
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Link
                      href={`/profile/${completion.user?.id || completion.user_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 mt-0.5"
                    >
                      <Avatar className="h-8 w-8 hover:ring-2 hover:ring-green-300 transition-all">
                        <AvatarImage src={completion.user?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-green-50 text-green-700 font-semibold">
                          {completion.user?.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <Link
                          href={`/profile/${completion.user?.id || completion.user_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-semibold text-gray-900 hover:text-green-700 transition-colors"
                        >
                          {completion.user?.name || "Rider"}
                        </Link>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(completion.completed_at), { addSuffix: true })}
                        </span>
                      </div>
                      {shortText && !isExpanded && (
                        <p className="text-sm text-gray-600 leading-snug line-clamp-2">
                          {shortText}
                        </p>
                      )}
                      {/* Photo teaser — half-height strip */}
                      {!isExpanded && reviewPhotos.length > 0 && (
                        <div className="mt-2 flex gap-1.5">
                          {reviewPhotos.slice(0, 3).map((photo: any) => (
                            <div key={photo.id} className="relative h-12 w-16 rounded overflow-hidden flex-shrink-0">
                              <Image src={photo.url} alt="" fill className="object-cover" />
                            </div>
                          ))}
                          {reviewPhotos.length > 3 && (
                            <div className="h-12 w-16 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-gray-500">+{reviewPhotos.length - 3}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Tag count hint when collapsed */}
                      {!isExpanded && (completion.tags?.length || 0) > 0 && !shortText && (
                        <p className="text-xs text-gray-400 mt-1">{completion.tags.length} tag{completion.tags.length !== 1 ? "s" : ""}</p>
                      )}
                      {hasMore && !isExpanded && (
                        <span className="text-xs font-medium text-primary mt-1 inline-block">
                          Tap to read more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded detail — animated with grid row transition */}
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                  style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className={cn(
                      "p-3 pt-2 space-y-3 bg-gray-50/30 transition-opacity duration-300",
                      isExpanded ? "opacity-100" : "opacity-0"
                    )}>
                    {/* Short review text */}
                    {shortText && (
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {shortText}
                      </p>
                    )}
                    {/* Extended notes (from step 5 long note) */}
                    {longText && (
                      <div className="border-l-2 border-green-200 pl-3">
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                          {longText}
                        </p>
                      </div>
                    )}

                    {/* Tags */}
                    {completion.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {completion.tags.map((tagId: string) => {
                          const tag = REVIEW_TAGS.find((t) => t.id === tagId);
                          return tag ? (
                            <span
                              key={tagId}
                              className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full"
                            >
                              {tag.emoji} {tag.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}

                    {/* Photos grid */}
                    {reviewPhotos.length > 0 && (
                      <div className={cn(
                        "grid gap-1.5",
                        reviewPhotos.length === 1 ? "grid-cols-1" : reviewPhotos.length === 2 ? "grid-cols-2" : "grid-cols-3"
                      )}>
                        {reviewPhotos.slice(0, 6).map((photo: any, idx: number) => (
                          <div
                            key={photo.id}
                            className={cn(
                              "relative overflow-hidden rounded-lg cursor-pointer group",
                              reviewPhotos.length === 1 ? "aspect-video" : "aspect-square"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewLightboxPhotos(reviewPhotos);
                              setReviewLightboxIndex(idx);
                              setReviewLightboxOpen(true);
                            }}
                          >
                            <Image
                              src={photo.url}
                              alt={photo.caption || "Review photo"}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {photo.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                                <span className="text-[10px] text-white line-clamp-1">{photo.caption}</span>
                              </div>
                            )}
                          </div>
                        ))}
                        {reviewPhotos.length > 6 && (
                          <div
                            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewLightboxPhotos(reviewPhotos);
                              setReviewLightboxIndex(6);
                              setReviewLightboxOpen(true);
                            }}
                          >
                            <span className="text-sm font-medium text-gray-600">+{reviewPhotos.length - 6}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Collapse button */}
                    <button
                      onClick={() => {
                        setExpandedReviews((prev) => {
                          const next = new Set(prev);
                          next.delete(completion.id);
                          return next;
                        });
                      }}
                      className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Show less
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {routeCompletions.length > 5 && !showAllReviews && (
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-full text-sm text-gray-600 hover:bg-gray-50"
            onClick={() => onShowAllReviews(true)}
          >
            Show all {routeCompletions.length} reviews
          </Button>
        )}
      </div>

      {/* Review photo lightbox */}
      <PhotoLightbox
        open={reviewLightboxOpen}
        photos={reviewLightboxPhotos}
        currentIndex={reviewLightboxIndex}
        onClose={() => setReviewLightboxOpen(false)}
        onIndexChange={setReviewLightboxIndex}
      />
    </>
  );
}
