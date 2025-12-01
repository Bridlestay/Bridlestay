"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Shield, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function IdentityVerificationCard() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const response = await fetch("/api/verification/identity/status");
      const data = await response.json();
      setVerificationStatus(data);
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setChecking(false);
    }
  };

  const handleStartVerification = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/verification/identity/create-session", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start verification");
      }

      const { client_secret } = await response.json();

      // Load Stripe
      const { loadStripe } = await import("@stripe/stripe-js");
      const stripe = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
      );

      if (!stripe) {
        throw new Error("Failed to load Stripe");
      }

      // Start verification flow
      const { error } = await stripe.verifyIdentity(client_secret);

      if (error) {
        throw new Error(error.message);
      }

      // Check status after completion
      await checkVerificationStatus();

      toast({
        title: "Verification submitted",
        description: "We're processing your verification. This usually takes a few seconds.",
      });
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Already verified
  if (verificationStatus?.verified) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Identity Verified</CardTitle>
                <CardDescription>
                  Your identity was verified on{" "}
                  {new Date(verificationStatus.verified_at).toLocaleDateString()}
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-green-600">
              <Shield className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your government-issued ID has been verified. This badge will be displayed on your
            profile to help build trust with hosts and guests.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Pending/Processing
  if (
    verificationStatus?.status === "pending" ||
    verificationStatus?.status === "processing"
  ) {
    return (
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 text-orange-600 animate-spin" />
            <div>
              <CardTitle className="text-lg">Verification in Progress</CardTitle>
              <CardDescription>
                We're reviewing your submission
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your verification is being processed. This usually takes a few seconds, but can take
              up to 24 hours in some cases.
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={checkVerificationStatus} className="w-full">
            Refresh Status
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not started or failed - show verification option
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Verify Your Identity</CardTitle>
            <CardDescription className="mt-1">
              Confirm your identity to build trust and unlock full platform features
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Why verify?</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Required to publish property listings</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Increases booking acceptance rate</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Adds verification badge to your profile</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Builds trust in the community</span>
            </li>
          </ul>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Secure & Private:</strong> We use Stripe Identity to verify your ID. Your
            information is encrypted and never shared with hosts or guests.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button
            onClick={handleStartVerification}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening verification...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Verify My Identity
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Takes 2-3 minutes • Passport, Driver's License, or ID Card required
          </p>
        </div>

        {verificationStatus?.status === "failed" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Previous verification attempt failed. Please try again with a valid government-issued
              ID.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

