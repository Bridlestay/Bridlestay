"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Cookie } from "lucide-react";
import Link from "next/link";
import { validateUsername } from "@/lib/moderation";
import { Switch } from "@/components/ui/switch";

export default function EditAccountPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [cookiesAccepted, setCookiesAccepted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Load cookie preference
  useEffect(() => {
    const consent = localStorage.getItem("padoq-cookie-consent");
    setCookiesAccepted(consent === "accepted");
  }, []);

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
      }

      setLoadingProfile(false);
    };

    getUser();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const nameChanged = name !== user.name;

      // Validate name if changed
      if (nameChanged) {
        const nameValidation = validateUsername(name);
        if (!nameValidation.valid) {
          toast({
            variant: "destructive",
            title: "Invalid Name",
            description: nameValidation.reason || "Please choose a different name.",
          });
          setLoading(false);
          return;
        }

        // Check name change limit (3 per month)
        const lastChanged = user.name_last_changed_at ? new Date(user.name_last_changed_at) : null;
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        const count = lastChanged && lastChanged > monthAgo ? (user.name_change_count || 0) : 0;
        
        if (count >= 3) {
          toast({
            variant: "destructive",
            title: "Name Change Limit Reached",
            description: "You can only change your name 3 times per month. Please try again later.",
          });
          setLoading(false);
          return;
        }
      }

      // Build update object
      const updateData: any = { phone };
      
      if (nameChanged) {
        updateData.name = name;
        // Update name change tracking
        const lastChanged = user.name_last_changed_at ? new Date(user.name_last_changed_at) : null;
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        if (!lastChanged || lastChanged < monthAgo) {
          updateData.name_change_count = 1;
        } else {
          updateData.name_change_count = (user.name_change_count || 0) + 1;
        }
        updateData.name_last_changed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;

      // Update local user state
      setUser({ ...user, ...updateData });

      toast({
        title: "Profile updated",
        description: nameChanged 
          ? `Your profile has been updated. You have ${3 - (updateData.name_change_count)} name changes remaining this month.`
          : "Your profile has been updated successfully.",
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
                  {user?.name !== name && (
                    <p className="text-xs text-muted-foreground">
                      Name changes are limited to 3 per month
                    </p>
                  )}
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

                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
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
                  <PasswordInput
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <PasswordInput
                    id="confirmPassword"
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

          {/* Cookie Preferences */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="h-5 w-5" />
                Cookie Preferences
              </CardTitle>
              <CardDescription>
                Manage your cookie and tracking preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Analytics & Performance Cookies</Label>
                  <p className="text-sm text-muted-foreground">
                    Help us improve by allowing anonymous usage data collection
                  </p>
                </div>
                <Switch
                  checked={cookiesAccepted}
                  onCheckedChange={(checked) => {
                    setCookiesAccepted(checked);
                    localStorage.setItem(
                      "padoq-cookie-consent",
                      checked ? "accepted" : "declined"
                    );
                    toast({
                      title: "Cookie preferences saved",
                      description: checked 
                        ? "Analytics cookies are now enabled." 
                        : "Analytics cookies have been disabled.",
                    });
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Essential cookies required for the site to function are always enabled.{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Read our Privacy Policy
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}


