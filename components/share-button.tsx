"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy, Facebook, Twitter, Mail, MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  propertyId: string;
  propertyName: string;
  variant?: "default" | "card";
}

// Track share event
async function trackShare(propertyId: string, platform: string) {
  try {
    await fetch(`/api/properties/${propertyId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
  } catch (error) {
    // Don't block UX if tracking fails
    console.error("Failed to track share:", error);
  }
}

export function ShareButton({ propertyId, propertyName, variant = "default" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/property/${propertyId}`;
    }
    return "";
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackShare(propertyId, "copy_link");
      toast({
        title: "Link copied!",
        description: "Property link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Please try again or copy the URL manually.",
      });
    }
  };

  const handleShare = async (platform: string) => {
    const url = getShareUrl();
    const text = `Check out ${propertyName} on padoq!`;

    // Track the share
    trackShare(propertyId, platform);

    switch (platform) {
      case "native":
        if (navigator.share) {
          try {
            await navigator.share({
              title: propertyName,
              text: text,
              url: url,
            });
          } catch (err) {
            // User cancelled or error
          }
        }
        break;
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          "_blank",
          "width=600,height=400"
        );
        break;
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
          "_blank",
          "width=600,height=400"
        );
        break;
      case "whatsapp":
        window.open(
          `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
          "_blank"
        );
        break;
      case "email":
        window.location.href = `mailto:?subject=${encodeURIComponent(propertyName)}&body=${encodeURIComponent(text + "\n\n" + url)}`;
        break;
    }
  };

  // Use native share API if available on mobile
  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={handleClick}>
        <Button
          variant={variant === "card" ? "ghost" : "outline"}
          size="icon"
          className={
            variant === "card"
              ? "h-9 w-9 rounded-full bg-white/70 hover:bg-white shadow-md transition-all duration-200"
              : "h-10 w-10 rounded-full border-2"
          }
        >
          <Share2 className={variant === "card" ? "h-5 w-5 text-gray-600" : "h-5 w-5"} />
          <span className="sr-only">Share property</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {hasNativeShare && (
          <DropdownMenuItem onClick={() => handleShare("native")}>
            <Share2 className="h-4 w-4 mr-2" />
            Share...
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2 text-primary" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy link
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("facebook")}>
          <Facebook className="h-4 w-4 mr-2" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("twitter")}>
          <Twitter className="h-4 w-4 mr-2" />
          Twitter / X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("whatsapp")}>
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("email")}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

