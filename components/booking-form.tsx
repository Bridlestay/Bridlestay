"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceBreakdownDisplay } from "@/components/price-breakdown";
import { calculatePriceBreakdown } from "@/lib/fees";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { HorseSelector } from "@/components/booking/horse-selector";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface BookingFormProps {
  propertyId: string;
  property: any;
}

function PaymentForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Payment failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Booking request sent!",
          description: "Your payment is being held. The host will review your request.",
        });
        onSuccess();
      }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={!stripe || loading}>
        {loading ? "Processing..." : "Confirm & Request Booking"}
      </Button>
    </form>
  );
}

export function BookingForm({ propertyId, property }: BookingFormProps) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [horses, setHorses] = useState(1);
  const [selectedHorseIds, setSelectedHorseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Check user verification status
  useEffect(() => {
    const checkVerification = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("admin_verified")
          .eq("id", user.id)
          .single();
        
        setIsVerified(userData?.admin_verified || false);
      }
      setCheckingVerification(false);
    };

    checkVerification();
  }, []);

  // Fetch blocked dates
  useEffect(() => {
    const fetchBlockedDates = async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}/blocked-dates`);
        if (res.ok) {
          const data = await res.json();
          setBlockedDates(data.blockedDates || []);
        }
      } catch (error) {
        console.error("Error fetching blocked dates:", error);
      } finally {
        setLoadingDates(false);
      }
    };

    fetchBlockedDates();
  }, [propertyId]);

  // Sync horses count with selected horse IDs
  useEffect(() => {
    setHorses(selectedHorseIds.length);
  }, [selectedHorseIds]);

  const nights =
    checkIn && checkOut
      ? differenceInDays(new Date(checkOut), new Date(checkIn))
      : 0;

  // Calculate total base amount including per-horse fees and cleaning
  const calculateTotalBasePennies = () => {
    if (nights <= 0) return 0;
    
    let total = property.nightly_price_pennies * nights;
    
    // Add per-horse fee if applicable
    if (property.per_horse_fee_pennies && horses > 0) {
      total += property.per_horse_fee_pennies * horses * nights;
    }
    
    // Add cleaning fee (one-time)
    if (property.cleaning_fee_pennies) {
      total += property.cleaning_fee_pennies;
    }
    
    return total;
  };

  const breakdown =
    nights > 0
      ? calculatePriceBreakdown(calculateTotalBasePennies())
      : null;

  const handleBookingRequest = async () => {
    if (!checkIn || !checkOut) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select check-in and check-out dates",
      });
      return;
    }

    if (nights < 1) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Minimum stay is 1 night",
      });
      return;
    }

    // Validate horse requirement - at least 1 horse required
    if (horses < 1) {
      toast({
        variant: "destructive",
        title: "Horse Required",
        description: "Bridlestay is for equestrian accommodation - you must bring at least 1 horse to book.",
      });
      return;
    }

    // Validate guest count
    if (guests > property.max_guests) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `This property can only accommodate ${property.max_guests} guests`,
      });
      return;
    }

    // Validate horse count
    if (horses > (property.max_horses || 0)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `This property can only accommodate ${property.max_horses || 0} horses`,
      });
      return;
    }

    // Check if any selected dates are blocked
    const selectedDates: string[] = [];
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      selectedDates.push(d.toISOString().split('T')[0]);
    }
    
    const hasBlockedDates = selectedDates.some(date => blockedDates.includes(date));
    if (hasBlockedDates) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Some of your selected dates are no longer available. Please choose different dates.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/booking/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          startDate: checkIn,
          endDate: checkOut,
          guests,
          horses,
          horseIds: selectedHorseIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Booking request failed");
      }

      setClientSecret(data.clientSecret);
      setShowPayment(true);
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

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    router.push("/dashboard");
  };

  if (checkingVerification) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account must be verified before you can make bookings. 
            Please check your email or wait for admin approval.
          </AlertDescription>
        </Alert>
        <Button className="w-full" size="lg" disabled>
          Account Verification Required
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="checkIn">Check-in</Label>
            <Input
              id="checkIn"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              disabled={loadingDates}
            />
            {loadingDates && (
              <p className="text-xs text-muted-foreground mt-1">Loading availability...</p>
            )}
          </div>
          <div>
            <Label htmlFor="checkOut">Check-out</Label>
            <Input
              id="checkOut"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn || new Date().toISOString().split("T")[0]}
              disabled={loadingDates}
            />
          </div>
        </div>
        
        {blockedDates.length > 0 && !loadingDates && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Some dates are unavailable due to existing bookings or host blocks.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="guests">Guests</Label>
            <Input
              id="guests"
              type="number"
              min="1"
              max={property.max_guests}
              value={guests}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setGuests(Math.min(val, property.max_guests));
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Max: {property.max_guests} guests
            </p>
          </div>
          <div>
            <Label htmlFor="horses">Number of Horses</Label>
            <Input
              id="horses"
              type="number"
              min="1"
              max={property.max_horses || 0}
              value={horses}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Select your horses below (minimum 1 required)
            </p>
          </div>
        </div>

        {/* Horse Selector */}
        {property.max_horses && property.max_horses > 0 && (
          <HorseSelector
            maxHorses={property.max_horses}
            selectedHorseIds={selectedHorseIds}
            onSelectionChange={setSelectedHorseIds}
          />
        )}

        {breakdown && nights > 0 && (
          <div className="border-t pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>
                  £{(property.nightly_price_pennies / 100).toFixed(2)} x {nights} night{nights > 1 ? 's' : ''}
                </span>
                <span>£{((property.nightly_price_pennies * nights) / 100).toFixed(2)}</span>
              </div>
              
              {property.per_horse_fee_pennies && horses > 0 && (
                <div className="flex justify-between">
                  <span>
                    Horse fee: £{(property.per_horse_fee_pennies / 100).toFixed(2)} x {horses} horse{horses > 1 ? 's' : ''} x {nights} night{nights > 1 ? 's' : ''}
                  </span>
                  <span>£{((property.per_horse_fee_pennies * horses * nights) / 100).toFixed(2)}</span>
                </div>
              )}
              
              {property.cleaning_fee_pennies && (
                <div className="flex justify-between">
                  <span>Cleaning fee</span>
                  <span>£{(property.cleaning_fee_pennies / 100).toFixed(2)}</span>
                </div>
              )}
              
              <div className="border-t pt-2" />
              
              <PriceBreakdownDisplay breakdown={breakdown} nights={nights} />
            </div>
          </div>
        )}

        <Button
          onClick={handleBookingRequest}
          className="w-full"
          size="lg"
          disabled={loading || !checkIn || !checkOut || nights < 1}
        >
          {loading ? "Processing..." : "Request to Book"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Your payment will be held until the host accepts your booking
        </p>
      </div>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Your Booking</DialogTitle>
          </DialogHeader>
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

