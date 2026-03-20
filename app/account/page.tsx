import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Header } from "@/components/header";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Edit,
  CreditCard,
} from "lucide-react";
import { TwoFactorSettings } from "@/components/account/two-factor-settings";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!userData) {
    redirect("/auth/sign-in");
  }

  // Get stats
  const { count: bookingsCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("guest_id", user.id);

  const { count: reviewsCount } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("guest_id", user.id);

  let propertiesCount = 0;
  let hostProfile = null;

  if (userData.role === "host" || userData.role === "admin") {
    const { count } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("host_id", user.id);

    propertiesCount = count || 0;

    const { data: profile } = await supabase
      .from("host_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    hostProfile = profile;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <h1 className="font-serif text-2xl md:text-4xl font-bold mb-2">
              Account Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your profile and preferences
            </p>
          </div>

          {/* Profile Card */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Profile Information</CardTitle>
              <Link href="/account/edit">
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{userData.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{userData.email}</p>
                </div>
              </div>

              {userData.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{userData.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <Badge className="mt-1 capitalize">{userData.role}</Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {new Date(userData.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <div className="mb-6">
            <TwoFactorSettings />
          </div>

          {/* Account Stats */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {bookingsCount || 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bookings
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {reviewsCount || 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reviews
                  </p>
                </div>

                {(userData.role === "host" || userData.role === "admin") && (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">
                      {propertiesCount}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Properties
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stripe Connect for Hosts */}
          {(userData.role === "host" || userData.role === "admin") && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment & Payouts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hostProfile?.stripe_connect_id ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Stripe Connect Status</p>
                        <p className="text-sm text-muted-foreground">
                          Your payout account is{" "}
                          {hostProfile.payout_enabled ? "active" : "pending"}
                        </p>
                      </div>
                      <Badge
                        className={
                          hostProfile.payout_enabled
                            ? "bg-green-600"
                            : "bg-yellow-600"
                        }
                      >
                        {hostProfile.payout_enabled ? "Active" : "Pending"}
                      </Badge>
                    </div>
                    <form action="/api/host/connect" method="POST">
                      <Button variant="outline" type="submit">
                        Manage Payout Account
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Connect your Stripe account to receive payouts for your
                      bookings.
                    </p>
                    <form action="/api/host/connect" method="POST">
                      <Button>Connect Stripe Account</Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </>
  );
}
