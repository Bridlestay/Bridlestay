"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { LabelWithInfo } from "@/components/ui/info-tooltip";
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
import { validateUsername } from "@/lib/moderation";
import { AuthHeader } from "@/components/auth-header";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate username/name first
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

      const supabase = createClient();

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create user profile (always as guest)
        const { error: profileError } = await supabase.from("users").insert({
          id: authData.user.id,
          name,
          email,
          role: "guest",
        });

        if (profileError) throw profileError;

        // Send welcome email (non-blocking)
        try {
          await fetch('/api/webhooks/user-signup', {
            method: 'POST',
          });
        } catch (emailError) {
          // Don't fail signup if welcome email fails
          console.error('Failed to send welcome email:', emailError);
        }
      }

      toast({
        title: "Welcome to padoq!",
        description: "Please check your email to verify your account.",
      });

      router.push("/auth/sign-in");
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

  return (
    <>
      <AuthHeader />
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 pt-20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-serif text-3xl">Sign Up</CardTitle>
            <CardDescription>
              Create your padoq account to get started
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignUp}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <LabelWithInfo 
                htmlFor="name" 
                info="This is how other users will see you on padoq. You can use your real name or a nickname."
                required
              >
                Full Name
              </LabelWithInfo>
              <Input
                id="name"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <LabelWithInfo 
                htmlFor="email" 
                info="We'll send a verification email to this address. Make sure you have access to it."
                required
              >
                Email
              </LabelWithInfo>
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
              <LabelWithInfo 
                htmlFor="password" 
                info="Choose a strong password with at least 6 characters. We recommend using a mix of letters, numbers, and symbols."
                required
              >
                Password
              </LabelWithInfo>
              <PasswordInput
                id="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link href="/auth/sign-in" className="text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
    </>
  );
}


