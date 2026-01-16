"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string | React.ReactNode;
  title?: string;
  className?: string;
  iconClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
  /** Use popover instead of tooltip for longer content or mobile-friendly click interaction */
  asPopover?: boolean;
}

/**
 * InfoTooltip - A small "i" icon that shows helpful information
 * 
 * Use for:
 * - Form field explanations
 * - Feature descriptions
 * - Help text for less tech-savvy users
 * 
 * Use `asPopover={true}` for longer content or when you need click-to-dismiss on mobile
 */
export function InfoTooltip({
  content,
  title,
  className,
  iconClassName,
  side = "top",
  asPopover = false,
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  // For longer content, use a popover (click to open/close)
  if (asPopover) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full w-5 h-5 bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50",
              className
            )}
            aria-label="More information"
          >
            <Info className={cn("h-3.5 w-3.5", iconClassName)} />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side={side} 
          className="max-w-xs text-sm"
          align="center"
        >
          <div className="space-y-2">
            {title && (
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">{title}</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-2"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="text-muted-foreground leading-relaxed">
              {content}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // For short content, use a simple tooltip (hover)
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full w-5 h-5 bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50",
              className
            )}
            aria-label="More information"
          >
            <Info className={cn("h-3.5 w-3.5", iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {title && <p className="font-semibold mb-1">{title}</p>}
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * LabelWithInfo - A label with an integrated info tooltip
 * 
 * Use this as a drop-in replacement for Label when you need help text
 */
interface LabelWithInfoProps {
  htmlFor?: string;
  children: React.ReactNode;
  info: string | React.ReactNode;
  infoTitle?: string;
  required?: boolean;
  className?: string;
  asPopover?: boolean;
}

export function LabelWithInfo({
  htmlFor,
  children,
  info,
  infoTitle,
  required,
  className,
  asPopover = false,
}: LabelWithInfoProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {children}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <InfoTooltip content={info} title={infoTitle} asPopover={asPopover} />
    </div>
  );
}





