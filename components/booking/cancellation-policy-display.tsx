"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Info, 
  Calendar, 
  Clock, 
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { differenceInDays, format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CancellationPolicyDisplayProps {
  policyName: "flexible" | "standard" | "strict";
  checkInDate?: Date;
  showFullDetails?: boolean;
  variant?: "compact" | "full";
}

interface PolicyRule {
  days_before: number;
  refund_percent: number;
  note?: string;
}

interface PolicyData {
  policy_name: string;
  display_name: string;
  description: string;
  guest_friendly_summary: string;
  rules: PolicyRule[];
}

export function CancellationPolicyDisplay({ 
  policyName, 
  checkInDate,
  showFullDetails = false,
  variant = "compact"
}: CancellationPolicyDisplayProps) {
  const [policyData, setPolicyData] = useState<PolicyData | null>(null);
  const [isExpanded, setIsExpanded] = useState(showFullDetails);

  useEffect(() => {
    loadPolicy();
  }, [policyName]);

  const loadPolicy = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("cancellation_policy_rules")
      .select("*")
      .eq("policy_name", policyName)
      .single();

    if (data) {
      setPolicyData(data);
    }
  };

  // Calculate current refund status if check-in date provided
  const getCurrentRefundStatus = () => {
    if (!checkInDate || !policyData) return null;

    const daysUntilCheckin = differenceInDays(checkInDate, new Date());
    const rules = policyData.rules as PolicyRule[];
    
    // Sort by days_before descending
    const sortedRules = [...rules].sort((a, b) => b.days_before - a.days_before);
    
    let applicableRule = sortedRules[sortedRules.length - 1]; // Default to last rule
    let nextThreshold: PolicyRule | null = null;

    for (let i = 0; i < sortedRules.length; i++) {
      if (daysUntilCheckin >= sortedRules[i].days_before) {
        applicableRule = sortedRules[i];
        nextThreshold = i > 0 ? sortedRules[i - 1] : null;
        break;
      }
    }

    return {
      daysUntilCheckin,
      currentRefundPercent: applicableRule.refund_percent,
      nextThreshold,
    };
  };

  const refundStatus = getCurrentRefundStatus();

  if (!policyData) {
    return null;
  }

  const getPolicyBadgeColor = () => {
    switch (policyName) {
      case "flexible":
        return "bg-green-100 text-green-800 border-green-200";
      case "standard":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "strict":
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`${getPolicyBadgeColor()} cursor-help`}>
              {policyData.display_name} cancellation
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{policyData.guest_friendly_summary}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Cancellation Policy</span>
                    <Badge variant="outline" className={getPolicyBadgeColor()}>
                      {policyData.display_name}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {policyData.guest_friendly_summary}
                  </p>
                </div>
              </div>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {/* Current status if check-in date provided */}
            {refundStatus && (
              <Alert className={
                refundStatus.currentRefundPercent === 100 
                  ? "border-green-200 bg-green-50" 
                  : refundStatus.currentRefundPercent > 0 
                    ? "border-amber-200 bg-amber-50"
                    : "border-red-200 bg-red-50"
              }>
                <div className="flex items-start gap-2">
                  {refundStatus.currentRefundPercent === 100 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  ) : refundStatus.currentRefundPercent > 0 ? (
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  )}
                  <AlertDescription className="text-sm">
                    <strong>
                      {refundStatus.daysUntilCheckin > 0 
                        ? `${refundStatus.daysUntilCheckin} days until check-in`
                        : "Check-in today or past"}
                    </strong>
                    <br />
                    {refundStatus.currentRefundPercent === 100 ? (
                      "Full refund available if you cancel now."
                    ) : refundStatus.currentRefundPercent > 0 ? (
                      `${refundStatus.currentRefundPercent}% refund available if you cancel now.`
                    ) : (
                      "No refund available at this time."
                    )}
                    {refundStatus.nextThreshold && refundStatus.daysUntilCheckin > refundStatus.nextThreshold.days_before && (
                      <span className="block mt-1 text-muted-foreground">
                        Refund drops to {refundStatus.nextThreshold.refund_percent}% in {
                          refundStatus.daysUntilCheckin - refundStatus.nextThreshold.days_before
                        } days.
                      </span>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Policy timeline */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Policy Details</h4>
              <div className="space-y-2">
                {(policyData.rules as PolicyRule[])
                  .sort((a, b) => b.days_before - a.days_before)
                  .map((rule, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        rule.refund_percent === 100 
                          ? "bg-green-100 text-green-800"
                          : rule.refund_percent > 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                      }`}>
                        {rule.refund_percent}%
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {rule.days_before > 0 
                            ? `${rule.days_before}+ days before check-in`
                            : "Less than the above"}
                        </p>
                        {rule.note && (
                          <p className="text-xs text-muted-foreground">{rule.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Service fee note */}
            <p className="text-xs text-muted-foreground">
              Service fees are non-refundable. Refunds apply to accommodation costs only.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Compact inline version for property cards
export function CancellationPolicyBadge({ 
  policyName 
}: { 
  policyName: "flexible" | "standard" | "strict" 
}) {
  const getColor = () => {
    switch (policyName) {
      case "flexible":
        return "bg-green-100 text-green-800 border-green-200";
      case "standard":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "strict":
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  const getLabel = () => {
    switch (policyName) {
      case "flexible":
        return "Flexible";
      case "standard":
        return "Standard";
      case "strict":
        return "Strict";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${getColor()} text-xs`}>
            {getLabel()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {policyName === "flexible" && "Full refund up to 7 days before"}
            {policyName === "standard" && "Full refund up to 14 days before"}
            {policyName === "strict" && "Full refund up to 30 days before"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

