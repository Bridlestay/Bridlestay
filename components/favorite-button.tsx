"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  propertyId: string;
  variant?: "card" | "detail";
  showCount?: boolean;
}

export function FavoriteButton({
  propertyId,
  variant = "card",
  showCount = false,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkFavoriteStatus();
    getFavoriteCount();
  }, [propertyId]);

  const checkFavoriteStatus = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsAuthenticated(false);
      return;
    }

    setIsAuthenticated(true);

    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("property_id", propertyId)
      .single();

    setIsFavorited(!!data);
  };

  const getFavoriteCount = async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("property_id", propertyId);

    setFavoriteCount(count || 0);
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorites",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });

      if (!response.ok) throw new Error("Failed to toggle favorite");

      const data = await response.json();
      setIsFavorited(data.favorited);
      setFavoriteCount((prev) => (data.favorited ? prev + 1 : prev - 1));

      toast({
        title: data.favorited ? "Added to favorites" : "Removed from favorites",
        description: data.favorited
          ? "You can view your favorites anytime"
          : "Property removed from your wishlist",
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

  if (variant === "detail") {
    return (
      <Button
        variant="outline"
        size="lg"
        onClick={handleToggle}
        disabled={loading}
        className="gap-2"
      >
        <Heart
          className={cn(
            "h-5 w-5",
            isFavorited && "fill-red-500 text-red-500"
          )}
        />
        {isFavorited ? "Saved" : "Save"}
        {showCount && favoriteCount > 0 && (
          <span className="text-muted-foreground">({favoriteCount})</span>
        )}
      </Button>
    );
  }

  // Card variant - icon button
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "h-9 w-9 rounded-full bg-white/70 hover:bg-white shadow-md",
        "transition-all duration-200",
        isFavorited && "bg-white hover:scale-110"
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-colors",
          isFavorited ? "fill-red-500 text-red-500" : "text-gray-600"
        )}
      />
    </Button>
  );
}



