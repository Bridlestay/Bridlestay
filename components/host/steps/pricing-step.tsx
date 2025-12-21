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
import { Loader2 } from "lucide-react";

interface PricingStepProps {
  data: any;
  onNext: (data: any) => void;
  userId: string;
  propertyId?: string;
}

export function PropertyPricingStep({ data, onNext, userId, propertyId }: PricingStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

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
  const cleaningFeeGBP = (watch("cleaning_fee_pennies") || 0) / 100;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

          <div>
            <LabelWithInfo 
              htmlFor="cleaning_fee" 
              info="A one-time fee added to each booking to cover cleaning after guests depart. This is optional and only charged once per booking, not per night."
            >
              Cleaning Fee (£)
            </LabelWithInfo>
            <div className="flex items-center gap-2">
              <span className="text-2xl">£</span>
              <Input
                id="cleaning_fee"
                type="number"
                step="0.01"
                value={cleaningFeeGBP}
                onChange={(e) =>
                  setValue("cleaning_fee_pennies", Math.round(parseFloat(e.target.value) * 100))
                }
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              One-time cleaning fee (optional)
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
          {cleaningFeeGBP > 0 && (
            <div className="flex justify-between">
              <span>Cleaning fee:</span>
              <span>£{cleaningFeeGBP.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} size="lg">
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

