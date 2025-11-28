"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PropertyAmenitiesSchema, type PropertyAmenities } from "@/lib/validations/property";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight } from "lucide-react";

interface AmenitiesStepProps {
  data: any;
  onNext: (data: any) => void;
}

export function PropertyAmenitiesStep({ data, onNext }: AmenitiesStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<PropertyAmenities>({
    resolver: zodResolver(PropertyAmenitiesSchema),
    defaultValues: data?.amenities || {},
  });

  // Debug: Log the incoming data
  useEffect(() => {
    console.log("Amenities Step - Incoming data:", data);
    console.log("Amenities Step - data.amenities:", data?.amenities);
  }, [data]);

  const onSubmit = async (formData: PropertyAmenities) => {
    setIsSubmitting(true);
    onNext({ amenities: formData });
    setIsSubmitting(false);
  };

  const amenityGroups = [
    {
      title: "Essentials",
      items: [
        { id: "wifi", label: "WiFi" },
        { id: "heating", label: "Heating" },
        { id: "air_con", label: "Air Conditioning" },
        { id: "hot_water", label: "Hot Water" },
        { id: "workspace", label: "Dedicated Workspace" },
      ],
    },
    {
      title: "Kitchen",
      items: [
        { id: "kitchen", label: "Kitchen" },
        { id: "oven", label: "Oven" },
        { id: "hob", label: "Hob" },
        { id: "microwave", label: "Microwave" },
        { id: "fridge", label: "Fridge" },
        { id: "freezer", label: "Freezer" },
        { id: "dishwasher", label: "Dishwasher" },
        { id: "coffee_maker", label: "Coffee Maker" },
        { id: "kettle", label: "Kettle" },
        { id: "cookware", label: "Cookware & Utensils" },
      ],
    },
    {
      title: "Laundry",
      items: [
        { id: "washer", label: "Washing Machine" },
        { id: "dryer", label: "Dryer" },
        { id: "drying_rack", label: "Drying Rack" },
        { id: "ironing_board", label: "Iron & Ironing Board" },
      ],
    },
    {
      title: "Bathroom",
      items: [
        { id: "shower", label: "Shower" },
        { id: "bathtub", label: "Bathtub" },
        { id: "hairdryer", label: "Hair Dryer" },
        { id: "toiletries", label: "Toiletries" },
      ],
    },
    {
      title: "Safety",
      items: [
        { id: "smoke_alarm", label: "Smoke Alarm" },
        { id: "carbon_monoxide_alarm", label: "Carbon Monoxide Alarm" },
        { id: "first_aid_kit", label: "First Aid Kit" },
        { id: "fire_extinguisher", label: "Fire Extinguisher" },
      ],
    },
    {
      title: "Access & Parking",
      items: [
        { id: "step_free_access", label: "Step-Free Access" },
        { id: "private_entrance", label: "Private Entrance" },
        { id: "on_site_parking", label: "On-Site Parking" },
        { id: "ev_charger", label: "EV Charger" },
      ],
    },
    {
      title: "Family & Pets",
      items: [
        { id: "cot", label: "Cot/Crib" },
        { id: "high_chair", label: "High Chair" },
        { id: "pets_allowed", label: "Pets Allowed" },
      ],
    },
    {
      title: "Entertainment",
      items: [
        { id: "tv", label: "TV" },
        { id: "streaming", label: "Streaming Services" },
        { id: "outdoor_seating", label: "Outdoor Seating" },
        { id: "bbq", label: "BBQ/Grill" },
      ],
    },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {amenityGroups.map((group) => (
        <div key={group.title}>
          <h3 className="font-semibold text-lg mb-4">{group.title}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.items.map((item) => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox
                  id={item.id}
                  checked={watch(item.id as any)}
                  onCheckedChange={(checked) =>
                    setValue(item.id as any, checked as boolean)
                  }
                />
                <Label htmlFor={item.id} className="cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Pet Rules */}
      {watch("pets_allowed") && (
        <div>
          <Label htmlFor="pet_rules">Pet Rules (Optional)</Label>
          <Textarea
            id="pet_rules"
            {...register("pet_rules")}
            placeholder="e.g., Dogs must be kept on leads, please clean up after pets..."
            rows={3}
          />
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

