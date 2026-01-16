"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Impersonation Handler Page
 * 
 * This page handles admin impersonation by:
 * 1. Parsing the token from the magic link
 * 2. Signing out any existing session
 * 3. Using verifyOtp to authenticate as the target user
 * 4. Redirecting to the dashboard
 */

function ImpersonateHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Preparing impersonation...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleImpersonation = async () => {
      const magicLink = searchParams.get("magicLink");
      
      if (!magicLink) {
        setError("Missing magic link parameter");
        return;
      }

      try {
        const supabase = createClient();
        const decodedLink = decodeURIComponent(magicLink);
        
        // Parse the token from the magic link URL
        // Format: https://xxx.supabase.co/auth/v1/verify?token=TOKEN&type=magiclink&redirect_to=...
        const url = new URL(decodedLink);
        const token = url.searchParams.get("token");
        const type = url.searchParams.get("type");
        
        if (!token) {
          setError("Invalid magic link - no token found");
          return;
        }

        // Step 1: Sign out any existing session
        setStatus("Signing out current session...");
        await supabase.auth.signOut();
        
        // Small delay to ensure session is cleared
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 2: Verify the OTP token to create a new session
        setStatus("Authenticating as user...");
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: (type as any) || "magiclink",
        });

        if (verifyError) {
          console.error("OTP verification error:", verifyError);
          setError(verifyError.message);
          return;
        }

        if (!data.session) {
          setError("No session returned from authentication");
          return;
        }

        // Step 3: Success! Redirect to dashboard
        setStatus("Success! Redirecting to dashboard...");
        
        // Use window.location for a full page reload to ensure fresh state
        window.location.href = "/dashboard";
      } catch (err: any) {
        console.error("Impersonation error:", err);
        setError(err.message || "Impersonation failed");
      }
    };

    handleImpersonation();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <div className="text-red-600 text-xl font-semibold">
              Impersonation Failed
            </div>
            <p className="text-muted-foreground max-w-md">{error}</p>
            <a 
              href="/admin/dashboard" 
              className="text-primary hover:underline block mt-4"
            >
              Return to Admin Dashboard
            </a>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">{status}</p>
            <p className="text-xs text-muted-foreground">
              You will be logged in as the target user...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <ImpersonateHandler />
    </Suspense>
  );
}

