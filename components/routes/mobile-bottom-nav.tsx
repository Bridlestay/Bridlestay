"use client";

import { RouteTab } from "./routes-nav-tabs";
import { Map, Search, Bookmark, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  activeTab: RouteTab;
  onTabChange: (tab: RouteTab) => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const tabs = [
    { id: "map" as RouteTab, label: "Map", icon: Map },
    { id: "find" as RouteTab, label: "Find", icon: Search },
    { id: "saved" as RouteTab, label: "Saved", icon: Bookmark },
    { id: "create" as RouteTab, label: "Create", icon: PenTool },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                isActive ? "text-primary" : "text-gray-500"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

