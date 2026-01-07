"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PropertyBasicsSchema, type PropertyBasics } from "@/lib/validations/property";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabelWithInfo } from "@/components/ui/info-tooltip";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, MapPin, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { UK_COUNTIES } from "@/lib/constants/counties";

interface BasicsStepProps {
  data: any;
  onNext: (data: any) => void;
}

export function PropertyBasicsStep({ data, onNext }: BasicsStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [geocodeMessage, setGeocodeMessage] = useState<string>('');

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

  const postcode = watch("postcode");

  // Geocode postcode when it changes
  const geocodePostcode = useCallback(async (postcodeValue: string) => {
    if (!postcodeValue || postcodeValue.length < 5) {
      setGeocodeStatus('idle');
      return;
    }

    // Basic UK postcode format check
    const postcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
    if (!postcodeRegex.test(postcodeValue)) {
      return;
    }

    setIsGeocoding(true);
    setGeocodeStatus('idle');

    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcode: postcodeValue }),
      });

      if (response.ok) {
        const result = await response.json();
        setValue('latitude', result.latitude);
        setValue('longitude', result.longitude);
        setGeocodeStatus('success');
        setGeocodeMessage(`Location found: ${result.admin_district || result.region || 'UK'}`);
      } else {
        setGeocodeStatus('error');
        setGeocodeMessage('Could not find location for this postcode');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodeStatus('error');
      setGeocodeMessage('Failed to lookup postcode');
    } finally {
      setIsGeocoding(false);
    }
  }, [setValue]);

  // Debounce postcode geocoding
  useEffect(() => {
    const timer = setTimeout(() => {
      if (postcode) {
        geocodePostcode(postcode);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [postcode, geocodePostcode]);

  const onSubmit = async (formData: PropertyBasics) => {
    setIsSubmitting(true);
    onNext(formData);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Property Name */}
      <div>
        <LabelWithInfo 
          htmlFor="name" 
          info="Give your property a memorable name that guests will recognise. This will be displayed in search results."
          required
        >
          Property Name
        </LabelWithInfo>
        <Input
          id="name"
          {...register("name")}
          placeholder="e.g., Willow Farm Stables"
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <LabelWithInfo 
          htmlFor="description" 
          info="Write a detailed description of your property. Include what makes it special for horse owners, nearby riding routes, and any unique features. A good description helps guests decide if your property is right for them."
          asPopover
          required
        >
          Description (min 200 characters)
        </LabelWithInfo>
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
        <Label htmlFor="property_type">Listing Type *</Label>
        <Select
          onValueChange={(value) => setValue("property_type", value as any)}
          defaultValue={data?.property_type || "cottage"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select listing type" />
          </SelectTrigger>
          <SelectContent>
            {/* Accommodation types */}
            <SelectItem value="bnb">B&B</SelectItem>
            <SelectItem value="cottage">Cottage</SelectItem>
            <SelectItem value="farm_stay">Farm Stay</SelectItem>
            <SelectItem value="manor">Manor House</SelectItem>
            <SelectItem value="glamping">Glamping</SelectItem>
            {/* Camping/Outdoor types */}
            <SelectItem value="campsite">Campsite</SelectItem>
            <SelectItem value="caravan_park">Caravan Park</SelectItem>
            <SelectItem value="shepherds_hut">Shepherd's Hut</SelectItem>
            <SelectItem value="yurt">Yurt</SelectItem>
            <SelectItem value="tipi">Tipi</SelectItem>
            <SelectItem value="bell_tent">Bell Tent</SelectItem>
            <SelectItem value="pod">Camping Pod</SelectItem>
            <SelectItem value="treehouse">Treehouse</SelectItem>
            {/* Equine-specific types */}
            <SelectItem value="livery_yard">Livery Yard</SelectItem>
            <SelectItem value="equestrian_centre">Equestrian Centre</SelectItem>
            <SelectItem value="riding_school">Riding School</SelectItem>
            {/* Other */}
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
            placeholder="e.g., Cheltenham"
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
          <LabelWithInfo 
            htmlFor="postcode" 
            info="Your postcode is used to show your property's approximate location on the map. We add a small offset for privacy, so your exact address isn't revealed until a booking is confirmed."
            asPopover
            required
          >
            Postcode
          </LabelWithInfo>
          <div className="relative">
            <Input
              id="postcode"
              {...register("postcode")}
              placeholder="GL50 1AA"
              className="pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isGeocoding && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {!isGeocoding && geocodeStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              {!isGeocoding && geocodeStatus === 'error' && <AlertCircle className="h-4 w-4 text-amber-500" />}
            </div>
          </div>
          {errors.postcode && (
            <p className="text-sm text-destructive mt-1">
              {errors.postcode.message}
            </p>
          )}
          {geocodeMessage && !errors.postcode && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${geocodeStatus === 'success' ? 'text-green-600' : 'text-amber-600'}`}>
              <MapPin className="h-3 w-3" />
              {geocodeMessage}
            </p>
          )}
        </div>
      </div>

      {/* Capacity */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <LabelWithInfo 
            htmlFor="max_guests" 
            info="The maximum number of people who can stay at your property. This should match your accommodation capacity."
            required
          >
            Max Guests
          </LabelWithInfo>
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

