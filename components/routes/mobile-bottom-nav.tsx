"use client";

import { RouteTab } from "./routes-nav-tabs";
import { Map, Search, Bookmark, PenTool, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  activeTab: RouteTab;
  onTabChange: (tab: RouteTab) => void;
  isRecording?: boolean;
  onRecordClick?: () => void;
}

export function MobileBottomNav({ activeTab, onTabChange, isRecording, onRecordClick }: MobileBottomNavProps) {
  // Order: Map, Find, Record (center), Saved, Create
  const leftTabs = [
    { id: "map" as RouteTab, label: "Map", icon: Map },
    { id: "find" as RouteTab, label: "Find", icon: Search },
  ];

  const rightTabs = [
    { id: "saved" as RouteTab, label: "Saved", icon: Bookmark },
    { id: "create" as RouteTab, label: "Create", icon: PenTool },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around h-14">
        {/* Left tabs: Map, Find */}
        {leftTabs.map((tab) => {
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

        {/* Center: Record button */}
        <button
          onClick={onRecordClick}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
            isRecording ? "text-red-500" : "text-gray-500"
          )}
        >
          <div className={cn(
            "h-5 w-5 rounded-full border-2 flex items-center justify-center",
            isRecording ? "border-red-500" : "border-current"
          )}>
            <Circle 
              className={cn(
                "h-2.5 w-2.5 transition-colors",
                isRecording && "fill-red-500 text-red-500"
              )} 
            />
          </div>
          <span className="text-[10px] font-medium">Record</span>
        </button>

        {/* Right tabs: Saved, Create */}
        {rightTabs.map((tab) => {
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

