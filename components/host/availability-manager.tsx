"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, CalendarDays, RepeatIcon } from "lucide-react";
import { format } from "date-fns";

interface RecurringRule {
  id: string;
  recurrence_type: string;
  day_of_week?: number;
  day_of_month?: number;
  start_date: string;
  end_date?: string;
  reason: string;
  active: boolean;
}

export function AvailabilityManager({ propertyId }: { propertyId: string }) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Recurring rule form state
  const [recurrenceType, setRecurrenceType] = useState<string>("weekly");
  const [dayOfWeek, setDayOfWeek] = useState<string>("1");
  const [dayOfMonth, setDayOfMonth] = useState<string>("1");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("unavailable");

  useEffect(() => {
    fetchRecurringRules();
  }, [propertyId]);

  const fetchRecurringRules = async () => {
    try {
      const response = await fetch(`/api/host/availability/recurring?propertyId=${propertyId}`);
      const data = await response.json();

      if (response.ok) {
        setRecurringRules(data.rules || []);
      }
    } catch (error) {
      console.error("Error fetching recurring rules:", error);
    }
  };

  const handleBulkBlock = async () => {
    if (selectedDates.length === 0) {
      toast({
        variant: "destructive",
        title: "No dates selected",
        description: "Please select at least one date to block",
      });
      return;
    }

    setLoading(true);

    try {
      const dates = selectedDates.map(d => format(d, "yyyy-MM-dd"));

      const response = await fetch("/api/host/availability/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          dates,
          reason: "unavailable",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to block dates");
      }

      toast({
        title: "Dates blocked",
        description: `Successfully blocked ${data.count} dates`,
      });

      setSelectedDates([]);
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

  const handleCreateRecurringRule = async () => {
    if (!startDate) {
      toast({
        variant: "destructive",
        title: "Start date required",
        description: "Please select a start date",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/host/availability/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          recurrenceType,
          dayOfWeek: recurrenceType === "weekly" ? parseInt(dayOfWeek) : null,
          dayOfMonth: recurrenceType === "monthly" ? parseInt(dayOfMonth) : null,
          startDate,
          endDate: endDate || null,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create rule");
      }

      toast({
        title: "Recurring rule created",
        description: "Your availability rule has been saved",
      });

      // Reset form
      setStartDate("");
      setEndDate("");
      setReason("unavailable");

      // Refresh rules
      fetchRecurringRules();
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
      const response = await fetch(`/api/host/availability/recurring?ruleId=${ruleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete rule");
      }

      toast({
        title: "Rule deleted",
        description: "Recurring rule has been removed",
      });

      fetchRecurringRules();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="bulk" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bulk">
            <CalendarDays className="mr-2 h-4 w-4" />
            Block Specific Dates
          </TabsTrigger>
          <TabsTrigger value="recurring">
            <RepeatIcon className="mr-2 h-4 w-4" />
            Recurring Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Block Multiple Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select multiple dates on the calendar to block them all at once
              </p>

              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                className="rounded-md border"
              />

              {selectedDates.length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">
                    Selected {selectedDates.length} date{selectedDates.length > 1 ? "s" : ""}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.slice(0, 10).map((date, idx) => (
                      <Badge key={idx} variant="outline">
                        {format(date, "MMM d, yyyy")}
                      </Badge>
                    ))}
                    {selectedDates.length > 10 && (
                      <Badge variant="outline">+{selectedDates.length - 10} more</Badge>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handleBulkBlock}
                disabled={loading || selectedDates.length === 0}
                className="w-full"
              >
                {loading ? "Blocking..." : `Block ${selectedDates.length} Date${selectedDates.length !== 1 ? "s" : ""}`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Recurring Rule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Recurrence Type</Label>
                <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurrenceType === "weekly" && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {recurrenceType === "monthly" && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for indefinite blocking
                </p>
              </div>

              <Button
                onClick={handleCreateRecurringRule}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Rule"}
              </Button>
            </CardContent>
          </Card>

          {/* Active Rules List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Recurring Rules</CardTitle>
            </CardHeader>
            <CardContent>
              {recurringRules.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No recurring rules yet</p>
              ) : (
                <div className="space-y-3">
                  {recurringRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {rule.recurrence_type === "weekly"
                            ? `Every ${getDayName(rule.day_of_week!)}`
                            : `Monthly on the ${rule.day_of_month}${rule.day_of_month === 1 ? "st" : rule.day_of_month === 2 ? "nd" : rule.day_of_month === 3 ? "rd" : "th"}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          From {format(new Date(rule.start_date), "MMM d, yyyy")}
                          {rule.end_date
                            ? ` until ${format(new Date(rule.end_date), "MMM d, yyyy")}`
                            : " (indefinite)"}
                        </p>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}



