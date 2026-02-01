"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, Layers, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileFabMenuProps {
  onOpenSettings: () => void;
  onLocateMe: () => void;
}

export function MobileFabMenu({ onOpenSettings, onLocateMe }: MobileFabMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      icon: Layers,
      onClick: () => {
        onOpenSettings();
        setIsOpen(false);
      },
    },
    {
      icon: Navigation,
      onClick: () => {
        onLocateMe();
        setIsOpen(false);
      },
    },
  ];

  return (
    <div className="fixed bottom-20 right-4 z-40 md:hidden">
      {/* Menu items - appear when FAB is open (icons only, no text) */}
      <div
        className={cn(
          "absolute bottom-14 right-0.5 flex flex-col gap-2.5 items-center transition-all duration-300",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Button
              key={index}
              size="icon"
              className={cn(
                "h-10 w-10 rounded-full shadow-lg transition-all bg-white text-gray-700 hover:bg-gray-50",
                isOpen ? "scale-100" : "scale-0"
              )}
              style={{
                transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
              }}
              onClick={item.onClick}
            >
              <Icon className="h-5 w-5" />
            </Button>
          );
        })}
      </div>

      {/* Main FAB button - smaller and properly centered icon */}
      <Button
        size="icon"
        className={cn(
          "h-11 w-11 rounded-full shadow-xl transition-all duration-300",
          isOpen 
            ? "bg-red-500 hover:bg-red-600" 
            : "bg-primary hover:bg-primary/90"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Plus
          className={cn(
            "h-5 w-5 transition-transform duration-300",
            isOpen && "rotate-45"
          )}
        />
      </Button>
    </div>
  );
}

