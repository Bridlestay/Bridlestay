"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  Calendar, 
  Users, 
  Sparkles, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { createClient } from "@/lib/supabase/client";

interface AdvancedPricingSettingsProps {
  propertyId: string;
  baseNightlyPrice: number; // in pennies
  onSave?: () => void;
}

interface LastMinuteDiscount {
  id?: string;
  tier: number;
  days_before_checkin: number;
  discount_percent: number;
  enabled: boolean;
}

interface LengthOfStayDiscount {
  id?: string;
  min_nights: number;
  discount_percent: number;
  enabled: boolean;
}

interface SeasonalDiscount {
  id?: string;
  name: string;
  start_date: string;
  end_date: string;
  discount_percent: number;
  enabled: boolean;
}

interface PropertyDiscountSettings {
  allow_discount_stacking: boolean;
  max_discount_cap: number;
  first_time_rider_discount_enabled: boolean;
  first_time_rider_discount_percent: number;
}

export function AdvancedPricingSettings({ 
  propertyId, 
  baseNightlyPrice,
  onSave 
}: AdvancedPricingSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();
  
  // Property-level settings
  const [settings, setSettings] = useState<PropertyDiscountSettings>({
    allow_discount_stacking: false,
    max_discount_cap: 20,
    first_time_rider_discount_enabled: false,
    first_time_rider_discount_percent: 10,
  });
  
  // Discount rules
  const [lastMinuteDiscounts, setLastMinuteDiscounts] = useState<LastMinuteDiscount[]>([]);
  const [lengthOfStayDiscounts, setLengthOfStayDiscounts] = useState<LengthOfStayDiscount[]>([]);
  const [seasonalDiscounts, setSeasonalDiscounts] = useState<SeasonalDiscount[]>([]);
  
  // Preview state
  const [previewNights, setPreviewNights] = useState(3);
  const [previewDaysBeforeCheckin, setPreviewDaysBeforeCheckin] = useState(7);
  const [previewIsFirstTime, setPreviewIsFirstTime] = useState(false);
  
  // Section collapse states
  const [sectionsOpen, setSectionsOpen] = useState({
    lastMinute: true,
    lengthOfStay: true,
    seasonal: false,
    firstTime: false,
    stacking: false,
  });

  // Load existing settings
  useEffect(() => {
    loadSettings();
  }, [propertyId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load property settings
      const { data: property } = await supabase
        .from("properties")
        .select("allow_discount_stacking, max_discount_cap, first_time_rider_discount_enabled, first_time_rider_discount_percent")
        .eq("id", propertyId)
        .single();

      if (property) {
        setSettings({
          allow_discount_stacking: property.allow_discount_stacking || false,
          max_discount_cap: property.max_discount_cap || 20,
          first_time_rider_discount_enabled: property.first_time_rider_discount_enabled || false,
          first_time_rider_discount_percent: property.first_time_rider_discount_percent || 10,
        });
      }

      // Load last-minute discounts
      const { data: lastMinute } = await supabase
        .from("last_minute_discounts")
        .select("*")
        .eq("property_id", propertyId)
        .order("tier");
      
      if (lastMinute) setLastMinuteDiscounts(lastMinute);

      // Load length-of-stay discounts
      const { data: lengthOfStay } = await supabase
        .from("length_of_stay_discounts")
        .select("*")
        .eq("property_id", propertyId)
        .order("min_nights");
      
      if (lengthOfStay) setLengthOfStayDiscounts(lengthOfStay);

      // Load seasonal discounts
      const { data: seasonal } = await supabase
        .from("seasonal_discounts")
        .select("*")
        .eq("property_id", propertyId)
        .order("start_date");
      
      if (seasonal) setSeasonalDiscounts(seasonal);

    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load pricing settings",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate preview discount
  const previewDiscount = useMemo(() => {
    const applicableDiscounts: { type: string; name: string; percent: number }[] = [];

    // Check last-minute discounts
    for (const discount of lastMinuteDiscounts.filter(d => d.enabled)) {
      if (previewDaysBeforeCheckin <= discount.days_before_checkin) {
        applicableDiscounts.push({
          type: "last_minute",
          name: `${discount.days_before_checkin} days before`,
          percent: discount.discount_percent,
        });
      }
    }

    // Check length-of-stay discounts
    for (const discount of lengthOfStayDiscounts.filter(d => d.enabled)) {
      if (previewNights >= discount.min_nights) {
        applicableDiscounts.push({
          type: "length_of_stay",
          name: `${discount.min_nights}+ nights`,
          percent: discount.discount_percent,
        });
      }
    }

    // Check first-time rider discount
    if (settings.first_time_rider_discount_enabled && previewIsFirstTime) {
      applicableDiscounts.push({
        type: "first_time",
        name: "First-time booking",
        percent: settings.first_time_rider_discount_percent,
      });
    }

    // Sort by highest discount
    applicableDiscounts.sort((a, b) => b.percent - a.percent);

    if (applicableDiscounts.length === 0) return null;

    if (settings.allow_discount_stacking && applicableDiscounts.length > 1) {
      // Stack discounts up to cap
      let totalDiscount = 0;
      const applied: typeof applicableDiscounts = [];
      
      for (const discount of applicableDiscounts) {
        if (totalDiscount + discount.percent <= settings.max_discount_cap) {
          totalDiscount += discount.percent;
          applied.push(discount);
        }
      }
      
      return {
        stacked: true,
        discounts: applied,
        totalPercent: totalDiscount,
      };
    }

    // Single best discount
    return {
      stacked: false,
      discounts: [applicableDiscounts[0]],
      totalPercent: applicableDiscounts[0].percent,
    };
  }, [
    lastMinuteDiscounts, 
    lengthOfStayDiscounts, 
    settings, 
    previewNights, 
    previewDaysBeforeCheckin, 
    previewIsFirstTime
  ]);

  // Calculate preview prices
  const previewPrices = useMemo(() => {
    const nightlyRateGBP = baseNightlyPrice / 100;
    const subtotal = nightlyRateGBP * previewNights;
    const discountAmount = previewDiscount 
      ? subtotal * (previewDiscount.totalPercent / 100) 
      : 0;
    const discountedSubtotal = subtotal - discountAmount;
    const serviceFee = Math.min(discountedSubtotal * 0.15, 150); // 15% capped at £150
    const total = discountedSubtotal + serviceFee;

    return {
      nightlyRate: nightlyRateGBP,
      subtotal,
      discountAmount,
      discountedSubtotal,
      serviceFee,
      total,
      hostPayout: discountedSubtotal * 0.97, // 3% host fee
    };
  }, [baseNightlyPrice, previewNights, previewDiscount]);

  // Check for floor price warning
  const floorPriceWarning = previewDiscount && previewDiscount.totalPercent >= 50;

  // Save all settings
  const handleSave = async () => {
    setSaving(true);
    try {
      // Update property settings
      const { error: propError } = await supabase
        .from("properties")
        .update({
          allow_discount_stacking: settings.allow_discount_stacking,
          max_discount_cap: settings.max_discount_cap,
          first_time_rider_discount_enabled: settings.first_time_rider_discount_enabled,
          first_time_rider_discount_percent: settings.first_time_rider_discount_percent,
        })
        .eq("id", propertyId);

      if (propError) throw propError;

      // Delete and re-insert last-minute discounts
      await supabase.from("last_minute_discounts").delete().eq("property_id", propertyId);
      if (lastMinuteDiscounts.length > 0) {
        const { error } = await supabase.from("last_minute_discounts").insert(
          lastMinuteDiscounts.map((d, i) => ({
            property_id: propertyId,
            tier: i + 1,
            days_before_checkin: d.days_before_checkin,
            discount_percent: d.discount_percent,
            enabled: d.enabled,
          }))
        );
        if (error) throw error;
      }

      // Delete and re-insert length-of-stay discounts
      await supabase.from("length_of_stay_discounts").delete().eq("property_id", propertyId);
      if (lengthOfStayDiscounts.length > 0) {
        const { error } = await supabase.from("length_of_stay_discounts").insert(
          lengthOfStayDiscounts.map(d => ({
            property_id: propertyId,
            min_nights: d.min_nights,
            discount_percent: d.discount_percent,
            enabled: d.enabled,
          }))
        );
        if (error) throw error;
      }

      // Delete and re-insert seasonal discounts
      await supabase.from("seasonal_discounts").delete().eq("property_id", propertyId);
      if (seasonalDiscounts.length > 0) {
        const { error } = await supabase.from("seasonal_discounts").insert(
          seasonalDiscounts.map(d => ({
            property_id: propertyId,
            name: d.name,
            start_date: d.start_date,
            end_date: d.end_date,
            discount_percent: d.discount_percent,
            enabled: d.enabled,
          }))
        );
        if (error) throw error;
      }

      toast({
        title: "Settings saved",
        description: "Your pricing settings have been updated.",
      });

      onSave?.();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  // Add new last-minute discount tier
  const addLastMinuteTier = () => {
    if (lastMinuteDiscounts.length >= 3) return;
    
    const newTier: LastMinuteDiscount = {
      tier: lastMinuteDiscounts.length + 1,
      days_before_checkin: lastMinuteDiscounts.length === 0 ? 14 : 
                           lastMinuteDiscounts.length === 1 ? 7 : 3,
      discount_percent: lastMinuteDiscounts.length === 0 ? 5 : 
                        lastMinuteDiscounts.length === 1 ? 10 : 15,
      enabled: true,
    };
    setLastMinuteDiscounts([...lastMinuteDiscounts, newTier]);
  };

  // Add new length-of-stay discount
  const addLengthOfStayDiscount = () => {
    const newDiscount: LengthOfStayDiscount = {
      min_nights: lengthOfStayDiscounts.length === 0 ? 7 : 14,
      discount_percent: 10,
      enabled: true,
    };
    setLengthOfStayDiscounts([...lengthOfStayDiscounts, newDiscount]);
  };

  // Add new seasonal discount
  const addSeasonalDiscount = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    const newDiscount: SeasonalDiscount = {
      name: "Off-Season Special",
      start_date: nextMonth.toISOString().split("T")[0],
      end_date: endOfNextMonth.toISOString().split("T")[0],
      discount_percent: 15,
      enabled: true,
    };
    setSeasonalDiscounts([...seasonalDiscounts, newDiscount]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Discount Settings */}
      <div className="lg:col-span-2 space-y-6">
        {/* Last-Minute Discounts */}
        <Collapsible 
          open={sectionsOpen.lastMinute} 
          onOpenChange={(open) => setSectionsOpen(s => ({ ...s, lastMinute: open }))}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <div>
                      <CardTitle className="text-lg">Last-Minute Discounts</CardTitle>
                      <CardDescription>Fill empty nights before check-in</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lastMinuteDiscounts.some(d => d.enabled) && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {lastMinuteDiscounts.filter(d => d.enabled).length} active
                      </Badge>
                    )}
                    {sectionsOpen.lastMinute ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {lastMinuteDiscounts.map((discount, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                    <Switch
                      checked={discount.enabled}
                      onCheckedChange={(checked) => {
                        const updated = [...lastMinuteDiscounts];
                        updated[index].enabled = checked;
                        setLastMinuteDiscounts(updated);
                      }}
                    />
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Days before check-in</Label>
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          value={discount.days_before_checkin}
                          onChange={(e) => {
                            const updated = [...lastMinuteDiscounts];
                            updated[index].days_before_checkin = parseInt(e.target.value) || 1;
                            setLastMinuteDiscounts(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Discount %</Label>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={discount.discount_percent}
                          onChange={(e) => {
                            const updated = [...lastMinuteDiscounts];
                            updated[index].discount_percent = parseInt(e.target.value) || 1;
                            setLastMinuteDiscounts(updated);
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setLastMinuteDiscounts(lastMinuteDiscounts.filter((_, i) => i !== index));
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                
                {lastMinuteDiscounts.length < 3 && (
                  <Button variant="outline" onClick={addLastMinuteTier} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tier ({lastMinuteDiscounts.length}/3)
                  </Button>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Example: "14 days → 5%" means bookings made 14 or fewer days before check-in get 5% off.
                </p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Length of Stay Discounts */}
        <Collapsible 
          open={sectionsOpen.lengthOfStay} 
          onOpenChange={(open) => setSectionsOpen(s => ({ ...s, lengthOfStay: open }))}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">Length of Stay Discounts</CardTitle>
                      <CardDescription>Reward longer bookings</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lengthOfStayDiscounts.some(d => d.enabled) && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {lengthOfStayDiscounts.filter(d => d.enabled).length} active
                      </Badge>
                    )}
                    {sectionsOpen.lengthOfStay ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {lengthOfStayDiscounts.map((discount, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                    <Switch
                      checked={discount.enabled}
                      onCheckedChange={(checked) => {
                        const updated = [...lengthOfStayDiscounts];
                        updated[index].enabled = checked;
                        setLengthOfStayDiscounts(updated);
                      }}
                    />
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Minimum nights</Label>
                        <Input
                          type="number"
                          min="2"
                          max="90"
                          value={discount.min_nights}
                          onChange={(e) => {
                            const updated = [...lengthOfStayDiscounts];
                            updated[index].min_nights = parseInt(e.target.value) || 2;
                            setLengthOfStayDiscounts(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Discount %</Label>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={discount.discount_percent}
                          onChange={(e) => {
                            const updated = [...lengthOfStayDiscounts];
                            updated[index].discount_percent = parseInt(e.target.value) || 1;
                            setLengthOfStayDiscounts(updated);
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setLengthOfStayDiscounts(lengthOfStayDiscounts.filter((_, i) => i !== index));
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                
                <Button variant="outline" onClick={addLengthOfStayDiscount} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Discount
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Seasonal Discounts */}
        <Collapsible 
          open={sectionsOpen.seasonal} 
          onOpenChange={(open) => setSectionsOpen(s => ({ ...s, seasonal: open }))}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <div>
                      <CardTitle className="text-lg">Seasonal Discounts</CardTitle>
                      <CardDescription>Special rates for specific dates</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {seasonalDiscounts.some(d => d.enabled) && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        {seasonalDiscounts.filter(d => d.enabled).length} active
                      </Badge>
                    )}
                    {sectionsOpen.seasonal ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {seasonalDiscounts.map((discount, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-3">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={discount.enabled}
                        onCheckedChange={(checked) => {
                          const updated = [...seasonalDiscounts];
                          updated[index].enabled = checked;
                          setSeasonalDiscounts(updated);
                        }}
                      />
                      <Input
                        placeholder="Season name (e.g., Winter Sale)"
                        value={discount.name}
                        onChange={(e) => {
                          const updated = [...seasonalDiscounts];
                          updated[index].name = e.target.value;
                          setSeasonalDiscounts(updated);
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSeasonalDiscounts(seasonalDiscounts.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Start date</Label>
                        <Input
                          type="date"
                          value={discount.start_date}
                          onChange={(e) => {
                            const updated = [...seasonalDiscounts];
                            updated[index].start_date = e.target.value;
                            setSeasonalDiscounts(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">End date</Label>
                        <Input
                          type="date"
                          value={discount.end_date}
                          onChange={(e) => {
                            const updated = [...seasonalDiscounts];
                            updated[index].end_date = e.target.value;
                            setSeasonalDiscounts(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Discount %</Label>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={discount.discount_percent}
                          onChange={(e) => {
                            const updated = [...seasonalDiscounts];
                            updated[index].discount_percent = parseInt(e.target.value) || 1;
                            setSeasonalDiscounts(updated);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" onClick={addSeasonalDiscount} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Seasonal Discount
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* First-Time Rider Discount */}
        <Collapsible 
          open={sectionsOpen.firstTime} 
          onOpenChange={(open) => setSectionsOpen(s => ({ ...s, firstTime: open }))}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-green-600" />
                    <div>
                      <CardTitle className="text-lg">First-Time Rider Discount</CardTitle>
                      <CardDescription>Welcome new platform users</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {settings.first_time_rider_discount_enabled && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {settings.first_time_rider_discount_percent}% off
                      </Badge>
                    )}
                    {sectionsOpen.firstTime ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable first-time discount</Label>
                    <p className="text-sm text-muted-foreground">
                      Offer a discount to guests making their first booking on Cantra
                    </p>
                  </div>
                  <Switch
                    checked={settings.first_time_rider_discount_enabled}
                    onCheckedChange={(checked) => 
                      setSettings(s => ({ ...s, first_time_rider_discount_enabled: checked }))
                    }
                  />
                </div>
                
                {settings.first_time_rider_discount_enabled && (
                  <div>
                    <Label>Discount percentage</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[settings.first_time_rider_discount_percent]}
                        onValueChange={([value]) => 
                          setSettings(s => ({ ...s, first_time_rider_discount_percent: value }))
                        }
                        min={5}
                        max={25}
                        step={5}
                        className="flex-1"
                      />
                      <span className="w-12 text-right font-medium">
                        {settings.first_time_rider_discount_percent}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Discount Stacking */}
        <Collapsible 
          open={sectionsOpen.stacking} 
          onOpenChange={(open) => setSectionsOpen(s => ({ ...s, stacking: open }))}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-amber-600" />
                    <div>
                      <CardTitle className="text-lg">Discount Stacking</CardTitle>
                      <CardDescription>Control how multiple discounts interact</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={settings.allow_discount_stacking ? "bg-amber-100 text-amber-800" : ""}>
                      {settings.allow_discount_stacking ? "Stacking ON" : "Best only"}
                    </Badge>
                    {sectionsOpen.stacking ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    By default, only the <strong>single highest discount</strong> applies to each booking. 
                    This prevents accidental underpricing.
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow discount stacking</Label>
                    <p className="text-sm text-muted-foreground">
                      Let multiple discounts combine (advanced)
                    </p>
                  </div>
                  <Switch
                    checked={settings.allow_discount_stacking}
                    onCheckedChange={(checked) => 
                      setSettings(s => ({ ...s, allow_discount_stacking: checked }))
                    }
                  />
                </div>
                
                {settings.allow_discount_stacking && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">
                        With stacking enabled, multiple discounts can combine. Set a maximum cap to prevent excessive discounts.
                      </p>
                    </div>
                    
                    <div>
                      <Label>Maximum combined discount</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[settings.max_discount_cap]}
                          onValueChange={([value]) => 
                            setSettings(s => ({ ...s, max_discount_cap: value }))
                          }
                          min={10}
                          max={50}
                          step={5}
                          className="flex-1"
                        />
                        <span className="w-12 text-right font-medium">
                          {settings.max_discount_cap}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Pricing Settings
            </>
          )}
        </Button>
      </div>

      {/* Right Column - Sticky Preview Pane */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 space-y-4">
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Live Pricing Preview
              </CardTitle>
              <CardDescription>
                See how discounts affect your bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preview Controls */}
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nights stayed</Label>
                  <div className="flex items-center gap-4 mt-1">
                    <Slider
                      value={[previewNights]}
                      onValueChange={([value]) => setPreviewNights(value)}
                      min={1}
                      max={14}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-8 text-right font-medium">{previewNights}</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Days before check-in</Label>
                  <div className="flex items-center gap-4 mt-1">
                    <Slider
                      value={[previewDaysBeforeCheckin]}
                      onValueChange={([value]) => setPreviewDaysBeforeCheckin(value)}
                      min={1}
                      max={30}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-8 text-right font-medium">{previewDaysBeforeCheckin}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">First-time booking</Label>
                  <Switch
                    checked={previewIsFirstTime}
                    onCheckedChange={setPreviewIsFirstTime}
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* Price Display */}
              <div className="space-y-3">
                <div className="text-center pb-2">
                  <p className="text-sm text-muted-foreground">Guest pays</p>
                  <p className="text-3xl font-bold">
                    £{previewPrices.total.toFixed(2)}
                  </p>
                  {previewDiscount && (
                    <p className="text-sm text-green-600 font-medium">
                      {previewDiscount.totalPercent}% discount applied
                    </p>
                  )}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      £{previewPrices.nightlyRate.toFixed(2)} × {previewNights} nights
                    </span>
                    <span>£{previewPrices.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {previewDiscount && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        Discount ({previewDiscount.discounts.map(d => d.name).join(" + ")})
                      </span>
                      <span>-£{previewPrices.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service fee (15%)</span>
                    <span>£{previewPrices.serviceFee.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-medium">
                    <span>Estimated host payout</span>
                    <span className="text-primary">£{previewPrices.hostPayout.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Stacking Status */}
                {previewDiscount && (
                  <div className={`text-xs p-2 rounded ${previewDiscount.stacked ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"}`}>
                    {previewDiscount.stacked 
                      ? `✓ ${previewDiscount.discounts.length} discounts stacked (${previewDiscount.totalPercent}% total, max ${settings.max_discount_cap}%)`
                      : `✓ Best discount applied: ${previewDiscount.discounts[0].name}`
                    }
                  </div>
                )}
                
                {!previewDiscount && (
                  <div className="text-xs p-2 rounded bg-muted text-muted-foreground">
                    No discounts apply to this scenario
                  </div>
                )}
              </div>
              
              {/* Floor Price Warning */}
              {floorPriceWarning && (
                <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Low nightly rate</strong><br />
                    This booking would be priced at £{previewPrices.discountedSubtotal.toFixed(2)}, 
                    significantly below your base rate of £{previewPrices.subtotal.toFixed(2)}.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Reset Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setPreviewNights(3);
                  setPreviewDaysBeforeCheckin(7);
                  setPreviewIsFirstTime(false);
                }}
              >
                Reset to typical booking
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

