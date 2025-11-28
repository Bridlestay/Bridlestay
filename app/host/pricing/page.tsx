import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Header } from "@/components/header";
import { PricingManager } from "@/components/host/pricing-manager";

export default async function HostPricingPage({
  searchParams,
}: {
  searchParams: { propertyId?: string };
}) {
  const { propertyId } = searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "host") {
    redirect("/dashboard");
  }

  if (!propertyId) {
    // Get first property
    const { data: properties } = await supabase
      .from("properties")
      .select("id")
      .eq("host_id", user.id)
      .limit(1);

    if (!properties || properties.length === 0) {
      redirect("/host/property/new");
    }

    redirect(`/host/pricing?propertyId=${properties[0].id}`);
  }

  // Verify property ownership
  const { data: property } = await supabase
    .from("properties")
    .select("id, name, host_id")
    .eq("id", propertyId)
    .eq("host_id", user.id)
    .single();

  if (!property) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2">Pricing Rules</h1>
            <p className="text-muted-foreground">
              Advanced pricing for <span className="font-semibold">{property.name}</span>
            </p>
          </div>
          <PricingManager propertyId={propertyId} />
        </div>
      </main>
    </>
  );
}

