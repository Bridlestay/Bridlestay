"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, CalendarRange, TrendingUp, Percent } from "lucide-react";
import { format } from "date-fns";
import { formatGBP } from "@/lib/fees";

interface PricingRule {
  id: string;
  rule_type: string;
  friday_multiplier?: number;
  saturday_multiplier?: number;
  sunday_multiplier?: number;
  season_name?: string;
  season_start_date?: string;
  season_end_date?: string;
  season_price_pennies?: number;
  min_nights?: number;
  discount_percentage?: number;
  active: boolean;
  priority: number;
}

export function PricingManager({ propertyId }: { propertyId: string }) {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Weekend pricing state
  const [fridayMultiplier, setFridayMultiplier] = useState<string>("1.0");
  const [saturdayMultiplier, setSaturdayMultiplier] = useState<string>("1.2");
  const [sundayMultiplier, setSundayMultiplier] = useState<string>("1.0");

  // Seasonal pricing state
  const [seasonName, setSeasonName] = useState<string>("");
  const [seasonStartDate, setSeasonStartDate] = useState<string>("");
  const [seasonEndDate, setSeasonEndDate] = useState<string>("");
  const [seasonPrice, setSeasonPrice] = useState<string>("");

  // Long-stay discount state
  const [minNights, setMinNights] = useState<string>("7");
  const [discountPercentage, setDiscountPercentage] = useState<string>("10");

  useEffect(() => {
    fetchRules();
  }, [propertyId]);

  const fetchRules = async () => {
    try {
      const response = await fetch(`/api/host/pricing?propertyId=${propertyId}`);
      const data = await response.json();

      if (response.ok) {
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error("Error fetching pricing rules:", error);
    }
  };

  const handleCreateWeekendRule = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/host/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          ruleType: "weekend",
          friday_multiplier: parseFloat(fridayMultiplier),
          saturday_multiplier: parseFloat(saturdayMultiplier),
          sunday_multiplier: parseFloat(sundayMultiplier),
          priority: 10,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create rule");
      }

      toast({
        title: "Weekend pricing created",
        description: "Your weekend pricing rule has been saved",
      });

      fetchRules();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeasonalRule = async () => {
    if (!seasonName || !seasonStartDate || !seasonEndDate || !seasonPrice) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all seasonal pricing fields",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/host/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          ruleType: "seasonal",
          season_name: seasonName,
          season_start_date: seasonStartDate,
          season_end_date: seasonEndDate,
          season_price_pennies: Math.round(parseFloat(seasonPrice) * 100),
          priority: 20,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create rule");
      }

      toast({
        title: "Seasonal pricing created",
        description: "Your seasonal pricing rule has been saved",
      });

      // Reset form
      setSeasonName("");
      setSeasonStartDate("");
      setSeasonEndDate("");
      setSeasonPrice("");

      fetchRules();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscountRule = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/host/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          ruleType: "long_stay_discount",
          min_nights: parseInt(minNights),
          discount_percentage: parseInt(discountPercentage),
          priority: 5,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create rule");
      }

      toast({
        title: "Long-stay discount created",
        description: "Your discount rule has been saved",
      });

      fetchRules();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/host/pricing?ruleId=${ruleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete rule");
      }

      toast({
        title: "Rule deleted",
        description: "Pricing rule has been removed",
      });

      fetchRules();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="weekend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weekend">
            <TrendingUp className="mr-2 h-4 w-4" />
            Weekend Pricing
          </TabsTrigger>
          <TabsTrigger value="seasonal">
            <CalendarRange className="mr-2 h-4 w-4" />
            Seasonal Pricing
          </TabsTrigger>
          <TabsTrigger value="discounts">
            <Percent className="mr-2 h-4 w-4" />
            Long-Stay Discounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekend Price Multipliers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set price multipliers for weekend days (e.g., 1.2 = 20% increase)
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Friday Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={fridayMultiplier}
                    onChange={(e) => setFridayMultiplier(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {parseFloat(fridayMultiplier) > 1
                      ? `${((parseFloat(fridayMultiplier) - 1) * 100).toFixed(0)}% increase`
                      : parseFloat(fridayMultiplier) < 1
                      ? `${((1 - parseFloat(fridayMultiplier)) * 100).toFixed(0)}% decrease`
                      : "No change"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Saturday Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={saturdayMultiplier}
                    onChange={(e) => setSaturdayMultiplier(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {parseFloat(saturdayMultiplier) > 1
                      ? `${((parseFloat(saturdayMultiplier) - 1) * 100).toFixed(0)}% increase`
                      : parseFloat(saturdayMultiplier) < 1
                      ? `${((1 - parseFloat(saturdayMultiplier)) * 100).toFixed(0)}% decrease`
                      : "No change"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Sunday Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={sundayMultiplier}
                    onChange={(e) => setSundayMultiplier(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {parseFloat(sundayMultiplier) > 1
                      ? `${((parseFloat(sundayMultiplier) - 1) * 100).toFixed(0)}% increase`
                      : parseFloat(sundayMultiplier) < 1
                      ? `${((1 - parseFloat(sundayMultiplier)) * 100).toFixed(0)}% decrease`
                      : "No change"}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleCreateWeekendRule}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Weekend Rule"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Seasonal Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Season Name</Label>
                <Input
                  placeholder="e.g., Summer, Peak Season, Winter"
                  value={seasonName}
                  onChange={(e) => setSeasonName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={seasonStartDate}
                    onChange={(e) => setSeasonStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={seasonEndDate}
                    onChange={(e) => setSeasonEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Price per Night (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  value={seasonPrice}
                  onChange={(e) => setSeasonPrice(e.target.value)}
                />
              </div>

              <Button
                onClick={handleCreateSeasonalRule}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Seasonal Rule"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Long-Stay Discounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Offer discounts for longer stays to attract extended bookings
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Nights</Label>
                  <Input
                    type="number"
                    min="1"
                    value={minNights}
                    onChange={(e) => setMinNights(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Discount Percentage</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <span className="font-semibold">Preview:</span> {discountPercentage}% off for stays
                  of {minNights}+ nights
                </p>
              </div>

              <Button
                onClick={handleCreateDiscountRule}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Discount Rule"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Active Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Pricing Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No pricing rules yet</p>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    {rule.rule_type === "weekend" && (
                      <>
                        <p className="font-medium">Weekend Pricing</p>
                        <p className="text-sm text-muted-foreground">
                          Fri: {rule.friday_multiplier}x, Sat: {rule.saturday_multiplier}x, Sun:{" "}
                          {rule.sunday_multiplier}x
                        </p>
                      </>
                    )}
                    {rule.rule_type === "seasonal" && (
                      <>
                        <p className="font-medium">{rule.season_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(rule.season_start_date!), "MMM d")} -{" "}
                          {format(new Date(rule.season_end_date!), "MMM d, yyyy")} •{" "}
                          {formatGBP(rule.season_price_pennies!)} / night
                        </p>
                      </>
                    )}
                    {rule.rule_type === "long_stay_discount" && (
                      <>
                        <p className="font-medium">Long-Stay Discount</p>
                        <p className="text-sm text-muted-foreground">
                          {rule.discount_percentage}% off for {rule.min_nights}+ nights
                        </p>
                      </>
                    )}
                    <Badge variant="outline" className="mt-1">
                      Priority: {rule.priority}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



