import { formatGBP, PriceBreakdown } from "@/lib/fees";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PriceBreakdownProps {
  breakdown: PriceBreakdown;
  nights: number;
}

export function PriceBreakdownDisplay({
  breakdown,
  nights,
}: PriceBreakdownProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <span>
          {formatGBP(breakdown.basePricePennies / nights)} × {nights} nights
        </span>
        <span>{formatGBP(breakdown.basePricePennies)}</span>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <span>Service fee (incl. VAT)</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Guest service fee: 9.5% (no cap)
                  <br />
                  Includes 20% VAT on service fee
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span>
          {formatGBP(
            breakdown.guestFeePennies + breakdown.guestFeeVatPennies
          )}
        </span>
      </div>
      <div className="border-t pt-3 flex justify-between font-semibold text-lg">
        <span>Total</span>
        <span>{formatGBP(breakdown.totalChargePennies)}</span>
      </div>
    </div>
  );
}



