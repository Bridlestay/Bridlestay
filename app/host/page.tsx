"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { CheckCircle2, Coins, Shield, Users, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function HostPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        setUser(userData);
      }
      setLoading(false);
    };

    getUser();
  }, []);

  const handleGetStarted = async () => {
    // If not logged in, redirect to sign up
    if (!user) {
      router.push("/auth/sign-up");
      return;
    }

    // If already a host or admin, go to new property page
    if (user.role === "host" || user.role === "admin") {
      router.push("/host/property/new");
      return;
    }

    // If guest, upgrade to host first
    setUpgrading(true);
    try {
      const response = await fetch("/api/host/become", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upgrade account");
      }

      toast({
        title: "Welcome to hosting!",
        description: "Your account has been upgraded to a host account.",
      });

      // Refresh the page to update the header and user state
      router.refresh();
      
      // Wait a moment then redirect to new property page
      setTimeout(() => {
        router.push("/host/property/new");
      }, 1000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      setUpgrading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-900 via-green-800 to-green-700 text-white py-12 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-serif text-3xl md:text-6xl font-bold mb-4 md:mb-6">
            Share Your Property
            <br />
            with Equestrians
          </h1>
          <p className="text-lg md:text-2xl mb-6 md:mb-8 opacity-90">
            Earn extra income while welcoming horse lovers to your countryside property
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="text-lg px-8"
            onClick={handleGetStarted}
            disabled={upgrading || loading}
          >
            {upgrading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Setting up your host account...
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-2xl md:text-4xl font-bold text-center mb-8 md:mb-12">
            Why Host with padoq?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Coins className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Earn Extra Income</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  You keep 97.5% of the booking price. Low platform fees mean more
                  money in your pocket. Automatic payouts via Stripe.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Protected Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Payments are held securely until you accept. Full control over
                  bookings with 24/7 platform support.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Vetted Community</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Connect with passionate equestrians. Build lasting relationships.
                  Review system ensures quality guests.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-10 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-2xl md:text-4xl font-bold text-center mb-8 md:mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Create Your Listing",
                description:
                  "Add photos, describe your facilities, and set your nightly rate",
              },
              {
                step: "2",
                title: "Connect Stripe",
                description:
                  "Set up secure payouts with Stripe Connect (takes 5 minutes)",
              },
              {
                step: "3",
                title: "Review Bookings",
                description:
                  "Accept or decline booking requests from guests",
              },
              {
                step: "4",
                title: "Get Paid",
                description:
                  "Receive automatic payouts after guests check in",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-xl mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Insurance Notice */}
      <section className="py-12 bg-amber-50 border-y border-amber-200">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-xl text-amber-900 mb-2">
                  Important: Insurance Responsibility
                </h3>
                <p className="text-amber-800 mb-3">
                  padoq is a booking platform and does not provide insurance coverage for hosts or guests. 
                  As a host, <strong>you are responsible for ensuring you have appropriate insurance</strong> for:
                </p>
                <ul className="list-disc list-inside text-amber-800 space-y-1 mb-3">
                  <li>Public liability insurance for visitors to your property</li>
                  <li>Property and contents insurance that covers short-term letting</li>
                  <li>Equine-specific liability if you provide horse facilities</li>
                  <li>Any other coverage required for your specific offering</li>
                </ul>
                <p className="text-amber-800 text-sm">
                  We strongly recommend consulting with an insurance professional to ensure you have adequate coverage 
                  before accepting bookings. Guests are also advised to have their own travel and horse insurance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fee Structure */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-center mb-8">
              Transparent Pricing
            </h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-2xl">
                  You Keep 97.5% of Each Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold">Just 2.5% Host Fee</p>
                      <p className="text-muted-foreground">
                        Our low platform fee helps us maintain the marketplace while
                        maximizing your earnings
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold">VAT Handled for You</p>
                      <p className="text-muted-foreground">
                        We handle all VAT calculations on service fees
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold">No Upfront Costs</p>
                      <p className="text-muted-foreground">
                        Free to list your property. Only pay when you get bookings
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">
                    <span className="font-semibold">Example:</span> £200 booking →
                    You receive £195 (minus £5 platform fee and VAT)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 md:py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-2xl md:text-4xl font-bold mb-4 md:mb-6">
            Ready to Start Hosting?
          </h2>
          <p className="text-lg md:text-xl mb-6 md:mb-8 opacity-90">
            Join padoq today and start earning from your property
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="text-lg px-8"
            onClick={handleGetStarted}
            disabled={upgrading || loading}
          >
            {upgrading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Setting up...
              </>
            ) : (
              "Create Your Listing"
            )}
          </Button>
        </div>
      </section>
    </main>
    </>
  );
}

