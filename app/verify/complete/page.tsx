"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function VerificationCompletePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "success" | "pending" | "error">("checking");

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const response = await fetch("/api/verification/identity/status");
      const data = await response.json();

      if (data.verified) {
        setStatus("success");
      } else if (data.status === "pending" || data.status === "processing") {
        setStatus("pending");
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Error checking status:", error);
      setStatus("error");
    }
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card>
          <CardContent className="pt-12 pb-12 text-center space-y-6">
            {status === "checking" && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                <h2 className="text-2xl font-bold">Checking Verification Status...</h2>
                <p className="text-muted-foreground">Please wait a moment</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="p-4 bg-green-100 rounded-full w-fit mx-auto">
                  <CheckCircle2 className="h-16 w-16 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Identity Verified!</h2>
                <p className="text-muted-foreground">
                  Your identity has been successfully verified. You now have a verification badge
                  on your profile.
                </p>
                <div className="space-y-2 pt-4">
                  <Button onClick={() => router.push("/profile")} className="w-full" size="lg">
                    View My Profile
                  </Button>
                  <Button
                    onClick={() => router.push("/dashboard")}
                    variant="outline"
                    className="w-full"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </>
            )}

            {status === "pending" && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-orange-600 mx-auto" />
                <h2 className="text-2xl font-bold">Verification in Progress</h2>
                <p className="text-muted-foreground">
                  We're reviewing your submission. This usually takes just a few seconds, but can
                  take up to 24 hours in some cases. We'll email you when it's complete.
                </p>
                <div className="space-y-2 pt-4">
                  <Button onClick={checkVerificationStatus} variant="outline" className="w-full">
                    Refresh Status
                  </Button>
                  <Button onClick={() => router.push("/dashboard")} variant="ghost" className="w-full">
                    Continue to Dashboard
                  </Button>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <div className="p-4 bg-red-100 rounded-full w-fit mx-auto">
                  <AlertCircle className="h-16 w-16 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold">Verification Issue</h2>
                <p className="text-muted-foreground">
                  There was an issue with your verification. This could be due to poor photo
                  quality, expired ID, or document mismatch.
                </p>
                <div className="space-y-2 pt-4">
                  <Button onClick={() => router.push("/verify")} className="w-full" size="lg">
                    Try Again
                  </Button>
                  <Button
                    onClick={() => router.push("/help")}
                    variant="outline"
                    className="w-full"
                  >
                    Get Help
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

