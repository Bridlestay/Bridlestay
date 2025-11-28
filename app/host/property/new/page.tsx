import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { PropertyWizard } from "@/components/host/property-wizard";

export default async function NewPropertyPage() {
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
    redirect("/");
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30">
        <PropertyWizard userId={user.id} />
      </main>
    </>
  );
}


