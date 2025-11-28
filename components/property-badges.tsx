import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Zap } from "lucide-react";

interface PropertyBadgesProps {
  createdAt: string;
  bookingCount?: number;
  hostResponseTimeHours?: number | null;
  size?: "sm" | "md";
  className?: string;
}

export function PropertyBadges({
  createdAt,
  bookingCount = 0,
  hostResponseTimeHours = null,
  size = "md",
  className = "",
}: PropertyBadgesProps) {
  const badges = [];

  // "New" badge - listed in last 30 days
  const daysSinceListed = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceListed <= 30) {
    badges.push({
      label: "New",
      icon: Sparkles,
      variant: "default" as const,
      color: "bg-blue-600",
    });
  }

  // "Popular" badge - 5+ bookings
  if (bookingCount >= 5) {
    badges.push({
      label: "Popular",
      icon: TrendingUp,
      variant: "default" as const,
      color: "bg-purple-600",
    });
  }

  // "Quick Response" badge - responds within 2 hours on average
  if (hostResponseTimeHours !== null && hostResponseTimeHours <= 2) {
    badges.push({
      label: "Quick Response",
      icon: Zap,
      variant: "default" as const,
      color: "bg-green-600",
    });
  }

  if (badges.length === 0) return null;

  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <Badge
            key={badge.label}
            className={`${badge.color} text-white ${textSize} font-medium`}
          >
            <Icon className={`mr-1 ${iconSize}`} />
            {badge.label}
          </Badge>
        );
      })}
    </div>
  );
}
