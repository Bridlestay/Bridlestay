"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PropertyEquineSchema, type PropertyEquine } from "@/lib/validations/property";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";

interface EquineStepProps {
  data: any;
  onNext: (data: any) => void;
}

export function PropertyEquineStep({ data, onNext }: EquineStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PropertyEquine>({
    resolver: zodResolver(PropertyEquineSchema),
    defaultValues: data?.equine || { max_horses: 1, stable_count: 0 },
  });

  // Debug: Log the incoming data
  useEffect(() => {
    console.log("Equine Step - Incoming data:", data);
    console.log("Equine Step - data.equine:", data?.equine);
  }, [data]);

  const onSubmit = async (formData: PropertyEquine) => {
    setIsSubmitting(true);
    console.log("Equine form data:", formData);
    console.log("Equine form errors:", errors);
    onNext({ equine: formData });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Capacity */}
      <div>
        <h3 className="font-semibold text-lg mb-4">Capacity</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="max_horses">Max Horses * (Required)</Label>
            <Input
              id="max_horses"
              type="number"
              {...register("max_horses", { valueAsNumber: true })}
              min="1"
              required
            />
            {errors.max_horses && (
              <p className="text-sm text-destructive mt-1">{errors.max_horses.message}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              How many horses can your property accommodate?
            </p>
          </div>
          <div>
            <Label htmlFor="stable_count">Number of Stables</Label>
            <Input
              id="stable_count"
              type="number"
              {...register("stable_count", { valueAsNumber: true })}
              min="0"
            />
          </div>
        </div>
      </div>

      <Accordion type="multiple" className="w-full">
        {/* Stabling */}
        <AccordionItem value="stabling">
          <AccordionTrigger>Stabling</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium">Stable Dimensions</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="stable_length">Length</Label>
                  <Input
                    id="stable_length"
                    type="number"
                    {...register("stable_length", { valueAsNumber: true })}
                    placeholder="12"
                  />
                </div>
                <div>
                  <Label htmlFor="stable_width">Width</Label>
                  <Input
                    id="stable_width"
                    type="number"
                    {...register("stable_width", { valueAsNumber: true })}
                    placeholder="12"
                  />
                </div>
                <div>
                  <Label htmlFor="stable_unit">Unit</Label>
                  <Select
                    onValueChange={(value) => setValue("stable_unit", value as any)}
                    defaultValue={data?.equine?.stable_unit || "ft"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ft">Feet (ft)</SelectItem>
                      <SelectItem value="m">Meters (m)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="stall_type">Stall Type</Label>
              <Select
                onValueChange={(value) => setValue("stall_type", value as any)}
                defaultValue={data?.equine?.stall_type}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loose_box">Loose Box</SelectItem>
                  <SelectItem value="tie_stall">Tie Stall</SelectItem>
                  <SelectItem value="american_barn">American Barn</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bedding_available"
                  checked={watch("bedding_available")}
                  onCheckedChange={(checked) =>
                    setValue("bedding_available", checked as boolean)
                  }
                />
                <Label htmlFor="bedding_available">Bedding Available</Label>
              </div>
              {watch("bedding_available") && (
                <div className="ml-6 space-y-2">
                  <Input
                    {...register("bedding_types")}
                    placeholder="e.g., Straw, Shavings, Pellets"
                  />
                  <div>
                    <Label htmlFor="bedding_fee" className="text-sm">
                      Fee per night (optional)
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg">£</span>
                      <Input
                        id="bedding_fee"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        onChange={(e) => {
                          const pounds = parseFloat(e.target.value) || 0;
                          setValue("bedding_fee_pennies", Math.round(pounds * 100));
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="forage_available"
                  checked={watch("forage_available")}
                  onCheckedChange={(checked) =>
                    setValue("forage_available", checked as boolean)
                  }
                />
                <Label htmlFor="forage_available">Forage Available</Label>
              </div>
              {watch("forage_available") && (
                <div className="ml-6 space-y-2">
                  <Input
                    {...register("forage_types")}
                    placeholder="e.g., Hay, Haylage"
                  />
                  <div>
                    <Label htmlFor="forage_fee" className="text-sm">
                      Fee per night (optional)
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg">£</span>
                      <Input
                        id="forage_fee"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        onChange={(e) => {
                          const pounds = parseFloat(e.target.value) || 0;
                          setValue("forage_fee_pennies", Math.round(pounds * 100));
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Turnout & Paddocks */}
        <AccordionItem value="turnout">
          <AccordionTrigger>Turnout & Paddocks</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="paddock_available"
                checked={watch("paddock_available")}
                onCheckedChange={(checked) =>
                  setValue("paddock_available", checked as boolean)
                }
              />
              <Label htmlFor="paddock_available">Paddock Available</Label>
            </div>

            {watch("paddock_available") && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paddock_size_acres">Size (acres)</Label>
                    <Input
                      id="paddock_size_acres"
                      type="number"
                      step="0.1"
                      {...register("paddock_size_acres", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="paddock_fencing">Fencing Type</Label>
                    <Select
                      onValueChange={(value) => setValue("paddock_fencing", value as any)}
                      defaultValue={data?.equine?.paddock_fencing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="post_rail">Post & Rail</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="wire">Wire</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="shelter_available"
                      checked={watch("shelter_available")}
                      onCheckedChange={(checked) =>
                        setValue("shelter_available", checked as boolean)
                      }
                    />
                    <Label htmlFor="shelter_available">Shelter Available</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="water_points"
                      checked={watch("water_points")}
                      onCheckedChange={(checked) =>
                        setValue("water_points", checked as boolean)
                      }
                    />
                    <Label htmlFor="water_points">Water Points</Label>
                  </div>
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Riding Facilities */}
        <AccordionItem value="riding">
          <AccordionTrigger>Riding Facilities</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="arena_indoor"
                  checked={watch("arena_indoor")}
                  onCheckedChange={(checked) =>
                    setValue("arena_indoor", checked as boolean)
                  }
                />
                <Label htmlFor="arena_indoor">Indoor Arena</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="arena_outdoor"
                  checked={watch("arena_outdoor")}
                  onCheckedChange={(checked) =>
                    setValue("arena_outdoor", checked as boolean)
                  }
                />
                <Label htmlFor="arena_outdoor">Outdoor Arena</Label>
              </div>
            </div>

            {/* Indoor Arena Details */}
            {watch("arena_indoor") && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <h4 className="font-medium">Indoor Arena Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="arena_indoor_length">Length</Label>
                    <Input
                      id="arena_indoor_length"
                      type="number"
                      {...register("arena_indoor_length", { valueAsNumber: true })}
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="arena_indoor_width">Width</Label>
                    <Input
                      id="arena_indoor_width"
                      type="number"
                      {...register("arena_indoor_width", { valueAsNumber: true })}
                      placeholder="40"
                    />
                  </div>
                  <div>
                    <Label htmlFor="arena_indoor_unit">Unit</Label>
                    <Select
                      onValueChange={(value) => setValue("arena_indoor_unit", value as any)}
                      defaultValue={data?.equine?.arena_indoor_unit || "m"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">Meters (m)</SelectItem>
                        <SelectItem value="ft">Feet (ft)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="arena_indoor_surface">Surface</Label>
                  <Select
                    onValueChange={(value) => setValue("arena_indoor_surface", value as any)}
                    defaultValue={data?.equine?.arena_indoor_surface}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select surface" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sand">Sand</SelectItem>
                      <SelectItem value="silica">Silica</SelectItem>
                      <SelectItem value="fibre">Fibre</SelectItem>
                      <SelectItem value="rubber">Rubber</SelectItem>
                      <SelectItem value="grass">Grass</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Outdoor Arena Details */}
            {watch("arena_outdoor") && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <h4 className="font-medium">Outdoor Arena Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="arena_outdoor_length">Length</Label>
                    <Input
                      id="arena_outdoor_length"
                      type="number"
                      {...register("arena_outdoor_length", { valueAsNumber: true })}
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="arena_outdoor_width">Width</Label>
                    <Input
                      id="arena_outdoor_width"
                      type="number"
                      {...register("arena_outdoor_width", { valueAsNumber: true })}
                      placeholder="60"
                    />
                  </div>
                  <div>
                    <Label htmlFor="arena_outdoor_unit">Unit</Label>
                    <Select
                      onValueChange={(value) => setValue("arena_outdoor_unit", value as any)}
                      defaultValue={data?.equine?.arena_outdoor_unit || "m"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">Meters (m)</SelectItem>
                        <SelectItem value="ft">Feet (ft)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="arena_outdoor_surface">Surface</Label>
                  <Select
                    onValueChange={(value) => setValue("arena_outdoor_surface", value as any)}
                    defaultValue={data?.equine?.arena_outdoor_surface}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select surface" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sand">Sand</SelectItem>
                      <SelectItem value="silica">Silica</SelectItem>
                      <SelectItem value="fibre">Fibre</SelectItem>
                      <SelectItem value="rubber">Rubber</SelectItem>
                      <SelectItem value="grass">Grass</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Shared Arena Features */}
            {(watch("arena_indoor") || watch("arena_outdoor")) && (
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="jumps_available"
                    checked={watch("jumps_available")}
                    onCheckedChange={(checked) =>
                      setValue("jumps_available", checked as boolean)
                    }
                  />
                  <Label htmlFor="jumps_available">Jumps</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="poles_available"
                    checked={watch("poles_available")}
                    onCheckedChange={(checked) =>
                      setValue("poles_available", checked as boolean)
                    }
                  />
                  <Label htmlFor="poles_available">Poles</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="floodlights"
                    checked={watch("floodlights")}
                    onCheckedChange={(checked) =>
                      setValue("floodlights", checked as boolean)
                    }
                  />
                  <Label htmlFor="floodlights">Floodlights</Label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="direct_bridleway_access"
                  checked={watch("direct_bridleway_access")}
                  onCheckedChange={(checked) =>
                    setValue("direct_bridleway_access", checked as boolean)
                  }
                />
                <Label htmlFor="direct_bridleway_access">Direct Bridleway Access</Label>
              </div>
              {!watch("direct_bridleway_access") && (
                <div>
                  <Label htmlFor="distance_to_bridleway_m">Distance to Bridleway (m)</Label>
                  <Input
                    id="distance_to_bridleway_m"
                    type="number"
                    {...register("distance_to_bridleway_m", { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trailer_parking"
                  checked={watch("trailer_parking")}
                  onCheckedChange={(checked) =>
                    setValue("trailer_parking", checked as boolean)
                  }
                />
                <Label htmlFor="trailer_parking">Trailer Parking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lorry_parking"
                  checked={watch("lorry_parking")}
                  onCheckedChange={(checked) =>
                    setValue("lorry_parking", checked as boolean)
                  }
                />
                <Label htmlFor="lorry_parking">Lorry Parking</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Care & Biosecurity */}
        <AccordionItem value="care">
          <AccordionTrigger>Care & Biosecurity</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tie_up_area"
                  checked={watch("tie_up_area")}
                  onCheckedChange={(checked) =>
                    setValue("tie_up_area", checked as boolean)
                  }
                />
                <Label htmlFor="tie_up_area">Tie-up Area</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wash_bay"
                  checked={watch("wash_bay")}
                  onCheckedChange={(checked) =>
                    setValue("wash_bay", checked as boolean)
                  }
                />
                <Label htmlFor="wash_bay">Wash Bay</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hot_hose"
                  checked={watch("hot_hose")}
                  onCheckedChange={(checked) =>
                    setValue("hot_hose", checked as boolean)
                  }
                />
                <Label htmlFor="hot_hose">Hot Hose</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tack_room"
                  checked={watch("tack_room")}
                  onCheckedChange={(checked) =>
                    setValue("tack_room", checked as boolean)
                  }
                />
                <Label htmlFor="tack_room">Tack Room</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="locked_tack_room"
                  checked={watch("locked_tack_room")}
                  onCheckedChange={(checked) =>
                    setValue("locked_tack_room", checked as boolean)
                  }
                />
                <Label htmlFor="locked_tack_room">Locked Tack Room</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="muck_heap_access"
                  checked={watch("muck_heap_access")}
                  onCheckedChange={(checked) =>
                    setValue("muck_heap_access", checked as boolean)
                  }
                />
                <Label htmlFor="muck_heap_access">Muck Heap</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="safety_rules">Safety Rules (Optional)</Label>
              <Textarea
                id="safety_rules"
                {...register("safety_rules")}
                placeholder="e.g., Helmets must be worn at all times, no dogs in paddocks..."
                rows={3}
              />
              {errors.safety_rules && (
                <p className="text-sm text-destructive mt-1">{errors.safety_rules.message}</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Validation Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-destructive/10 border border-destructive p-4 rounded-lg">
          <p className="font-medium text-destructive mb-2">Please fix these errors:</p>
          <ul className="text-sm text-destructive space-y-1">
            {Object.entries(errors).map(([key, error]) => (
              <li key={key}>• {key}: {error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

