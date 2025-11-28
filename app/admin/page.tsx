import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
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

  if (!userData || userData.role !== "admin") {
    redirect("/");
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <AdminDashboard user={userData} />
      </main>
    </>
  );
}



