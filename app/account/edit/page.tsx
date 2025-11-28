"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Globe, Briefcase, Clock, Heart, Cake, GraduationCap, Sparkles, Music, BookOpen, Star, Languages } from "lucide-react";
import Link from "next/link";

export default function EditAccountPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  // About Me fields
  const [dreamDestination, setDreamDestination] = useState("");
  const [work, setWork] = useState("");
  const [spendTime, setSpendTime] = useState("");
  const [pets, setPets] = useState("");
  const [decadeBorn, setDecadeBorn] = useState("");
  const [school, setSchool] = useState("");
  const [funFact, setFunFact] = useState("");
  const [uselessSkill, setUselessSkill] = useState("");
  const [favoriteSong, setFavoriteSong] = useState("");
  const [biographyTitle, setBiographyTitle] = useState("");
  const [obsessedWith, setObsessedWith] = useState("");
  const [languages, setLanguages] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/auth/sign-in");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (userData) {
        setUser(userData);
        setName(userData.name);
        setPhone(userData.phone || "");
        
        // Load About Me fields
        setDreamDestination(userData.dream_destination || "");
        setWork(userData.work || "");
        setSpendTime(userData.spend_time || "");
        setPets(userData.pets || "");
        setDecadeBorn(userData.decade_born || "");
        setSchool(userData.school || "");
        setFunFact(userData.fun_fact || "");
        setUselessSkill(userData.useless_skill || "");
        setFavoriteSong(userData.favorite_song || "");
        setBiographyTitle(userData.biography_title || "");
        setObsessedWith(userData.obsessed_with || "");
        setLanguages(userData.languages || "");
      }

      setLoadingProfile(false);
    };

    getUser();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("users")
        .update({ 
          name, 
          phone,
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
      
      // Refresh the page to show updated data
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "New passwords do not match.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link
            href="/account"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Account
          </Link>

          <h1 className="font-serif text-4xl font-bold mb-8">Edit Profile</h1>

          {/* Update Profile Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your name and contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} id="profile-form" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 7700 900000"
                  />
                </div>
              </form>
            </CardContent>
          </Card>

          {/* About Me Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>About Me</CardTitle>
              <CardDescription>
                Share fun facts about yourself to help others get to know you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dream Destination */}
                  <div className="space-y-2">
                    <Label htmlFor="dreamDestination" className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      Where I've always wanted to go
                    </Label>
                    <Input
                      id="dreamDestination"
                      value={dreamDestination}
                      onChange={(e) => setDreamDestination(e.target.value)}
                      placeholder="e.g., Patagonia + Japan"
                      form="profile-form"
                    />
                  </div>

                  {/* Work */}
                  <div className="space-y-2">
                    <Label htmlFor="work" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      My work
                    </Label>
                    <Input
                      id="work"
                      value={work}
                      onChange={(e) => setWork(e.target.value)}
                      placeholder="e.g., Equine Veterinarian"
                      form="profile-form"
                    />
                  </div>

                  {/* Spend Time */}
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
                      form="profile-form"
                    />
                  </div>

                  {/* Pets */}
                  <div className="space-y-2">
                    <Label htmlFor="pets" className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      Pets
                    </Label>
                    <Input
                      id="pets"
                      value={pets}
                      onChange={(e) => setPets(e.target.value)}
                      placeholder="e.g., 2 horses, 1 dog, 3 cats"
                      form="profile-form"
                    />
                  </div>

                  {/* Decade Born */}
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
                      form="profile-form"
                    />
                  </div>

                  {/* School */}
                  <div className="space-y-2">
                    <Label htmlFor="school" className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      Where I went to school
                    </Label>
                    <Input
                      id="school"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="e.g., University of Edinburgh"
                      form="profile-form"
                    />
                  </div>

                  {/* Fun Fact */}
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
                      form="profile-form"
                    />
                  </div>

                  {/* Useless Skill */}
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
                      form="profile-form"
                    />
                  </div>

                  {/* Favorite Song */}
                  <div className="space-y-2">
                    <Label htmlFor="favoriteSong" className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      My favourite song
                    </Label>
                    <Input
                      id="favoriteSong"
                      value={favoriteSong}
                      onChange={(e) => setFavoriteSong(e.target.value)}
                      placeholder="e.g., Peg - Steely Dan"
                      form="profile-form"
                    />
                  </div>

                  {/* Biography Title */}
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
                      form="profile-form"
                    />
                  </div>

                  {/* Obsessed With */}
                  <div className="space-y-2">
                    <Label htmlFor="obsessedWith" className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      I'm obsessed with
                    </Label>
                    <Input
                      id="obsessedWith"
                      value={obsessedWith}
                      onChange={(e) => setObsessedWith(e.target.value)}
                      placeholder="Your current fixation"
                      form="profile-form"
                    />
                  </div>

                  {/* Languages */}
                  <div className="space-y-2">
                    <Label htmlFor="languages" className="flex items-center gap-2">
                      <Languages className="h-4 w-4 text-muted-foreground" />
                      Languages I speak
                    </Label>
                    <Input
                      id="languages"
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      placeholder="e.g., English, French"
                      form="profile-form"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button type="submit" form="profile-form" disabled={loading}>
                    {loading ? "Saving..." : "Save All Changes"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password Form */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                  />
                </div>

                <Button type="submit" disabled={loading} variant="secondary">
                  {loading ? "Updating..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}


