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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Globe, Briefcase, Clock, Heart, Cake, GraduationCap, Sparkles, Music, BookOpen, Star, Languages as LanguagesIcon, Crop } from "lucide-react";
import { ImageCropper } from "@/components/ui/image-cropper";

interface EditProfileDialogProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({
  user,
  open,
  onOpenChange,
}: EditProfileDialogProps) {
  const [bio, setBio] = useState(user.bio || "");
  const [dreamDestination, setDreamDestination] = useState(user.dream_destination || "");
  const [work, setWork] = useState(user.work || "");
  const [spendTime, setSpendTime] = useState(user.spend_time || "");
  const [pets, setPets] = useState(user.pets || "");
  const [decadeBorn, setDecadeBorn] = useState(user.decade_born || "");
  const [school, setSchool] = useState(user.school || "");
  const [funFact, setFunFact] = useState(user.fun_fact || "");
  const [uselessSkill, setUselessSkill] = useState(user.useless_skill || "");
  const [favoriteSong, setFavoriteSong] = useState(user.favorite_song || "");
  const [biographyTitle, setBiographyTitle] = useState(user.biography_title || "");
  const [obsessedWith, setObsessedWith] = useState(user.obsessed_with || "");
  const [languages, setLanguages] = useState(user.languages || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      if (event.target) event.target.value = '';
      return;
    }

    // Show image in cropper instead of directly setting
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImageSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Clear the input for re-selection
    event.target.value = '';
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // Create a File from the Blob for upload
    const file = new File([croppedBlob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" });
    setAvatarFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(croppedBlob);
    setAvatarPreview(previewUrl);
    
    toast({
      title: "Image cropped",
      description: "Your profile picture has been cropped. Click Save to apply.",
    });
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      let avatarUrl = user.avatar_url;

      // Upload avatar if one was selected
      if (avatarFile) {
        setUploading(true);
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        avatarUrl = publicUrl;
        setUploading(false);
      }

      const { error } = await supabase
        .from("users")
        .update({
          avatar_url: avatarUrl,
          bio,
          dream_destination: dreamDestination,
          work,
          spend_time: spendTime,
          pets,
          decade_born: decadeBorn,
          school,
          fun_fact: funFact,
          useless_skill: uselessSkill,
          favorite_song: favoriteSong,
          biography_title: biographyTitle,
          obsessed_with: obsessedWith,
          languages,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit your profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Picture */}
          <div className="space-y-2">
            <Label>Profile picture</Label>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={avatarPreview || user.avatar_url || ""}
                  alt={user.name}
                />
                <AvatarFallback className="text-2xl bg-primary/10">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div>
                <label htmlFor="avatar-upload">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    asChild
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
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG or GIF. Max 5MB. Recommended: 400×400px (will be cropped to square).
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">About you</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a bit about yourself..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/500
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dreamDestination" className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Where I&apos;ve always wanted to go
              </Label>
              <Input
                id="dreamDestination"
                value={dreamDestination}
                onChange={(e) => setDreamDestination(e.target.value)}
                placeholder="e.g., New Zealand or Iceland"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="work" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                My work
              </Label>
              <Input
                id="work"
                value={work}
                onChange={(e) => setWork(e.target.value)}
                placeholder="e.g., Equine Vet, Teacher, Farmer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spendTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                I spend too much time
              </Label>
              <Input
                id="spendTime"
                value={spendTime}
                onChange={(e) => setSpendTime(e.target.value)}
                placeholder="e.g., Watching horse videos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pets" className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                Pets
              </Label>
              <Input
                id="pets"
                value={pets}
                onChange={(e) => setPets(e.target.value)}
                placeholder="e.g., 2 horses, 1 dog"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="decadeBorn" className="flex items-center gap-2">
                <Cake className="h-4 w-4 text-muted-foreground" />
                Decade I was born
              </Label>
              <Input
                id="decadeBorn"
                value={decadeBorn}
                onChange={(e) => setDecadeBorn(e.target.value)}
                placeholder="e.g., 1990s"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                Where I went to school
              </Label>
              <Input
                id="school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g., University of Bristol"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funFact" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                My fun fact
              </Label>
              <Input
                id="funFact"
                value={funFact}
                onChange={(e) => setFunFact(e.target.value)}
                placeholder="Something interesting about you"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uselessSkill" className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                My most useless skill
              </Label>
              <Input
                id="uselessSkill"
                value={uselessSkill}
                onChange={(e) => setUselessSkill(e.target.value)}
                placeholder="What's your party trick?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="favoriteSong" className="flex items-center gap-2">
                <Music className="h-4 w-4 text-muted-foreground" />
                My favourite song
              </Label>
              <Input
                id="favoriteSong"
                value={favoriteSong}
                onChange={(e) => setFavoriteSong(e.target.value)}
                placeholder="e.g., Here Comes the Sun - The Beatles"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="biographyTitle" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                My biography title would be
              </Label>
              <Input
                id="biographyTitle"
                value={biographyTitle}
                onChange={(e) => setBiographyTitle(e.target.value)}
                placeholder="Title of your life story"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obsessedWith" className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                I&apos;m obsessed with
              </Label>
              <Input
                id="obsessedWith"
                value={obsessedWith}
                onChange={(e) => setObsessedWith(e.target.value)}
                placeholder="Your current fixation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="languages" className="flex items-center gap-2">
                <LanguagesIcon className="h-4 w-4 text-muted-foreground" />
                Languages I speak
              </Label>
              <Input
                id="languages"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="e.g., English, French"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>

      {/* Image Cropper Dialog */}
      {rawImageSrc && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          title="Crop Profile Picture"
          minWidth={200}
          minHeight={200}
        />
      )}
    </Dialog>
  );
}

