import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default async function AdminDashboardPage() {
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

  // Only admins can access
  if (userData.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Platform management and analytics
            </p>
          </div>

          <AdminDashboard user={userData} />
        </div>
      </main>
    </>
  );
}



