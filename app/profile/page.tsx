import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { ProfileSidebar } from "@/components/profile/profile-sidebar";
import { AboutMeSection } from "@/components/profile/about-me-section";
import { TripsSection } from "@/components/profile/trips-section";
import { ReviewsSection } from "@/components/profile/reviews-section";
import { HorsesSection } from "@/components/profile/horses-section";
import { BadgesSection } from "@/components/profile/badges-section";
import { ReferralsSection } from "@/components/profile/referrals-section";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("*, featured_badge:badges!users_featured_badge_id_fkey(id, name, icon, tier, description)")
    .eq("id", user.id)
    .single();

  if (!userData) {
    redirect("/auth/sign-in");
  }

  // Get bookings count
  const { data: completedBookings } = await supabase
    .from("bookings")
    .select("*, properties(name, city, county)")
    .eq("guest_id", user.id)
    .eq("status", "completed")
    .order("end_date", { ascending: false });

  const { count: reviewsCount } = await supabase
    .from("property_reviews")
    .select("*", { count: "exact", head: true })
    .eq("reviewer_id", user.id);

  const { count: horsesCount } = await supabase
    .from("user_horses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const activeSection = params.section || "about";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <ProfileSidebar activeSection={activeSection} />

            {/* Main Content */}
            <div className="lg:col-span-3">
              {activeSection === "about" && (
                <AboutMeSection
                  user={userData}
                  reviewsCount={reviewsCount || 0}
                  tripsCount={completedBookings?.length || 0}
                  horsesCount={horsesCount || 0}
                />
              )}
              {activeSection === "badges" && (
                <BadgesSection userId={user.id} isOwnProfile={true} />
              )}
              {activeSection === "trips" && (
                <TripsSection bookings={completedBookings || []} />
              )}
              {activeSection === "horses" && (
                <HorsesSection userId={user.id} />
              )}
              {activeSection === "reviews" && (
                <ReviewsSection userId={user.id} />
              )}
              {activeSection === "referrals" && (
                <ReferralsSection userId={user.id} userName={userData.name || ""} />
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

