"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="pt-12 pb-12 text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-destructive/10 p-6">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
          </div>
          
          {/* Message */}
          <h1 className="text-3xl font-serif font-bold mb-4">
            Something Went Wrong
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            We encountered an unexpected error. Don't worry, our team has been notified 
            and we're working on it.
          </p>

          {/* Error Details (for debugging) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-8 p-4 bg-muted rounded-lg text-left max-w-lg mx-auto">
              <p className="font-mono text-xs text-muted-foreground break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={reset} size="lg">
              <RefreshCcw className="mr-2 h-5 w-5" />
              Try Again
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">
                <Home className="mr-2 h-5 w-5" />
                Go Home
              </Link>
            </Button>
          </div>

          {/* Support Link */}
          <div className="mt-12 pt-8 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Still having issues?
            </p>
            <Link href="/feedback" className="text-primary hover:underline text-sm">
              Contact Support →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

