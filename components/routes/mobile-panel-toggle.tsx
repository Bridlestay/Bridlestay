"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Map, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobilePanelToggleProps {
  mode: "map" | "options";
  onClick: () => void;
  scrollContainerRef?: React.RefObject<HTMLElement>;
  alwaysVisible?: boolean;
}

export function MobilePanelToggle({
  mode,
  onClick,
  scrollContainerRef,
  alwaysVisible = false,
}: MobilePanelToggleProps) {
  const [isVisible, setIsVisible] = useState(alwaysVisible);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (alwaysVisible) {
      setIsVisible(true);
      return;
    }

    const container = scrollContainerRef?.current;
    if (!container) {
      // If no scroll container, show after a brief delay
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    }

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      // Show button after scrolling 50px or if at bottom
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
      
      if (scrollTop > 50 || isAtBottom) {
        if (!hasScrolled) {
          setHasScrolled(true);
          setIsVisible(true);
        }
      }
    };

    // Check initial state
    handleScroll();
    
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef, alwaysVisible, hasScrolled]);

  return (
    <div
      className={cn(
        "flex justify-center transition-all duration-300 ease-out",
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <Button
        onClick={onClick}
        className="rounded-full px-5 py-2 h-9 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium shadow-lg flex items-center gap-2 transition-transform active:scale-95"
      >
        {mode === "map" ? (
          <>
            Map
            <Map className="h-4 w-4" />
          </>
        ) : (
          <>
            Options
            <SlidersHorizontal className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}

