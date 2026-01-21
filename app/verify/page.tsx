import { Metadata } from "next";
import { Header } from "@/components/header";
import { IdentityVerificationCard } from "@/components/verification/identity-verification-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, FileCheck, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Verify Your Identity | padoq",
  description: "Verify your identity to build trust and unlock full platform features",
};

export default function VerifyPage() {
  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-serif font-bold">Verify Your Identity</h1>
            <p className="text-muted-foreground">
              Help us keep padoq safe and trustworthy for everyone
            </p>
          </div>

          {/* Main verification card */}
          <IdentityVerificationCard />

          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle>How Verification Works</CardTitle>
              <CardDescription>
                Our verification process is quick, secure, and powered by Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <FileCheck className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="font-semibold">1. Upload Your ID</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-10">
                  Take a photo of your passport, driver's license, or government ID
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="font-semibold">2. Take a Selfie</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-10">
                  Complete a quick liveness check to confirm it's really you
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="font-semibold">3. Instant Verification</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-10">
                  Our system verifies your identity in seconds using AI
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Lock className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="font-semibold">4. Secure Storage</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-10">
                  Your data is encrypted and never shared publicly
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy notice */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Your Privacy Matters
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  • Your ID information is encrypted and securely stored by Stripe, our payment
                  processor
                </p>
                <p>• We never share your ID details with hosts, guests, or third parties</p>
                <p>
                  • Only a verification badge appears on your profile - no personal ID information
                </p>
                <p>
                  • You can request deletion of your verification data at any time by contacting
                  support
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

