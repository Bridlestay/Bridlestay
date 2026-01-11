"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Clock, 
  Upload, 
  X, 
  Loader2, 
  Camera,
  Info,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { differenceInHours, formatDistanceToNow } from "date-fns";

const RESOLUTION_WINDOW_HOURS = 48;

interface IssueReportFormProps {
  bookingId: string;
  propertyName: string;
  checkInDate: Date;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const issueTypes = [
  {
    value: "misrepresentation",
    label: "Property Not as Described",
    description: "The property differs significantly from the listing",
  },
  {
    value: "cleanliness",
    label: "Serious Cleanliness Issues",
    description: "Property or stables not clean to acceptable standards",
  },
  {
    value: "safety",
    label: "Safety Concerns",
    description: "Safety issues for guests or horses",
  },
  {
    value: "access_denied",
    label: "Access Denied",
    description: "Could not access the property",
  },
  {
    value: "missing_amenities",
    label: "Missing Core Amenities",
    description: "Key advertised amenities not available",
  },
  {
    value: "other",
    label: "Other Serious Issue",
    description: "Another serious issue not listed above",
  },
];

export function IssueReportForm({
  bookingId,
  propertyName,
  checkInDate,
  onSuccess,
  onCancel,
}: IssueReportFormProps) {
  const [issueType, setIssueType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Calculate time remaining in resolution window
  const now = new Date();
  const windowEnd = new Date(checkInDate.getTime() + RESOLUTION_WINDOW_HOURS * 60 * 60 * 1000);
  const hoursRemaining = Math.max(0, differenceInHours(windowEnd, now));
  const isWithinWindow = now >= checkInDate && now <= windowEnd;
  const hasExpired = now > windowEnd;
  const notYetStarted = now < checkInDate;

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

        const fileName = `booking-issues/${bookingId}/${Date.now()}-${file.name}`;
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

      setPhotos([...photos, ...newUrls]);
      
      if (newUrls.length > 0) {
        toast({
          title: "Photos uploaded",
          description: `${newUrls.length} photo(s) uploaded successfully`,
        });
      }
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!issueType) {
      toast({
        variant: "destructive",
        title: "Issue type required",
        description: "Please select the type of issue",
      });
      return;
    }

    if (!description || description.length < 20) {
      toast({
        variant: "destructive",
        title: "Description required",
        description: "Please provide a detailed description (at least 20 characters)",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch("/api/booking/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          issueType,
          description,
          evidenceUrls: photos,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to report issue");
      }

      toast({
        title: "Issue reported",
        description: "Our team will review your report and get back to you shortly.",
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error reporting issue:", error);
      toast({
        variant: "destructive",
        title: "Report failed",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Not within window states
  if (notYetStarted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Issues can only be reported after check-in has started. 
              Your check-in is {formatDistanceToNow(checkInDate, { addSuffix: true })}.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (hasExpired) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The {RESOLUTION_WINDOW_HOURS}-hour issue reporting window has expired. 
              Issues must be reported within {RESOLUTION_WINDOW_HOURS} hours of check-in.
              If you have serious concerns, please contact support directly.
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
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Report an Issue
            </CardTitle>
            <CardDescription className="mt-1">
              At <strong>{propertyName}</strong>
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-200">
            <Clock className="h-3 w-3" />
            {hoursRemaining}h remaining
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please only report <strong>serious issues</strong> that affect your stay. 
              Minor inconveniences should be addressed with the host directly or mentioned in your review.
              Valid issues may result in a partial or full refund of unused nights.
            </AlertDescription>
          </Alert>

          {/* Issue Type */}
          <div className="space-y-3">
            <Label>What type of issue are you experiencing?</Label>
            <RadioGroup
              value={issueType}
              onValueChange={setIssueType}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {issueTypes.map((type) => (
                <Label
                  key={type.value}
                  htmlFor={type.value}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    issueType === type.value ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                >
                  <RadioGroupItem value={type.value} id={type.value} className="mt-0.5" />
                  <div>
                    <p className="font-medium">{type.label}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Describe the issue in detail</Label>
            <Textarea
              id="description"
              placeholder="Please provide as much detail as possible. What did you expect? What did you find instead? When did you notice this?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum 20 characters. More detail helps us resolve your issue faster.
            </p>
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <Label>Evidence Photos (optional but helpful)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map((url, index) => (
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
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

