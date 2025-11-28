"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";

interface ProfilePictureUploadProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfilePictureUpload({
  user,
  open,
  onOpenChange,
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file with comprehensive checks
    const { validateAvatarUpload } = await import('@/lib/file-validation');
    const validation = validateAvatarUpload(file);
    
    if (!validation.valid) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: validation.error || "Please select a valid image file",
      });
      // Clear the input
      event.target.value = '';
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploading(true);

    try {
      // Create unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update user profile
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
      });

      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload image",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change profile picture</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex justify-center">
            <Avatar className="h-40 w-40">
              <AvatarImage
                src={preview || user.avatar_url || ""}
                alt={user.name}
              />
              <AvatarFallback className="text-5xl bg-primary/10">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="avatar-upload">
              <Button
                className="w-full"
                disabled={uploading}
                asChild
                variant={preview ? "default" : "outline"}
              >
                <span>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Choose Photo
                    </>
                  )}
                </span>
              </Button>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />

            <p className="text-xs text-muted-foreground text-center">
              JPG, PNG or GIF. Max 5MB.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

