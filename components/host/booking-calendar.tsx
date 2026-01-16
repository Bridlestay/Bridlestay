"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from "date-fns";
import enUS from "date-fns/locale/en-US";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Download,
  ExternalLink,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatGBP } from "@/lib/fees";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-US': enUS,
  },
});

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  num_guests: number;
  num_horses: number;
  total_charge_pennies: number;
  properties: {
    id: string;
    name: string;
  };
  users: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Booking;
}

export function BookingCalendar() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchCalendarData = useCallback(async () => {
    try {
      const startDate = view === 'month' 
        ? new Date(date.getFullYear(), date.getMonth(), 1)
        : new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7);
      
      const endDate = view === 'month'
        ? new Date(date.getFullYear(), date.getMonth() + 1, 0)
        : new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);

      const response = await fetch(
        `/api/host/calendar?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );
      const data = await response.json();

      if (response.ok) {
        setBookings(data.bookings || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching calendar:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load calendar data",
      });
    } finally {
      setLoading(false);
    }
  }, [date, view, toast]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const events: CalendarEvent[] = useMemo(() => {
    return bookings.map((booking) => ({
      id: booking.id,
      title: `${booking.properties.name} - ${booking.users.name}`,
      start: new Date(booking.start_date),
      end: new Date(booking.end_date),
      resource: booking,
    }));
  }, [bookings]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const status = event.resource.status;
    let backgroundColor = '#3174ad';
    
    // Map status to colors
    if (status === 'accepted' || status === 'confirmed') backgroundColor = '#10b981'; // green
    if (status === 'requested' || status === 'pending') backgroundColor = '#f59e0b'; // orange
    if (status === 'declined') backgroundColor = '#ef4444'; // red
    if (status === 'cancelled') backgroundColor = '#6b7280'; // gray
    if (status === 'completed') backgroundColor = '#3b82f6'; // blue

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.85rem',
        padding: '2px 5px',
      },
    };
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedBooking(event.resource);
    setDialogOpen(true);
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const downloadICal = async () => {
    try {
      const response = await fetch('/api/host/calendar/ical');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cantra-bookings.ics';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Calendar downloaded",
          description: "Import the .ics file into your calendar app",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download calendar",
      });
    }
  };

  const addToGoogleCalendar = () => {
    const icalUrl = `${window.location.origin}/api/host/calendar/ical`;
    
    // Copy URL to clipboard
    navigator.clipboard.writeText(icalUrl).then(() => {
      toast({
        title: "Calendar URL copied!",
        description: "Paste this into Google Calendar → Settings → Add calendar → From URL",
      });
    }).catch(() => {
      // Fallback: show URL in alert
      alert(`Copy this URL and paste it into Google Calendar:\n\n${icalUrl}\n\nGoogle Calendar → Settings → Add calendar → From URL`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{stats?.totalBookings || 0}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{stats?.confirmedBookings || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.pendingBookings || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatGBP(stats?.totalRevenue || 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Booking Calendar</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadICal}>
                <Download className="mr-2 h-4 w-4" />
                Download .ics
              </Button>
              <Button variant="outline" size="sm" onClick={addToGoogleCalendar}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Copy Calendar URL
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              <span className="w-2 h-2 rounded-full bg-green-600 mr-1"></span>
              Accepted
            </Badge>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
              <span className="w-2 h-2 rounded-full bg-orange-600 mr-1"></span>
              Requested
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
              <span className="w-2 h-2 rounded-full bg-blue-600 mr-1"></span>
              Completed
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
              <span className="w-2 h-2 rounded-full bg-red-600 mr-1"></span>
              Declined
            </Badge>
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
              <span className="w-2 h-2 rounded-full bg-gray-500 mr-1"></span>
              Cancelled
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">Loading calendar...</p>
            </div>
          ) : (
            <div className="h-[600px]">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                view={view}
                onView={handleViewChange}
                date={date}
                onNavigate={handleNavigate}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week']}
                popup
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              {selectedBooking?.properties.name}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Guest</p>
                <p className="text-sm text-muted-foreground">{selectedBooking.users.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Check-in</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedBooking.start_date), 'PPP')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Check-out</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedBooking.end_date), 'PPP')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Guests</p>
                  <p className="text-sm text-muted-foreground">{selectedBooking.num_guests}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Horses</p>
                  <p className="text-sm text-muted-foreground">{selectedBooking.num_horses}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge
                  variant={selectedBooking.status === 'confirmed' ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {selectedBooking.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-lg font-bold">{formatGBP(selectedBooking.total_charge_pennies)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

