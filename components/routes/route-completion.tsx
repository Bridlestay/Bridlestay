'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, CheckCircle2, Upload, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface RouteCompletionProps {
  routeId: string;
  userId?: string;
  onCompletionChange?: () => void;
}

export function RouteCompletion({ routeId, userId, onCompletionChange }: RouteCompletionProps) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [completion, setCompletion] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    checkCompletion();
    fetchPhotos();
  }, [routeId, userId]);

  const checkCompletion = async () => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/routes/${routeId}/complete`);
      const data = await res.json();
      setIsCompleted(data.completed);
      setCompletion(data.completion);
    } catch (error) {
      console.error('Error checking completion:', error);
    }
  };

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`/api/routes/${routeId}/photos`);
      const data = await res.json();
      setPhotos(data.userPhotos || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const handleMarkComplete = async () => {
    if (!userId) {
      alert('Please sign in to mark routes as complete');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/routes/${routeId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, rating: rating > 0 ? rating : null }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to mark as complete');
      }

      setIsCompleted(true);
      setIsDialogOpen(false);
      setNotes('');
      setRating(0);
      onCompletionChange?.();
      await checkCompletion();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/routes/${routeId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload photo');
      }

      await fetchPhotos();
      onCompletionChange?.();
    } catch (error: any) {
      setUploadError(error.message);
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return;

    try {
      const res = await fetch(`/api/routes/${routeId}/photos?photoId=${photoId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete photo');

      await fetchPhotos();
      onCompletionChange?.();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Completion Status */}
      {isCompleted ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                You completed this route!
              </p>
              {completion?.rating && (
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= completion.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
              {completion?.notes && (
                <p className="text-sm text-gray-600 mt-1">{completion.notes}</p>
              )}
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="mt-4 pt-4 border-t border-green-200">
            <Label htmlFor="photo-upload" className="text-sm font-medium text-gray-700 mb-2 block">
              Share Your Photos
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingPhoto}
                onClick={() => document.getElementById('photo-upload')?.click()}
              >
                {isUploadingPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            {uploadError && (
              <p className="text-sm text-red-600 mt-2">{uploadError}</p>
            )}
          </div>

          {/* User's Uploaded Photos */}
          {photos.filter(p => p.user_id === userId).length > 0 && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Your Photos</p>
              <div className="grid grid-cols-3 gap-2">
                {photos
                  .filter(p => p.user_id === userId)
                  .map((photo) => (
                    <div key={photo.id} className="relative group aspect-square">
                      <Image
                        src={photo.url}
                        alt="Route photo"
                        fill
                        className="object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark as Completed
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete This Route</DialogTitle>
              <DialogDescription>
                Share your experience on this route. You'll be able to upload photos after marking
                it as complete.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Rating */}
              <div className="space-y-2">
                <Label>Rate this route (optional)</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (hoveredRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="How was the route? Any tips for others?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleMarkComplete} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Complete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Community Photos Section */}
      {photos.filter(p => p.user_id !== userId).length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Community Photos</h3>
          <div className="grid grid-cols-2 gap-3">
            {photos
              .filter(p => p.user_id !== userId)
              .slice(0, 6)
              .map((photo) => (
                <div key={photo.id} className="relative aspect-video">
                  <Image
                    src={photo.url}
                    alt={photo.caption || 'Route photo'}
                    fill
                    className="object-cover rounded-lg"
                  />
                  {photo.user && (
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      @{photo.user.username}
                    </div>
                  )}
                </div>
              ))}
          </div>
          {photos.filter(p => p.user_id !== userId).length > 6 && (
            <p className="text-sm text-gray-500 mt-2">
              +{photos.filter(p => p.user_id !== userId).length - 6} more photos
            </p>
          )}
        </div>
      )}
    </div>
  );
}

