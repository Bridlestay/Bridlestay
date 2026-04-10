"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatGBP } from "@/lib/fees";
import { format } from "date-fns";
import { DollarSign, TrendingUp, Clock, Receipt, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EarningsData {
  totalEarnings: number;
  monthlyEarnings: number;
  yearlyEarnings: number;
  pendingPayouts: number;
  bookingHistory: any[];
  taxBreakdown: {
    totalRevenue: number;
    hostFees: number;
    vat: number;
    netEarnings: number;
  };
}

export function EarningsDashboard() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const response = await fetch("/api/host/earnings");
      const result = await response.json();

      if (response.ok) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/host/earnings/export");
      
      if (!response.ok) {
        throw new Error("Failed to export earnings");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Earnings exported successfully!");
    } catch (error) {
      console.error("Error exporting earnings:", error);
      toast.error("Failed to export earnings");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load earnings data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleExportCSV} 
          disabled={isExporting}
          variant="outline"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </>
          )}
        </Button>
      </div>

      {/* Earnings Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatGBP(data.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">All-time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatGBP(data.monthlyEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "MMMM yyyy")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Year</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatGBP(data.yearlyEarnings)}</div>
            <p className="text-xs text-muted-foreground">{new Date().getFullYear()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatGBP(data.pendingPayouts)}</div>
            <p className="text-xs text-muted-foreground">Upcoming bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for History and Tax Breakdown */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Booking History</TabsTrigger>
          <TabsTrigger value="tax">Tax & VAT Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Earnings History</CardTitle>
            </CardHeader>
            <CardContent>
              {data.bookingHistory.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No bookings yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Base Price</TableHead>
                      <TableHead>Fees & VAT</TableHead>
                      <TableHead>Net Earnings</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.bookingHistory.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.propertyName}
                        </TableCell>
                        <TableCell>{booking.guestName}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(booking.startDate), "dd MMM")} -{" "}
                          {format(new Date(booking.endDate), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>{formatGBP(booking.basePrice)}</TableCell>
                        <TableCell className="text-red-600">
                          -{formatGBP(booking.hostFee + booking.hostVat)}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {formatGBP(booking.netEarnings)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Receipt className="h-5 w-5" />
              <CardTitle>Tax & VAT Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Total Revenue</span>
                    <span className="text-lg font-bold">
                      {formatGBP(data.taxBreakdown.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium">Platform Fees (2.5%)</span>
                    <span className="text-lg font-bold text-red-600">
                      -{formatGBP(data.taxBreakdown.hostFees)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium">VAT on Fees (20%)</span>
                    <span className="text-lg font-bold text-red-600">
                      -{formatGBP(data.taxBreakdown.vat)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                    <span className="text-sm font-bold">Net Earnings</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatGBP(data.taxBreakdown.netEarnings)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold mb-2">Tax Information</h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• Platform fee: 2.5% of booking value</li>
                      <li>• VAT charged on platform fees only</li>
                      <li>• You receive 97.5% of booking value (minus VAT on fees)</li>
                      <li>• Consider consulting a tax advisor for your tax obligations</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold mb-2 text-yellow-900">Note</h4>
                    <p className="text-sm text-yellow-900">
                      These figures are for reference only. Please consult with a qualified
                      accountant for accurate tax reporting.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


