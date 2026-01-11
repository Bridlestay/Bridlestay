"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PropertyPricingSchema, type PropertyPricing } from "@/lib/validations/property";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabelWithInfo } from "@/components/ui/info-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PricingStepProps {
  data: any;
  onNext: (data: any) => void;
  userId: string;
  propertyId?: string;
}

export function PropertyPricingStep({ data, onNext, userId, propertyId }: PricingStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insuranceAcknowledged, setInsuranceAcknowledged] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [showCleaningBreakdown, setShowCleaningBreakdown] = useState(false);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PropertyPricing>({
    resolver: zodResolver(PropertyPricingSchema),
    defaultValues: {
      nightly_price_pennies: 5000,
      per_horse_fee_pennies: 0,
      cleaning_fee_pennies: 0,
      house_cleaning_fee_pennies: 0,
      stable_cleaning_fee_pennies: 0,
      min_nights: 1,
      max_nights: 28,
      cancellation_policy: "moderate",
      ...data,
    },
  });

  const onSubmit = async (formData: PropertyPricing) => {
    setIsSubmitting(true);

    try {
      // Save the complete property
      const completeData = { ...data, ...formData };
      
      console.log("Submitting complete data:", completeData);

      const response = await fetch("/api/host/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          propertyId,
          ...completeData,
        }),
      });

      const result = await response.json();
      console.log("API response:", result);

      if (!response.ok) {
        console.error("API error:", result);
        throw new Error(result.error || "Failed to save listing");
      }

      toast({
        title: "Listing saved!",
        description: "Your property has been saved as a draft. You can view it in My Listings.",
      });

      router.push("/host/listings");
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nightlyPriceGBP = (watch("nightly_price_pennies") || 0) / 100;
  const perHorseFeeGBP = (watch("per_horse_fee_pennies") || 0) / 100;
  const houseCleaningFeeGBP = (watch("house_cleaning_fee_pennies") || 0) / 100;
  const stableCleaningFeeGBP = (watch("stable_cleaning_fee_pennies") || 0) / 100;
  const totalCleaningFeeGBP = houseCleaningFeeGBP + stableCleaningFeeGBP;
  
  // For backwards compatibility, also track the legacy field
  const cleaningFeeGBP = (watch("cleaning_fee_pennies") || 0) / 100;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Fine-tune later message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-900">
            <strong>Get started quickly!</strong> Just set your base price and cleaning fee now. 
            You can adjust pricing, add discounts, and fine-tune settings in more detail after publishing.
          </p>
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold text-lg mb-4">Pricing</h3>
        
        <div className="space-y-4">
          <div>
            <LabelWithInfo 
              htmlFor="nightly_price" 
              info="This is the base price guests pay per night. It should include the property accommodation. You can add horse fees separately below."
              asPopover
              required
            >
              Nightly Price (£)
            </LabelWithInfo>
            <div className="flex items-center gap-2">
              <span className="text-2xl">£</span>
              <Input
                id="nightly_price"
                type="number"
                step="0.01"
                value={nightlyPriceGBP}
                onChange={(e) =>
                  setValue("nightly_price_pennies", Math.round(parseFloat(e.target.value) * 100))
                }
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Base rate per night for the property
            </p>
            {errors.nightly_price_pennies && (
              <p className="text-sm text-destructive mt-1">
                {errors.nightly_price_pennies.message}
              </p>
            )}
          </div>

          <div>
            <LabelWithInfo 
              htmlFor="per_horse_fee" 
              info="Charge per horse per night. This covers stabling, hay, bedding etc. Set to £0 if horse accommodation is included in your nightly rate. Guests will specify how many horses they're bringing when booking."
              asPopover
            >
              Per Horse Fee (£)
            </LabelWithInfo>
            <div className="flex items-center gap-2">
              <span className="text-2xl">£</span>
              <Input
                id="per_horse_fee"
                type="number"
                step="0.01"
                value={perHorseFeeGBP}
                onChange={(e) =>
                  setValue("per_horse_fee_pennies", Math.round(parseFloat(e.target.value) * 100))
                }
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Additional fee per horse per night (0 = included in base price)
            </p>
          </div>

          {/* Cleaning Fees - Split into House + Stable */}
          <div className="space-y-3">
            <LabelWithInfo 
              htmlFor="cleaning_fees" 
              info="Cleaning fees cover post-stay cleaning. For equine properties, guests understand that stables and yards require additional cleaning. Guests see one total, with an optional breakdown."
            >
              Cleaning Fees (£)
            </LabelWithInfo>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="house_cleaning_fee" className="text-sm font-normal text-muted-foreground">
                  House / Property
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-lg">£</span>
                  <Input
                    id="house_cleaning_fee"
                    type="number"
                    step="0.01"
                    value={houseCleaningFeeGBP}
                    onChange={(e) => {
                      const value = Math.round(parseFloat(e.target.value || "0") * 100);
                      setValue("house_cleaning_fee_pennies", value);
                      // Also update legacy field for compatibility
                      setValue("cleaning_fee_pennies", value + (watch("stable_cleaning_fee_pennies") || 0));
                    }}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="stable_cleaning_fee" className="text-sm font-normal text-muted-foreground">
                  Stable / Yard
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-lg">£</span>
                  <Input
                    id="stable_cleaning_fee"
                    type="number"
                    step="0.01"
                    value={stableCleaningFeeGBP}
                    onChange={(e) => {
                      const value = Math.round(parseFloat(e.target.value || "0") * 100);
                      setValue("stable_cleaning_fee_pennies", value);
                      // Also update legacy field for compatibility
                      setValue("cleaning_fee_pennies", (watch("house_cleaning_fee_pennies") || 0) + value);
                    }}
                  />
                </div>
              </div>
            </div>
            
            {totalCleaningFeeGBP > 0 && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                Total cleaning fee shown to guests: <strong>£{totalCleaningFeeGBP.toFixed(2)}</strong>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              Guests see one combined fee with an expandable breakdown. Horse owners understand equine cleaning costs.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-4">Stay Requirements</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="min_nights">Minimum Nights</Label>
            <Input
              id="min_nights"
              type="number"
              {...register("min_nights", { valueAsNumber: true })}
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="max_nights">Maximum Nights</Label>
            <Input
              id="max_nights"
              type="number"
              {...register("max_nights", { valueAsNumber: true })}
              max="365"
            />
          </div>
        </div>
      </div>

      <div>
        <LabelWithInfo 
          htmlFor="cancellation_policy" 
          info="This determines how refunds work if a guest cancels. Flexible policies may attract more bookings, but stricter policies protect you from last-minute cancellations. You can change this at any time."
          asPopover
        >
          Cancellation Policy
        </LabelWithInfo>
        <Select
          onValueChange={(value) => setValue("cancellation_policy", value as any)}
          defaultValue={data?.cancellation_policy || "moderate"}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flexible">
              Flexible - Full refund up to 24 hours before check-in
            </SelectItem>
            <SelectItem value="moderate">
              Moderate - Full refund up to 5 days before check-in
            </SelectItem>
            <SelectItem value="strict">
              Strict - 50% refund up to 7 days before check-in
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Preview */}
      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-medium mb-2">Price Preview</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Nightly rate:</span>
            <span>£{nightlyPriceGBP.toFixed(2)}</span>
          </div>
          {perHorseFeeGBP > 0 && (
            <div className="flex justify-between">
              <span>Per horse per night:</span>
              <span>£{perHorseFeeGBP.toFixed(2)}</span>
            </div>
          )}
          {totalCleaningFeeGBP > 0 && (
            <Collapsible open={showCleaningBreakdown} onOpenChange={setShowCleaningBreakdown}>
              <CollapsibleTrigger className="flex justify-between w-full hover:bg-muted-foreground/10 rounded px-1 -mx-1">
                <span className="flex items-center gap-1">
                  Cleaning fee:
                  {showCleaningBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </span>
                <span>£{totalCleaningFeeGBP.toFixed(2)}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 pt-1 space-y-1 text-muted-foreground">
                {houseCleaningFeeGBP > 0 && (
                  <div className="flex justify-between">
                    <span>House / Property:</span>
                    <span>£{houseCleaningFeeGBP.toFixed(2)}</span>
                  </div>
                )}
                {stableCleaningFeeGBP > 0 && (
                  <div className="flex justify-between">
                    <span>Stable / Yard:</span>
                    <span>£{stableCleaningFeeGBP.toFixed(2)}</span>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Platform service fee (15%) will be added for guests. You'll receive your payout minus host fee (3%).
        </p>
      </div>

      {/* Insurance Acknowledgment */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-amber-900">Important: Insurance Required</h4>
              <p className="text-sm text-amber-800 mt-1">
                Cantra does not provide insurance. As a host, you are responsible for ensuring you have:
              </p>
              <ul className="text-sm text-amber-800 list-disc list-inside mt-2 space-y-1">
                <li>Public liability insurance for guests visiting your property</li>
                <li>Property insurance that covers short-term letting</li>
                <li>Equine liability cover if providing horse facilities</li>
              </ul>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="insurance-acknowledgment"
                checked={insuranceAcknowledged}
                onCheckedChange={(checked) => setInsuranceAcknowledged(checked === true)}
                className="mt-0.5"
              />
              <label 
                htmlFor="insurance-acknowledgment" 
                className="text-sm text-amber-900 cursor-pointer leading-tight"
              >
                I confirm that I understand I am responsible for arranging my own insurance coverage 
                and that Cantra does not provide any insurance for hosts or guests.
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting || !insuranceAcknowledged} 
          size="lg"
          title={!insuranceAcknowledged ? "Please acknowledge the insurance requirement above" : ""}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Listing"
          )}
        </Button>
      </div>
    </form>
  );
}

