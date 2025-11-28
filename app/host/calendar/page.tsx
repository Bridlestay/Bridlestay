import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { BookingCalendar } from "@/components/host/booking-calendar";

export default async function HostCalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "host") {
    redirect("/dashboard");
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2">Booking Calendar</h1>
            <p className="text-muted-foreground">
              Manage your bookings and sync with your calendar
            </p>
          </div>

          <BookingCalendar />
        </div>
      </main>
    </>
  );
}



