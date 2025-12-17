"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FacilityPhotosStepProps {
  data: any;
  onNext: (data: any) => void;
  propertyId?: string;
  userId: string;
}

// Define the required facility categories
const FACILITY_CATEGORIES = [
  {
    id: "stables",
    name: "Stables",
    description: "Interior and exterior views of your stables",
    required: true,
    minPhotos: 2,
    icon: "🏠",
  },
  {
    id: "paddock",
    name: "Paddock / Turnout",
    description: "Views of paddock area, fencing, and shelter",
    required: false,
    minPhotos: 1,
    icon: "🌿",
  },
  {
    id: "arena",
    name: "Arena / Riding Area",
    description: "Indoor or outdoor arena photos",
    required: false,
    minPhotos: 1,
    icon: "🏟️",
  },
  {
    id: "tack_room",
    name: "Tack Room",
    description: "Secure storage for equipment",
    required: false,
    minPhotos: 1,
    icon: "🎠",
  },
  {
    id: "wash_bay",
    name: "Wash Bay / Grooming Area",
    description: "Horse washing and grooming facilities",
    required: false,
    minPhotos: 1,
    icon: "🚿",
  },
  {
    id: "parking",
    name: "Trailer / Lorry Parking",
    description: "Parking area for horse transport",
    required: false,
    minPhotos: 1,
    icon: "🚛",
  },
];

export function PropertyFacilityPhotosStep({ data, onNext, propertyId, userId }: FacilityPhotosStepProps) {
  const [facilityPhotos, setFacilityPhotos] = useState<Record<string, any[]>>(data?.facilityPhotos || {});
  const [uploading, setUploading] = useState<string | null>(null);
  const [equineData, setEquineData] = useState<any>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Get equine data to know which categories apply
  useEffect(() => {
    if (data?.equine) {
      setEquineData(data.equine);
    }
  }, [data]);

  // Determine which categories are applicable based on equine facilities
  const getApplicableCategories = () => {
    const applicable = [
      // Stables are always required if max_horses > 0
      FACILITY_CATEGORIES.find(c => c.id === "stables")!,
    ];

    if (equineData?.paddock_available) {
      applicable.push(FACILITY_CATEGORIES.find(c => c.id === "paddock")!);
    }

    if (equineData?.arena_indoor || equineData?.arena_outdoor) {
      applicable.push(FACILITY_CATEGORIES.find(c => c.id === "arena")!);
    }

    if (equineData?.tack_room || equineData?.locked_tack_room) {
      applicable.push(FACILITY_CATEGORIES.find(c => c.id === "tack_room")!);
    }

    if (equineData?.wash_bay) {
      applicable.push(FACILITY_CATEGORIES.find(c => c.id === "wash_bay")!);
    }

    if (equineData?.trailer_parking || equineData?.lorry_parking) {
      applicable.push(FACILITY_CATEGORIES.find(c => c.id === "parking")!);
    }

    return applicable;
  };

  const applicableCategories = getApplicableCategories();

  const handleFileSelect = async (categoryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentPhotos = facilityPhotos[categoryId] || [];
    if (currentPhotos.length + files.length > 5) {
      toast({
        variant: "destructive",
        title: "Too many photos",
        description: "Maximum 5 photos per category",
      });
      return;
    }

    setUploading(categoryId);

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
        const fileName = `${userId}-facility-${categoryId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `properties/facilities/${fileName}`;

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
          category: categoryId,
          order: currentPhotos.length + uploadedPhotos.length,
        });
      }

      setFacilityPhotos({
        ...facilityPhotos,
        [categoryId]: [...currentPhotos, ...uploadedPhotos],
      });
      
      toast({
        title: "Photos uploaded",
        description: `${uploadedPhotos.length} photo(s) uploaded to ${FACILITY_CATEGORIES.find(c => c.id === categoryId)?.name}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setUploading(null);
    }
  };

  const removePhoto = (categoryId: string, index: number) => {
    const updatedPhotos = (facilityPhotos[categoryId] || []).filter((_, i) => i !== index);
    setFacilityPhotos({
      ...facilityPhotos,
      [categoryId]: updatedPhotos,
    });
  };

  const getCategoryStatus = (category: typeof FACILITY_CATEGORIES[0]) => {
    const photos = facilityPhotos[category.id] || [];
    const meetsMinimum = photos.length >= category.minPhotos;
    
    if (category.required && !meetsMinimum) {
      return { status: "required", label: "Required", variant: "destructive" as const };
    }
    if (meetsMinimum) {
      return { status: "complete", label: "Complete", variant: "default" as const };
    }
    return { status: "optional", label: "Optional", variant: "secondary" as const };
  };

  const handleContinue = () => {
    // Check if stables photos are provided (required)
    const stablesPhotos = facilityPhotos["stables"] || [];
    if (stablesPhotos.length < 2) {
      toast({
        variant: "destructive",
        title: "Stables photos required",
        description: "Please upload at least 2 photos of your stables",
      });
      return;
    }

    onNext({ facilityPhotos });
  };

  // Check if all requirements are met
  const allRequirementsMet = () => {
    const stablesPhotos = facilityPhotos["stables"] || [];
    return stablesPhotos.length >= 2;
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-900">Important: Facility Photos Required for Verification</h4>
            <p className="text-sm text-amber-800 mt-1">
              Your listing will need to be verified by our team before it goes live. 
              Photos of your horse facilities help us verify your listing and help guests 
              see exactly what you offer.
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          Upload photos of your horse facilities. Stables photos are required. 
          Additional categories appear based on the facilities you indicated in the previous step.
        </p>
      </div>

      <div className="space-y-6">
        {applicableCategories.map((category) => {
          const photos = facilityPhotos[category.id] || [];
          const status = getCategoryStatus(category);
          const isUploading = uploading === category.id;

          return (
            <Card key={category.id} className={`${status.status === "complete" ? "border-green-300 bg-green-50/50" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {category.name}
                        {status.status === "complete" && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={status.variant}>
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Button */}
                <div>
                  <label htmlFor={`facility-upload-${category.id}`}>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploading || photos.length >= 5}
                      asChild
                      size="sm"
                    >
                      <span>
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload {category.name} Photos ({photos.length}/5)
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                  <input
                    id={`facility-upload-${category.id}`}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileSelect(category.id, e)}
                    className="hidden"
                    disabled={isUploading || photos.length >= 5}
                  />
                </div>

                {/* Photo Grid */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative group aspect-square">
                        <Image
                          src={photo.url}
                          alt={`${category.name} ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 33vw, 20vw"
                          className="object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => removePhoto(category.id, index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {photos.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No photos uploaded yet. {category.required && "At least 2 photos required."}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleContinue}
          disabled={!allRequirementsMet()}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

