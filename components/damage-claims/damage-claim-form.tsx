"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Upload, 
  X, 
  Loader2, 
  Camera,
  Clock,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

interface DamageClaimFormProps {
  bookingId: string;
  propertyName: string;
  guestName: string;
  checkoutDate: Date;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DamageClaimForm({
  bookingId,
  propertyName,
  guestName,
  checkoutDate,
  onSuccess,
  onCancel,
}: DamageClaimFormProps) {
  const [claimType, setClaimType] = useState<"damage" | "excessive_cleaning" | "both">("damage");
  const [description, setDescription] = useState("");
  const [amountGBP, setAmountGBP] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Calculate time remaining
  const now = new Date();
  const deadline = new Date(checkoutDate);
  deadline.setHours(deadline.getHours() + 48);
  const hoursRemaining = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
  const isExpired = hoursRemaining <= 0;

  const handlePhotoUpload = async (files: FileList) => {
    if (files.length === 0) return;
    
    setUploading(true);
    const supabase = createClient();
    const newUrls: string[] = [];
    
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast({
            variant: "destructive",
            title: "Invalid file",
            description: "Only image files are allowed",
          });
          continue;
        }

        const fileName = `damage-claims/${bookingId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("property-images")
          .upload(fileName, file);

        if (error) {
          console.error("Upload error:", error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("property-images")
          .getPublicUrl(fileName);

        newUrls.push(publicUrl);
      }

      setUploadedUrls([...uploadedUrls, ...newUrls]);
      setPhotos([...photos, ...Array.from(files)]);
      
      toast({
        title: "Photos uploaded",
        description: `${newUrls.length} photo(s) uploaded successfully`,
      });
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload photos. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setUploadedUrls(uploadedUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadedUrls.length === 0) {
      toast({
        variant: "destructive",
        title: "Photos required",
        description: "Please upload at least one photo as evidence",
      });
      return;
    }

    if (!description || description.length < 10) {
      toast({
        variant: "destructive",
        title: "Description required",
        description: "Please provide a detailed description of the damage",
      });
      return;
    }

    const amountPennies = Math.round(parseFloat(amountGBP) * 100);
    if (isNaN(amountPennies) || amountPennies < 100) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid claim amount (minimum £1)",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch("/api/damage-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          claimType,
          description,
          amountPennies,
          evidenceUrls: uploadedUrls,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit claim");
      }

      toast({
        title: "Claim submitted",
        description: "The guest will be notified and can respond within 48 hours.",
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting claim:", error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isExpired) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The 48-hour window for submitting damage claims has expired. 
              Claims must be submitted within 48 hours of checkout.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Submit Damage Claim
            </CardTitle>
            <CardDescription className="mt-1">
              For booking at <strong>{propertyName}</strong> with guest <strong>{guestName}</strong>
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {Math.floor(hoursRemaining)}h remaining
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Claims must be submitted within 48 hours of checkout. The guest will be notified 
              and can accept or dispute the claim. Disputed claims are reviewed by padoq.
            </AlertDescription>
          </Alert>

          {/* Claim Type */}
          <div className="space-y-3">
            <Label>What type of claim is this?</Label>
            <RadioGroup
              value={claimType}
              onValueChange={(value) => setClaimType(value as any)}
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              <Label
                htmlFor="damage"
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  claimType === "damage" ? "border-primary bg-primary/5" : "hover:bg-muted"
                }`}
              >
                <RadioGroupItem value="damage" id="damage" />
                <div>
                  <p className="font-medium">Property Damage</p>
                  <p className="text-sm text-muted-foreground">Broken items, scratches, etc.</p>
                </div>
              </Label>
              <Label
                htmlFor="excessive_cleaning"
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  claimType === "excessive_cleaning" ? "border-primary bg-primary/5" : "hover:bg-muted"
                }`}
              >
                <RadioGroupItem value="excessive_cleaning" id="excessive_cleaning" />
                <div>
                  <p className="font-medium">Excessive Cleaning</p>
                  <p className="text-sm text-muted-foreground">Beyond normal turnover</p>
                </div>
              </Label>
              <Label
                htmlFor="both"
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  claimType === "both" ? "border-primary bg-primary/5" : "hover:bg-muted"
                }`}
              >
                <RadioGroupItem value="both" id="both" />
                <div>
                  <p className="font-medium">Both</p>
                  <p className="text-sm text-muted-foreground">Damage and cleaning</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what happened in detail. Be specific about the damage, location, and circumstances..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Provide clear details to help with the review process.
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Claim Amount (£)</Label>
            <div className="flex items-center gap-2">
              <span className="text-2xl">£</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                value={amountGBP}
                onChange={(e) => setAmountGBP(e.target.value)}
                className="max-w-[200px]"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the cost to repair/replace damaged items or additional cleaning costs.
            </p>
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <Label>Evidence Photos</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {uploadedUrls.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img
                    src={url}
                    alt={`Evidence ${index + 1}`}
                    className="object-cover w-full h-full"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <label
                className={`aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors ${
                  uploading ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Add Photo</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload clear photos showing the damage. At least one photo is required.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={submitting || uploading}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Claim
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

