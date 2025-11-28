"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem("bridlestay-cookie-consent");
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("bridlestay-cookie-consent", "accepted");
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem("bridlestay-cookie-consent", "declined");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-in slide-in-from-bottom duration-500">
      <div className="mx-auto max-w-7xl">
        <div className="relative rounded-lg border border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 shadow-lg">
          <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">🍪</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg">We Value Your Privacy</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We use cookies to enhance your browsing experience, analyze site traffic, 
                  and provide personalized content. By clicking "Accept", you consent to our use of cookies. 
                  {" "}
                  <Link 
                    href="/privacy" 
                    className="text-primary hover:underline font-medium"
                  >
                    Learn more
                  </Link>
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button
                  onClick={acceptCookies}
                  className="w-full sm:w-auto"
                  size="default"
                >
                  Accept All
                </Button>
                <Button
                  onClick={declineCookies}
                  variant="outline"
                  className="w-full sm:w-auto"
                  size="default"
                >
                  Decline
                </Button>
              </div>

              {/* Close button (desktop) */}
              <button
                onClick={declineCookies}
                className="absolute top-4 right-4 hidden md:block text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

