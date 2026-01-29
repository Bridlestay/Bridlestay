"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { ProfilePictureUpload } from "@/components/profile/profile-picture-upload";
import { HorseDialog } from "@/components/horses/horse-dialog";
import { HorseshoeIcon } from "@/components/icons/horseshoe";
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Music,
  Lightbulb,
  Globe,
  CheckCircle2,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface AboutMeSectionProps {
  user: any;
  reviewsCount: number;
  tripsCount: number;
  horsesCount: number;
}

export function AboutMeSection({
  user,
  reviewsCount,
  tripsCount,
  horsesCount,
}: AboutMeSectionProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPicture, setIsEditingPicture] = useState(false);
  const [horseDialogOpen, setHorseDialogOpen] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState<any>(null);
  const [horses, setHorses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchHorses();
  }, []);

  const fetchHorses = async () => {
    try {
      const res = await fetch("/api/horses");
      if (res.ok) {
        const data = await res.json();
        setHorses(data.horses || []);
      }
    } catch (error) {
      console.error("Error fetching horses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHorse = () => {
    setSelectedHorse(null);
    setHorseDialogOpen(true);
  };

  const handleEditHorse = (horse: any) => {
    setSelectedHorse(horse);
    setHorseDialogOpen(true);
  };

  const handleDeleteHorse = async (horseId: string) => {
    setDeleting(horseId);
    try {
      const res = await fetch(`/api/horses/${horseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete horse");
      }

      toast.success("Horse deleted successfully");
      fetchHorses();
    } catch (error) {
      toast.error("Failed to delete horse");
    } finally {
      setDeleting(null);
    }
  };

  const handleHorseSuccess = () => {
    setHorseDialogOpen(false);
    setSelectedHorse(null);
    fetchHorses();
  };

  const handleToggleHorseVisibility = async (horse: any) => {
    try {
      const res = await fetch(`/api/horses/${horse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public: !horse.public }),
      });

      if (!res.ok) throw new Error("Failed to update visibility");

      toast.success(`${horse.name} is now ${!horse.public ? "public" : "private"}`);
      fetchHorses();
    } catch (error) {
      toast.error("Failed to update horse visibility");
    }
  };

  const profileFields = [
    {
      icon: Globe,
      label: "Where I've always wanted to go",
      value: user.dream_destination,
    },
    { icon: Briefcase, label: "My work", value: user.work || user.occupation },
    { icon: GraduationCap, label: "Where I went to school", value: user.school },
    {
      icon: Music,
      label: "Favourite song",
      value: user.favorite_song || user.favourite_song,
    },
    { icon: Lightbulb, label: "Fun fact", value: user.fun_fact },
  ];

  const yearsOnPlatform = new Date().getFullYear() - new Date(user.created_at).getFullYear();

  return (
    <>
      <div className="flex items-start justify-between mb-8">
        <h2 className="font-serif text-3xl font-bold">About me</h2>
        <Button variant="outline" onClick={() => setIsEditingProfile(true)}>
          Edit
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar with Featured Badge */}
            <div className="relative">
              <Avatar
                className="h-32 w-32 cursor-pointer"
                onClick={() => setIsEditingPicture(true)}
              >
                <AvatarImage src={user.avatar_url || ""} alt={user.name} />
                <AvatarFallback className="text-3xl bg-primary/10">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {user.admin_verified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              )}
              {/* Featured Badge Display */}
              {user.featured_badge && (
                <div 
                  className="absolute -bottom-2 -left-2 h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border-2 border-white shadow-lg"
                  title={user.featured_badge.name}
                >
                  <span className="text-lg">{user.featured_badge.icon}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex-1">
              <h3 className="font-serif text-3xl font-bold mb-2">{user.name}</h3>
              <p className="text-muted-foreground mb-6">
                {user.city || "United Kingdom"}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{tripsCount}</p>
                  <p className="text-sm text-muted-foreground">Trips</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{reviewsCount}</p>
                  <p className="text-sm text-muted-foreground">Reviews</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{horsesCount}</p>
                  <p className="text-sm text-muted-foreground">Horses</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{yearsOnPlatform}</p>
                  <p className="text-sm text-muted-foreground">
                    Years on padoq
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Fields */}
      <div className="space-y-6 mb-8">
        {profileFields.map((field, index) =>
          field.value ? (
            <div key={index} className="flex items-start gap-4">
              <field.icon className="h-6 w-6 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium mb-1">{field.label}</p>
                <p className="text-muted-foreground">{field.value}</p>
              </div>
            </div>
          ) : null
        )}

        {user.verified && (
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Identity verified</p>
            </div>
          </div>
        )}

        {profileFields.every((f) => !f.value) && !user.bio && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Your profile is looking a bit empty!
            </p>
            <Button onClick={() => setIsEditingProfile(true)}>
              Add Profile Info
            </Button>
          </div>
        )}
      </div>

      {/* Bio Section */}
      {user.bio && (
        <div className="border-t pt-8">
          <p className="text-lg leading-relaxed">{user.bio}</p>
        </div>
      )}

      {/* Horses Section */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>My Horses</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {horses.filter(h => h.public).length} Public
                </Badge>
                {horses.filter(h => !h.public).length > 0 && (
                  <Badge variant="outline">
                    {horses.filter(h => !h.public).length} Private
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={handleAddHorse}>
              <Plus className="h-4 w-4 mr-2" />
              Add Horse
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : horses.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-4">
                <HorseshoeIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No horses yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your horses to quickly fill booking information
              </p>
              <Button onClick={handleAddHorse}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Horse
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {horses.map((horse) => (
                <Card 
                  key={horse.id} 
                  className={`overflow-hidden hover:shadow-lg transition-all ${
                    !horse.public ? 'border-2 border-dashed border-muted-foreground/30' : ''
                  }`}
                >
                  <CardContent className="p-0">
                    {/* Horse Photo */}
                    <div className="relative h-48 bg-muted">
                      {!horse.public && (
                        <div className="absolute top-2 left-2 z-10">
                          <Badge variant="secondary" className="bg-muted-foreground/80 text-white">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Private
                          </Badge>
                        </div>
                      )}
                      {horse.photo_url ? (
                        <img
                          src={horse.photo_url}
                          alt={horse.name}
                          className={`w-full h-full object-cover ${!horse.public ? 'opacity-60 grayscale' : ''}`}
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${!horse.public ? 'opacity-60' : ''}`}>
                          <HorseshoeIcon className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Horse Details */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold">{horse.name}</h3>
                        {/* Visibility Toggle */}
                        <div 
                          className="flex items-center gap-1.5 cursor-pointer"
                          onClick={() => handleToggleHorseVisibility(horse)}
                          title={horse.public ? "Make private" : "Make public"}
                        >
                          {horse.public ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Switch
                            checked={horse.public}
                            onCheckedChange={() => handleToggleHorseVisibility(horse)}
                            className="scale-75"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {horse.breed}
                        {horse.age && ` • ${horse.age} years`}
                      </p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium capitalize">{horse.gender}</span>
                          {horse.height_hands && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span>{horse.height_hands} hands</span>
                            </>
                          )}
                        </div>
                        {horse.temperament && (
                          <Badge variant="outline" className="capitalize">
                            {horse.temperament}
                          </Badge>
                        )}
                      </div>

                      {/* Quick Facts */}
                      {horse.quick_facts && horse.quick_facts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {horse.quick_facts.slice(0, 3).map((fact: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {fact}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Actions - Always fully visible */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditHorse(horse)}
                          className="flex-1"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={deleting === horse.id}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {horse.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {horse.name} from your horses. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteHorse(horse.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleting === horse.id ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditProfileDialog
        user={user}
        open={isEditingProfile}
        onOpenChange={setIsEditingProfile}
      />

      <ProfilePictureUpload
        user={user}
        open={isEditingPicture}
        onOpenChange={setIsEditingPicture}
      />

      <HorseDialog
        open={horseDialogOpen}
        onOpenChange={setHorseDialogOpen}
        horse={selectedHorse}
        onSuccess={handleHorseSuccess}
      />
    </>
  );
}

