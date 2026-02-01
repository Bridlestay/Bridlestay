"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, Layers, Navigation, Settings } from "lucide-react";
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
      label: "Map Settings",
      onClick: () => {
        onOpenSettings();
        setIsOpen(false);
      },
      color: "bg-white text-gray-700 hover:bg-gray-50",
    },
    {
      icon: Navigation,
      label: "My Location",
      onClick: () => {
        onLocateMe();
        setIsOpen(false);
      },
      color: "bg-white text-gray-700 hover:bg-gray-50",
    },
  ];

  return (
    <div className="fixed bottom-20 right-4 z-40 md:hidden">
      {/* Menu items - appear when FAB is open */}
      <div
        className={cn(
          "absolute bottom-16 right-0 flex flex-col gap-3 items-end transition-all duration-300",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-2"
              style={{
                transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
              }}
            >
              <span className="px-3 py-1.5 bg-white rounded-full shadow-lg text-sm font-medium text-gray-700">
                {item.label}
              </span>
              <Button
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-full shadow-lg transition-transform",
                  item.color,
                  isOpen ? "scale-100" : "scale-0"
                )}
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
                }}
                onClick={item.onClick}
              >
                <Icon className="h-5 w-5" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Main FAB button */}
      <Button
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-all duration-300",
          isOpen 
            ? "bg-red-500 hover:bg-red-600 rotate-0" 
            : "bg-primary hover:bg-primary/90 rotate-0"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="relative h-6 w-6">
          <Plus
            className={cn(
              "h-6 w-6 absolute inset-0 transition-all duration-300",
              isOpen ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
            )}
          />
          <X
            className={cn(
              "h-6 w-6 absolute inset-0 transition-all duration-300",
              isOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
            )}
          />
        </div>
      </Button>
    </div>
  );
}

