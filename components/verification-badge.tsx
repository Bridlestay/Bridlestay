import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface VerificationBadgeProps {
  verified: boolean;
  type?: "user" | "property";
  size?: "sm" | "md" | "lg";
}

export function VerificationBadge({ verified, type = "property", size = "md" }: VerificationBadgeProps) {
  if (!verified) return null;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Badge className={`bg-blue-600 text-white ${sizeClasses[size]}`}>
      <CheckCircle2 className={`mr-1 ${iconSizes[size]}`} />
      Verified {type === "user" ? "Account" : "Property"}
    </Badge>
  );
}



