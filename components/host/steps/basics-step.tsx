"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PropertyBasicsSchema, type PropertyBasics } from "@/lib/validations/property";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { UK_COUNTIES } from "@/lib/constants/counties";

interface BasicsStepProps {
  data: any;
  onNext: (data: any) => void;
}

export function PropertyBasicsStep({ data, onNext }: BasicsStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PropertyBasics>({
    resolver: zodResolver(PropertyBasicsSchema),
    defaultValues: {
      country: "UK",
      checkin_time: "15:00",
      checkout_time: "11:00",
      latitude: 52.2053,
      longitude: -2.2216,
      ...data,
    },
  });

  const onSubmit = async (formData: PropertyBasics) => {
    setIsSubmitting(true);
    onNext(formData);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Property Name */}
      <div>
        <Label htmlFor="name">Property Name *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="e.g., The Stables at Malvern"
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description * (min 200 characters)</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Describe your property, its unique features, and what makes it special for equestrians..."
          rows={6}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {watch("description")?.length || 0} / 200 characters
        </p>
        {errors.description && (
          <p className="text-sm text-destructive mt-1">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Property Type */}
      <div>
        <Label htmlFor="property_type">Property Type *</Label>
        <Select
          onValueChange={(value) => setValue("property_type", value as "bnb" | "cottage" | "farm_stay" | "manor" | "glamping" | "other")}
          defaultValue={data?.property_type || "cottage"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select property type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bnb">B&B</SelectItem>
            <SelectItem value="cottage">Cottage</SelectItem>
            <SelectItem value="farm_stay">Farm Stay</SelectItem>
            <SelectItem value="manor">Manor House</SelectItem>
            <SelectItem value="glamping">Glamping</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors.property_type && (
          <p className="text-sm text-destructive mt-1">
            {(errors as any).property_type.message}
          </p>
        )}
      </div>

      {/* Address */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="address_line">Address Line *</Label>
          <Input
            id="address_line"
            {...register("address_line")}
            placeholder="123 Main Street"
          />
          {errors.address_line && (
            <p className="text-sm text-destructive mt-1">
              {errors.address_line.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            {...register("city")}
            placeholder="e.g., Malvern"
          />
          {errors.city && (
            <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="county">County *</Label>
          <Select
            onValueChange={(value) => setValue("county", value)}
            defaultValue={data?.county}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select county" />
            </SelectTrigger>
            <SelectContent>
              {UK_COUNTIES.map((county) => (
                <SelectItem key={county} value={county}>
                  {county}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.county && (
            <p className="text-sm text-destructive mt-1">
              {errors.county.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="postcode">Postcode *</Label>
          <Input
            id="postcode"
            {...register("postcode")}
            placeholder="WR14 2AA"
          />
          {errors.postcode && (
            <p className="text-sm text-destructive mt-1">
              {errors.postcode.message}
            </p>
          )}
        </div>
      </div>

      {/* Capacity */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="max_guests">Max Guests *</Label>
          <Input
            id="max_guests"
            type="number"
            {...register("max_guests", { valueAsNumber: true })}
            min="1"
          />
          {errors.max_guests && (
            <p className="text-sm text-destructive mt-1">
              {errors.max_guests.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            type="number"
            {...register("bedrooms", { valueAsNumber: true })}
            min="0"
          />
        </div>

        <div>
          <Label htmlFor="beds">Beds</Label>
          <Input
            id="beds"
            type="number"
            {...register("beds", { valueAsNumber: true })}
            min="0"
          />
        </div>

        <div>
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            type="number"
            step="0.5"
            {...register("bathrooms", { valueAsNumber: true })}
            min="0"
          />
        </div>
      </div>

      {/* Check-in/out Times */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="checkin_time">Check-in Time</Label>
          <Input
            id="checkin_time"
            type="time"
            {...register("checkin_time")}
          />
        </div>

        <div>
          <Label htmlFor="checkout_time">Check-out Time</Label>
          <Input
            id="checkout_time"
            type="time"
            {...register("checkout_time")}
          />
        </div>
      </div>

      {/* House Rules */}
      <div>
        <Label htmlFor="house_rules">House Rules</Label>
        <Textarea
          id="house_rules"
          {...register("house_rules")}
          placeholder="e.g., No smoking, No parties, Quiet hours after 10pm, etc."
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Set clear expectations for your guests
        </p>
      </div>

      {/* Instant Book Toggle */}
      <div className="flex items-start space-x-3 rounded-lg border p-4">
        <input
          id="instant_book"
          type="checkbox"
          {...register("instant_book")}
          className="mt-1 h-4 w-4 rounded border-gray-300"
        />
        <div className="flex-1">
          <Label htmlFor="instant_book" className="text-base font-medium cursor-pointer">
            Enable Instant Book
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Allow guests to book immediately without waiting for your approval. You can still decline bookings that don't meet your requirements.
          </p>
        </div>
      </div>

      {/* Hidden location fields (will add map picker later) */}
      <input type="hidden" {...register("latitude", { valueAsNumber: true })} />
      <input type="hidden" {...register("longitude", { valueAsNumber: true })} />
      <input type="hidden" {...register("country")} />

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

