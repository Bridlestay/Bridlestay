import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Header } from "@/components/header";
import { PricingManager } from "@/components/host/pricing-manager";
import { AdvancedPricingSettings } from "@/components/host/advanced-pricing-settings";

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
    .select("id, name, host_id, nightly_price_pennies, published")
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
            <h1 className="font-serif text-4xl font-bold mb-2">Pricing & Discounts</h1>
            <p className="text-muted-foreground">
              Configure pricing rules for <span className="font-semibold">{property.name}</span>
            </p>
          </div>
          
          {/* Show advanced pricing only for published properties */}
          {property.published ? (
            <div className="space-y-8">
              <AdvancedPricingSettings 
                propertyId={propertyId}
                baseNightlyPrice={property.nightly_price_pennies || 0}
              />
              
              <div className="pt-8 border-t">
                <h2 className="font-serif text-2xl font-bold mb-4">Custom Pricing Rules</h2>
                <PricingManager propertyId={propertyId} />
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Advanced pricing options are available after your listing is published.
              </p>
              <p className="text-sm text-muted-foreground">
                Complete your listing setup and submit for verification to unlock these features.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

