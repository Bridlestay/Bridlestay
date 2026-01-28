"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { LabelWithInfo, InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Shield } from "lucide-react";
import { AuthHeader } from "@/components/auth-header";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // MFA states
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if MFA is required
      if (data.session) {
        // Get the current assurance level
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (aal && aal.currentLevel !== aal.nextLevel && aal.nextLevel === "aal2") {
          // MFA is required - get the factor
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          
          if (factorsData && factorsData.totp.length > 0) {
            const verifiedFactor = factorsData.totp.find(f => f.status === "verified");
            if (verifiedFactor) {
              setMfaFactorId(verifiedFactor.id);
              setMfaRequired(true);
              setLoading(false);
              return;
            }
          }
        }
      }

      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });

      router.push("/dashboard");
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

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mfaFactorId || mfaCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "Please enter a 6-digit verification code",
      });
      return;
    }

    setMfaVerifying(true);

    try {
      const supabase = createClient();
      
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });

      if (challengeError) throw challengeError;

      // Verify the challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      if (verifyError) throw verifyError;

      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Invalid verification code. Please try again.",
      });
      setMfaCode("");
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your email address",
      });
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We sent you a magic link to sign in.",
      });
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

  // MFA Verification Screen
  if (mfaRequired) {
    return (
      <>
        <AuthHeader />
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 pt-20">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="font-serif text-2xl">Two-Factor Authentication</CardTitle>
              <CardDescription>
                Enter the 6-digit code from your authenticator app to continue
              </CardDescription>
          </CardHeader>
          <form onSubmit={handleMfaVerify}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <LabelWithInfo 
                  htmlFor="mfa-code"
                  info="This is a 6-digit code that changes every 30 seconds. You set this up when you enabled two-factor authentication on your account."
                  asPopover
                >
                  Verification Code
                </LabelWithInfo>
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setMfaCode(value);
                  }}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Open your authenticator app (Google Authenticator, Authy, etc.) and enter the code for padoq
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                disabled={mfaVerifying || mfaCode.length !== 6}
              >
                {mfaVerifying ? "Verifying..." : "Verify"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setMfaRequired(false);
                  setMfaCode("");
                  setMfaFactorId(null);
                }}
              >
                Back to Sign In
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
      </>
    );
  }

  return (
    <>
      <AuthHeader />
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 pt-20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-serif text-3xl">Sign In</CardTitle>
            <CardDescription>
              Sign in to access your padoq account
            </CardDescription>
          </CardHeader>
        <form onSubmit={handleSignIn}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="text-sm">
              <Link
                href="/auth/reset-password"
                className="text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleMagicLink}
                disabled={loading}
              >
                Send Magic Link
              </Button>
              <InfoTooltip 
                content="A magic link is a password-free way to sign in. We'll email you a special link that logs you in automatically when clicked. Great if you've forgotten your password!"
                asPopover
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Don&apos;t have an account?{" "}
              <Link href="/auth/sign-up" className="text-primary hover:underline">
                Sign Up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
    </>
  );
}
