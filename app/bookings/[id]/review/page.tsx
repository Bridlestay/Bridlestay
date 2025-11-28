import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyReviewForm } from "@/components/reviews/property-review-form";
import { UserReviewForm } from "@/components/reviews/user-review-form";

export default async function BookingReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Get booking details
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      *,
      properties!inner(id, name, host_id, host:host_id(name)),
      guest:guest_id(name)
    `)
    .eq("id", id)
    .single();

  if (error || !booking) {
    notFound();
  }

  // Check if user is part of this booking (guest or host)
  const isGuest = user.id === booking.guest_id;
  const isHost = user.id === booking.properties.host_id;

  if (!isGuest && !isHost) {
    redirect("/dashboard");
  }

  // Check if booking is completed
  if (booking.status !== "confirmed" || new Date(booking.end_date) > new Date()) {
    redirect(`/dashboard?error=booking_not_completed`);
  }

  // Check if review already exists
  if (isGuest) {
    const { data: existingReview } = await supabase
      .from("property_reviews")
      .select("id")
      .eq("booking_id", id)
      .eq("reviewer_id", user.id)
      .single();

    if (existingReview) {
      redirect(`/dashboard?message=review_already_submitted`);
    }
  } else if (isHost) {
    const { data: existingReview } = await supabase
      .from("user_reviews")
      .select("id")
      .eq("booking_id", id)
      .eq("reviewer_id", user.id)
      .single();

    if (existingReview) {
      redirect(`/dashboard?message=review_already_submitted`);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2">Leave a Review</h1>
            <p className="text-muted-foreground">
              Share your experience from your recent {isGuest ? "stay" : "hosting"}
            </p>
          </div>

          {/* Booking Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Property:</span>
                <span className="font-medium">{booking.properties.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {isGuest ? "Host:" : "Guest:"}
                </span>
                <span className="font-medium">
                  {isGuest ? booking.properties.host.name : booking.guest.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in:</span>
                <span>{new Date(booking.start_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-out:</span>
                <span>{new Date(booking.end_date).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Review Form */}
          {isGuest ? (
            <PropertyReviewForm
              propertyId={booking.properties.id}
              propertyName={booking.properties.name}
              bookingId={booking.id}
              onReviewSubmitted={() => redirect("/dashboard?message=review_submitted")}
            />
          ) : (
            <UserReviewForm
              userId={booking.guest_id}
              userName={booking.guest.name}
              bookingId={booking.id}
              onReviewSubmitted={() => redirect("/dashboard?message=review_submitted")}
            />
          )}
        </div>
      </main>
    </>
  );
}

