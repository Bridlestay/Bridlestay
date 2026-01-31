"use client";

import { cn } from "@/lib/utils";
import { Map, Bookmark, Search, Pencil } from "lucide-react";

export type RouteTab = "map" | "saved" | "find" | "create";

interface RoutesNavTabsProps {
  activeTab: RouteTab;
  onTabChange: (tab: RouteTab) => void;
  className?: string;
  hideInCreateMode?: boolean;
}

// Tab order: Map, Find Routes, Saved Routes, Create Route
const tabs: { id: RouteTab; label: string; icon: typeof Map }[] = [
  { id: "map", label: "Map", icon: Map },
  { id: "find", label: "Find Routes", icon: Search },
  { id: "saved", label: "Saved Routes", icon: Bookmark },
  { id: "create", label: "Create Route", icon: Pencil },
];

export function RoutesNavTabs({ activeTab, onTabChange, className, hideInCreateMode }: RoutesNavTabsProps) {
  // Hide tabs when in create mode (only show header in sidebar)
  if (hideInCreateMode) return null;

  return (
    <div className={cn(
      "absolute top-4 right-4 z-30 flex bg-white rounded-lg shadow-lg overflow-hidden border",
      className
    )}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center px-4 py-2 min-w-[80px] transition-all",
              "hover:bg-gray-50 border-b-2",
              isActive 
                ? "border-b-primary text-primary bg-primary/5" 
                : "border-b-transparent text-gray-600"
            )}
          >
            <Icon className={cn(
              "h-5 w-5 mb-1",
              isActive ? "text-primary" : "text-gray-500"
            )} />
            <span className={cn(
              "text-xs font-medium whitespace-nowrap",
              isActive ? "text-primary" : "text-gray-600"
            )}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

