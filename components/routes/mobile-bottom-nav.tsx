"use client";

import { RouteTab } from "./routes-nav-tabs";
import { Search, PenTool, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  activeTab: RouteTab;
  onTabChange: (tab: RouteTab) => void;
  isRecording?: boolean;
  onRecordClick?: () => void;
  visible?: boolean;
}

export function MobileBottomNav({ activeTab, onTabChange, isRecording, onRecordClick, visible = true }: MobileBottomNavProps) {
  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden transition-transform duration-300 ease-in-out",
      visible ? "translate-y-0" : "translate-y-full"
    )}>
      <div className="flex items-center justify-around h-14">
        {/* Find */}
        <button
          onClick={() => onTabChange("find")}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
            activeTab === "find" ? "text-primary" : "text-gray-500"
          )}
        >
          <Search className={cn("h-5 w-5", activeTab === "find" && "stroke-[2.5px]")} />
          <span className="text-[10px] font-medium">Find</span>
        </button>

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

        {/* Create */}
        <button
          onClick={() => onTabChange("create")}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
            activeTab === "create" ? "text-primary" : "text-gray-500"
          )}
        >
          <PenTool className={cn("h-5 w-5", activeTab === "create" && "stroke-[2.5px]")} />
          <span className="text-[10px] font-medium">Create</span>
        </button>
      </div>
    </nav>
  );
}
