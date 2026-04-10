"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, X, AlertTriangle, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { validateRoutePhotoUpload } from "@/lib/file-validation";
import { REVIEW_TAGS, PHOTO_CATEGORIES, WARNING_TYPES } from "./route-detail-constants";

interface RouteReviewFlowProps {
  routeId: string;
  route: any;
  userId?: string;
  routeCompletions: any[];
  activeWarnings: any[];
  userHasCompletion: boolean;
  onComplete: () => void;
  onCompletionsRefresh: () => void;
  onVoteClearWarning: (warningId: string) => Promise<void>;
}

export function RouteReviewFlow({
  routeId,
  route,
  userId,
  routeCompletions,
  activeWarnings,
  userHasCompletion,
  onComplete,
  onCompletionsRefresh,
  onVoteClearWarning,
}: RouteReviewFlowProps) {
  const [reviewStep, setReviewStep] = useState(1);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewPhotoCategory, setReviewPhotoCategory] = useState<string | null>(null);
  const [reviewPhotoFile, setReviewPhotoFile] = useState<File | null>(null);
  const [reviewPhotoPreview, setReviewPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [maxVisitedStep, setMaxVisitedStep] = useState(
    userHasCompletion ? 4 : 0
  );
  const [warningCheckDone, setWarningCheckDone] = useState(false);
  const [warningVotes, setWarningVotes] = useState<Record<string, boolean>>({});

  const photoInputRef = useRef<HTMLInputElement>(null);

  // Pre-populate if editing existing review
  useState(() => {
    if (userHasCompletion) {
      const existing = routeCompletions.find((c: any) => c.user?.id === userId);
      if (existing) {
        setReviewRating(existing.rating || 0);
        setReviewTags(existing.tags || []);
      }
    }
  });

  const resetReviewState = () => {
    onComplete();
  };

  const toggleReviewTag = (tagId: string) => {
    setReviewTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateRoutePhotoUpload(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file");
      return;
    }
    setReviewPhotoFile(file);
    setReviewPhotoPreview(URL.createObjectURL(file));
  };

  const handleUploadReviewPhoto = async () => {
    if (!reviewPhotoFile || !routeId || !reviewPhotoCategory) return;
    setUploadingPhoto(true);
    try {
      const category = PHOTO_CATEGORIES.find((c) => c.id === reviewPhotoCategory);
      const formData = new FormData();
      formData.append("file", reviewPhotoFile);
      formData.append("caption", category ? `${category.emoji} ${category.label}` : "");
      formData.append("source", "review");
      const res = await fetch(`/api/routes/${routeId}/photos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      toast.success("Photo uploaded!");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmitRideReview = async () => {
    if (!userId || !routeId) return;
    setSubmittingReview(true);
    try {
      const completeRes = await fetch(`/api/routes/${routeId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: JSON.stringify({ tags: reviewTags }),
          rating: reviewRating,
        }),
      });
      if (!completeRes.ok) {
        const err = await completeRes.json().catch(() => ({}));
        console.error("[REVIEW] /complete failed:", completeRes.status, err);
      }

      const reviewRes = await fetch(`/api/routes/${routeId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          difficulty: route?.difficulty || "moderate",
        }),
      });
      if (!reviewRes.ok) {
        const err = await reviewRes.json().catch(() => ({}));
        console.error("[REVIEW] /review failed:", reviewRes.status, err);
      }

      setReviewStep(4);
      setMaxVisitedStep(4);
      onCompletionsRefresh();
      toast.success("Review submitted! Thank you 🐴");
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">
            {reviewStep === 4 ? "Complete!" : `Step ${reviewStep} of 3`}
          </span>
          <button
            onClick={resetReviewState}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
        {/* Clickable step dots */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((step) => {
            const isActive = reviewStep === step;
            const isCompleted = reviewStep > step || reviewStep === 4;
            const isClickable = step <= maxVisitedStep && reviewStep !== 4;
            return (
              <button
                key={step}
                disabled={!isClickable}
                onClick={() => { if (isClickable) setReviewStep(step); }}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                  isActive
                    ? "bg-primary text-white ring-2 ring-green-200"
                    : isCompleted
                    ? "bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
                    : isClickable
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                )}
              >
                {isCompleted && !isActive ? "✓" : step}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 1: Overall Feel - Star Rating */}
      {reviewStep === 1 && (
        <div className="text-center space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">How did this route ride overall?</h2>
            <p className="text-sm text-gray-500 mt-1">Your honest rating helps us improve</p>
          </div>

          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setReviewRating(n)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-10 w-10 transition-colors",
                    n <= reviewRating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                  )}
                />
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 italic">
            This rating is collected for internal improvement only and won&apos;t be shown publicly
          </p>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 rounded-full" onClick={resetReviewState}>
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-full bg-primary hover:bg-green-700"
              onClick={() => { setReviewStep(2); setMaxVisitedStep((p) => Math.max(p, 2)); }}
              disabled={reviewRating === 0}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Add a Moment (Optional Photo) */}
      {reviewStep === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Share a moment from your ride</h2>
            <p className="text-sm text-gray-500 mt-1">Add a photo to help others know what to expect (optional)</p>
          </div>

          {/* Show existing photos when editing */}
          {(() => {
            const existingPhotos = userHasCompletion
              ? (routeCompletions.find((c: any) => c.user?.id === userId)?.photos || [])
              : [];
            if (existingPhotos.length === 0) return null;
            return (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Your photos ({existingPhotos.length})</p>
                <div className="flex gap-2 flex-wrap">
                  {existingPhotos.map((photo: any) => (
                    <div key={photo.id} className="relative h-16 w-20 rounded-lg overflow-hidden border border-gray-200 group">
                      <Image src={photo.url} alt={photo.caption || ""} fill className="object-cover" />
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await fetch(`/api/routes/${routeId}/photos?photoId=${photo.id}`, {
                              method: "DELETE",
                            });
                            if (res.ok) {
                              toast.success("Photo removed");
                              onCompletionsRefresh();
                            } else {
                              const err = await res.json().catch(() => ({}));
                              console.error("[PHOTO_DELETE] Failed:", res.status, err);
                              toast.error(err.error || "Failed to remove photo");
                            }
                          } catch {
                            toast.error("Failed to remove photo");
                          }
                        }}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center transition-colors"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="flex gap-2 flex-wrap">
            {PHOTO_CATEGORIES.map((cat) => (
              <Badge
                key={cat.id}
                variant={reviewPhotoCategory === cat.id ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors px-3 py-1",
                  reviewPhotoCategory === cat.id
                    ? "bg-primary hover:bg-green-700 text-white"
                    : "hover:bg-green-50"
                )}
                onClick={() => setReviewPhotoCategory(cat.id)}
              >
                {cat.emoji} {cat.label}
              </Badge>
            ))}
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />

          {reviewPhotoPreview ? (
            <div className="relative rounded-xl overflow-hidden">
              <div className="relative h-48">
                <Image
                  src={reviewPhotoPreview}
                  alt="Photo preview"
                  fill
                  className="object-cover"
                />
              </div>
              {reviewPhotoCategory && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-black/60 text-white text-xs backdrop-blur-sm">
                    {PHOTO_CATEGORIES.find((c) => c.id === reviewPhotoCategory)?.emoji}{" "}
                    {PHOTO_CATEGORIES.find((c) => c.id === reviewPhotoCategory)?.label}
                  </Badge>
                </div>
              )}
              <button
                onClick={() => {
                  setReviewPhotoFile(null);
                  setReviewPhotoPreview(null);
                  if (photoInputRef.current) photoInputRef.current.value = "";
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                reviewPhotoCategory
                  ? "border-green-300 hover:border-green-400 bg-green-50/30"
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => {
                if (!reviewPhotoCategory) {
                  toast.error("Select a category first");
                  return;
                }
                photoInputRef.current?.click();
              }}
            >
              <ImageIcon className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                {reviewPhotoCategory ? "Tap to add a photo" : "Select a category above, then tap here"}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setReviewStep(1)}>
              Back
            </Button>
            {reviewPhotoFile && reviewPhotoCategory ? (
              <Button
                className="flex-1 rounded-full bg-primary hover:bg-green-700"
                onClick={async () => {
                  await handleUploadReviewPhoto();
                  await onCompletionsRefresh();
                  setReviewStep(3);
                  setMaxVisitedStep((p) => Math.max(p, 3));
                }}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? "Uploading..." : "Upload & Next"}
              </Button>
            ) : (
              <Button className="flex-1 rounded-full bg-primary hover:bg-green-700" onClick={() => { setReviewStep(3); setMaxVisitedStep((p) => Math.max(p, 3)); }}>
                {reviewPhotoFile ? "Next" : "Skip / Next"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Things Worth Knowing (Checkboxes) + Submit */}
      {reviewStep === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Things worth knowing</h2>
            <p className="text-sm text-gray-500 mt-1">Help others by sharing what you noticed — tick all that apply</p>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {REVIEW_TAGS.map((tag) => (
              <label
                key={tag.id}
                className={cn(
                  "flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors",
                  reviewTags.includes(tag.id)
                    ? "bg-green-50 border-green-300"
                    : "hover:bg-gray-50 border-gray-200"
                )}
              >
                <Checkbox
                  checked={reviewTags.includes(tag.id)}
                  onCheckedChange={() => toggleReviewTag(tag.id)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-lg">{tag.emoji}</span>
                <span className="text-sm font-medium text-gray-700">{tag.label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setReviewStep(2)}>
              Back
            </Button>
            <Button
              className="flex-1 rounded-full bg-primary hover:bg-green-700"
              onClick={handleSubmitRideReview}
              disabled={submittingReview}
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Warning Check (if active warnings) + Thank You */}
      {reviewStep === 4 && (
        <div className="space-y-5">
          {activeWarnings.length > 0 && !warningCheckDone ? (
            <>
              <div className="text-center py-2">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <h2 className="text-lg font-bold text-gray-900">Active Warnings</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Help other riders by confirming current conditions
                </p>
              </div>

              <div className="space-y-3">
                {activeWarnings.map((warning: any) => (
                  <div key={warning.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span className="font-medium text-sm text-amber-900">
                        {WARNING_TYPES.find((t) => t.value === warning.hazard_type)?.label || warning.hazard_type}
                      </span>
                    </div>
                    {warning.description && (
                      <p className="text-xs text-amber-700 mb-2">{warning.description}</p>
                    )}
                    <p className="text-xs text-gray-600 mb-2">Is this still an issue?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`flex-1 h-8 text-xs ${warningVotes[warning.id] === true ? "bg-red-50 border-red-300 text-red-700" : ""}`}
                        onClick={() => setWarningVotes((prev) => ({ ...prev, [warning.id]: true }))}
                      >
                        Yes, still an issue
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`flex-1 h-8 text-xs ${warningVotes[warning.id] === false ? "bg-green-50 border-green-300 text-green-700" : ""}`}
                        onClick={() => setWarningVotes((prev) => ({ ...prev, [warning.id]: false }))}
                      >
                        No, it&apos;s cleared
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setWarningCheckDone(true)}
                >
                  Skip
                </Button>
                <Button
                  className="flex-1 rounded-full bg-amber-600 hover:bg-amber-700"
                  onClick={async () => {
                    const clearVotes = Object.entries(warningVotes)
                      .filter(([, stillIssue]) => !stillIssue)
                      .map(([id]) => id);
                    for (const warningId of clearVotes) {
                      await onVoteClearWarning(warningId);
                    }
                    setWarningCheckDone(true);
                  }}
                >
                  Submit
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-4">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-xl font-bold text-gray-900">Thank you for your review!</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Your insights help the riding community explore with confidence
                </p>
              </div>

              {reviewTags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {reviewTags.map((tagId) => {
                    const tag = REVIEW_TAGS.find((t) => t.id === tagId);
                    return tag ? (
                      <Badge key={tagId} variant="secondary" className="gap-1">
                        {tag.emoji} {tag.label}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={resetReviewState}
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
