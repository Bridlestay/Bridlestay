"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, X, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MessagingSafetyBannerProps {
  userId: string;
  onDismiss?: () => void;
  variant?: 'full' | 'compact';
}

/**
 * One-time, dismissible safety banner for messaging
 * 
 * Purpose:
 * - Prevent off-platform payment attempts
 * - Set expectations before problems arise
 * - Safety-focused, not rule-focused messaging
 */
export function MessagingSafetyBanner({ 
  userId, 
  onDismiss,
  variant = 'full' 
}: MessagingSafetyBannerProps) {
  const [dismissed, setDismissed] = useState(true); // Default hidden until we check
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBannerStatus();
  }, [userId]);

  const checkBannerStatus = async () => {
    const supabase = createClient();
    
    const { data } = await supabase
      .from("users")
      .select("messaging_banner_dismissed")
      .eq("id", userId)
      .single();

    setDismissed(data?.messaging_banner_dismissed === true);
    setLoading(false);
  };

  const handleDismiss = async () => {
    const supabase = createClient();
    
    // Update user record to mark banner as dismissed
    await supabase
      .from("users")
      .update({ 
        messaging_banner_dismissed: true,
        messaging_banner_dismissed_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setDismissed(true);
    onDismiss?.();
  };

  // Don't show if loading or already dismissed
  if (loading || dismissed) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" />
        <p className="flex-1 text-blue-800">
          Keep payments on Cantra to stay protected by our refund and support policies.
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Alert className="bg-blue-50 border-blue-200 mb-4">
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <AlertDescription className="text-blue-800">
            <p className="font-medium mb-1">For your protection</p>
            <p className="text-sm">
              Payments made through Cantra are protected by our refund policy and customer support. 
              We can't help with issues if payments happen outside the platform.
            </p>
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-100 -mt-1 -mr-2"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}

/**
 * Message blocked banner (shown when a message is blocked)
 */
export function MessageBlockedBanner({ 
  reason,
  onClose 
}: { 
  reason: string;
  onClose?: () => void;
}) {
  return (
    <Alert className="bg-amber-50 border-amber-200 mb-4">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <AlertDescription className="text-amber-800">
            <p className="font-medium mb-1">Message not sent</p>
            <p className="text-sm">{reason}</p>
          </AlertDescription>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-100 -mt-1 -mr-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}

/**
 * First message safety tip (shown with first message in a conversation)
 */
export function FirstMessageTip() {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-xs text-muted-foreground mb-3">
      <Info className="h-3 w-3 flex-shrink-0" />
      <span>
        Always book through Cantra to ensure you're protected by our support and refund policies.
      </span>
    </div>
  );
}

