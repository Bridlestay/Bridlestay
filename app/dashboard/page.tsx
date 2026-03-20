import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { GuestDashboard } from "@/components/dashboard/guest-dashboard";
import { HostDashboard } from "@/components/dashboard/host-dashboard";

export default async function DashboardPage() {
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

  if (!userData) {
    redirect("/auth/sign-in");
  }

  // Redirect admins to admin dashboard
  if (userData.role === "admin") {
    redirect("/admin/dashboard");
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-2xl md:text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {userData.name}
          </p>
        </div>

        {userData.role === "host" && <HostDashboard user={userData} />}
        {userData.role === "guest" && <GuestDashboard user={userData} />}
        </div>
      </main>
    </>
  );
}

