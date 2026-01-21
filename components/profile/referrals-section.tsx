"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, 
  Gift, 
  Users, 
  Sparkles,
  Check,
  Share2,
  Loader2,
  Percent,
  Clock,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralsSectionProps {
  userId: string;
  userName: string;
}

interface ReferralCode {
  id: string;
  code: string;
  benefit_type: string;
  benefit_value: number;
  benefit_duration_months: number | null;
  benefit_uses_limit: number | null;
  uses_count: number;
  max_uses: number | null;
}

interface ReferralRedemption {
  id: string;
  code: string;
  status: string;
  benefit_expires_at: string | null;
  benefit_uses_remaining: number | null;
  total_savings_pennies: number;
  bookings_with_benefit: number;
  created_at: string;
}

interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  total_earnings_pennies: number;
}

export function ReferralsSection({ userId, userName }: ReferralsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [redemption, setRedemption] = useState<ReferralRedemption | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralData();
    fetchPromotionMessage();
  }, [userId]);

  const fetchPromotionMessage = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "user_referral_config")
        .single();
      
      if (data?.value?.promotion_active && data?.value?.promotion_message) {
        setPromotionMessage(data.value.promotion_message);
      }
    } catch (error) {
      // Ignore - promotion message is optional
    }
  };

  const fetchReferralData = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Fetch user's referral code
      const { data: codeData } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("owner_user_id", userId)
        .eq("code_type", "user_referral")
        .eq("is_active", true)
        .single();

      // Fetch user's active redemption (if they used a code)
      const { data: redemptionData } = await supabase
        .from("referral_redemptions")
        .select(`
          *,
          referral_codes(code)
        `)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      // Fetch referral stats
      const { data: referralsData } = await supabase
        .from("referral_redemptions")
        .select("id, status")
        .eq("referrer_user_id", userId);

      const statsData: ReferralStats = {
        total_referrals: referralsData?.length || 0,
        successful_referrals: referralsData?.filter(r => r.status === "active").length || 0,
        total_earnings_pennies: 0, // Would need to calculate from rewards
      };

      setReferralCode(codeData);
      setRedemption(redemptionData ? {
        ...redemptionData,
        code: redemptionData.referral_codes?.code
      } : null);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/referrals/generate", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setReferralCode(data.code);
        toast({
          title: "Referral code generated!",
          description: `Your code is: ${data.code.code}`,
        });
      } else {
        throw new Error(data.error || "Failed to generate code");
      }
    } catch (error: any) {
      console.error("Referral code error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate referral code",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  const shareCode = async () => {
    if (referralCode && navigator.share) {
      try {
        await navigator.share({
          title: "Join padoq!",
          text: `Use my referral code ${referralCode.code} to get discounts on padoq - the UK's complete horse app!`,
          url: `https://padoq.com/auth/sign-up?ref=${referralCode.code}`,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    }
  };

  const getBenefitDescription = (type: string, value: number, duration?: number | null, uses?: number | null) => {
    let benefit = "";
    if (type === "guest_fee_discount") {
      benefit = `${value}% off guest fees`;
    } else if (type === "host_fee_waiver") {
      benefit = `${value}% off host fees`;
    } else if (type === "fixed_credit") {
      benefit = `£${(value / 100).toFixed(2)} credit`;
    }

    if (duration) {
      benefit += ` for ${duration} month${duration > 1 ? "s" : ""}`;
    }
    if (uses) {
      benefit += ` (${uses} booking${uses > 1 ? "s" : ""})`;
    }

    return benefit;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Your Referral Code */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Your Referral Code
          </CardTitle>
          <CardDescription>
            Share your code with friends and earn rewards when they sign up!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralCode ? (
            <div className="space-y-4">
              {/* Code Display */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Input
                    value={referralCode.code}
                    readOnly
                    className="text-center text-2xl font-bold tracking-wider bg-white pr-24"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyCode}
                      className="h-8 w-8 p-0"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    {navigator.share && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={shareCode}
                        className="h-8 w-8 p-0"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* What friends get */}
              <div className="bg-white rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  What your friends get:
                </h4>
                <p className="text-sm text-muted-foreground">
                  {getBenefitDescription(
                    referralCode.benefit_type,
                    referralCode.benefit_value,
                    referralCode.benefit_duration_months,
                    referralCode.benefit_uses_limit
                  )}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold">{referralCode.uses_count}</p>
                  <p className="text-sm text-muted-foreground">Friends joined</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats?.successful_referrals || 0}</p>
                  <p className="text-sm text-muted-foreground">Active referrals</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-4">
              {promotionMessage && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                  <p className="text-amber-800 font-medium">{promotionMessage}</p>
                </div>
              )}
              <Users className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                Generate your unique referral code to start inviting friends!
              </p>
              <Button onClick={generateReferralCode} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="mr-2 h-4 w-4" />
                )}
                Generate My Code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Benefits */}
      {redemption && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Your Active Benefits
            </CardTitle>
            <CardDescription>
              You're using referral code: <strong>{redemption.code}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">Total Savings</span>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  £{(redemption.total_savings_pennies / 100).toFixed(2)}
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Gift className="h-4 w-4" />
                  <span className="font-medium">Bookings Used</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {redemption.bookings_with_benefit}
                  {redemption.benefit_uses_remaining !== null && (
                    <span className="text-sm font-normal"> / {redemption.bookings_with_benefit + redemption.benefit_uses_remaining}</span>
                  )}
                </p>
              </div>

              {redemption.benefit_expires_at && (
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-700 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Expires</span>
                  </div>
                  <p className="text-lg font-bold text-amber-700">
                    {new Date(redemption.benefit_expires_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Referrals Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h4 className="font-medium mb-2">Share Your Code</h4>
              <p className="text-sm text-muted-foreground">
                Send your unique referral code to friends who love horses
              </p>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h4 className="font-medium mb-2">They Sign Up</h4>
              <p className="text-sm text-muted-foreground">
                When they join padoq using your code, they get discounts
              </p>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <h4 className="font-medium mb-2">You Both Win</h4>
              <p className="text-sm text-muted-foreground">
                You earn rewards when your friends make their first booking
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

