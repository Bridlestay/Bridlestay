"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, ArrowRight, Loader2, Star } from "lucide-react";
import Image from "next/image";

interface PhotosStepProps {
  data: any;
  onNext: (data: any) => void;
  propertyId?: string;
  userId: string;
}

export function PropertyPhotosStep({ data, onNext, propertyId, userId }: PhotosStepProps) {
  const [photos, setPhotos] = useState<any[]>(data?.photos || []);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 20) {
      toast({
        variant: "destructive",
        title: "Too many photos",
        description: "Maximum 20 photos allowed",
      });
      return;
    }

    setUploading(true);

    try {
      const uploadedPhotos = [];

      // Import validation function
      const { validatePropertyPhotoUpload } = await import('@/lib/file-validation');

      for (const file of Array.from(files)) {
        // Validate each file
        const validation = validatePropertyPhotoUpload(file);
        
        if (!validation.valid) {
          toast({
            variant: "destructive",
            title: "Invalid file",
            description: `${file.name}: ${validation.error}`,
          });
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `properties/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("property_photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error(uploadError);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("property_photos").getPublicUrl(filePath);

        uploadedPhotos.push({
          url: publicUrl,
          order: photos.length + uploadedPhotos.length,
          is_cover: photos.length === 0 && uploadedPhotos.length === 0,
        });
      }

      setPhotos([...photos, ...uploadedPhotos]);
      toast({
        title: "Photos uploaded",
        description: `${uploadedPhotos.length} photo(s) uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const setCover = (index: number) => {
    setPhotos(
      photos.map((photo, i) => ({
        ...photo,
        is_cover: i === index,
      }))
    );
  };

  const handleContinue = () => {
    if (photos.length < 8) {
      toast({
        variant: "destructive",
        title: "More photos needed",
        description: "Please upload at least 8 photos",
      });
      return;
    }

    onNext({ photos });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Upload 8-20 high-quality photos of your property, stables, and facilities.
          Minimum 8 photos required.
        </p>
        <p className="text-sm font-medium mb-2">
          Current: {photos.length} / 20 photos {photos.length < 8 && `(${8 - photos.length} more needed)`}
        </p>
      </div>

      {/* Upload Button */}
      <div>
        <label htmlFor="photo-upload">
          <Button
            type="button"
            variant="outline"
            disabled={uploading || photos.length >= 20}
            asChild
          >
            <span className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photos
                </>
              )}
            </span>
          </Button>
        </label>
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || photos.length >= 20}
        />
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative group aspect-square">
              <Image
                src={photo.url}
                alt={`Photo ${index + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setCover(index)}
                  disabled={photo.is_cover}
                >
                  <Star
                    className={`h-4 w-4 ${photo.is_cover ? "fill-yellow-400 text-yellow-400" : ""}`}
                  />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => removePhoto(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {photo.is_cover && (
                <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-1 rounded text-xs font-medium">
                  Cover Photo
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleContinue}
          disabled={photos.length < 8}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

