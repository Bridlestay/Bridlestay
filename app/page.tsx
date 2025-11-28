import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { PropertyCard } from "@/components/property-card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch published properties with photos and favorite counts
  const { data: properties } = await supabase
    .from("properties")
    .select(`
      *,
      property_photos (url, is_cover, order),
      property_equine (max_horses, arena_indoor, arena_outdoor, direct_bridleway_access)
    `)
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(6);

  // Add favorite counts to each property
  if (properties) {
    for (const property of properties) {
      const { count } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("property_id", property.id);
      (property as any).favorite_count = count || 0;
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <h1 className="font-serif text-5xl md:text-7xl font-bold mb-6">
            Discover Your Perfect
            <br />
            Equestrian Escape
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-green-50">
            Explore the UK&apos;s finest countryside stays for you and your horses
          </p>
          <div className="max-w-4xl mx-auto">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 bg-cream-50">
        <div className="container mx-auto px-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[
              "Country Cottages",
              "Arena Access",
              "Trailside",
              "Luxury Stables",
              "Coastal Rides",
              "Mountain Routes",
            ].map((category) => (
              <Button
                key={category}
                variant="outline"
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-4xl font-bold mb-8">
            Featured Properties
          </h2>
          {properties && properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground mb-4">
                No properties available yet
              </p>
              <Link href="/host">
                <Button>Become a Host</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Routes Teaser */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="font-serif text-4xl font-bold mb-4">
                Explore Riding Routes
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Discover curated trails across the Cotswolds, New Forest, and
                Exmoor. Each route includes points of interest, terrain details,
                and local recommendations.
              </p>
              <Link href="/routes">
                <Button size="lg">Browse Routes</Button>
              </Link>
            </div>
            <div className="flex-1 bg-muted rounded-lg h-80 flex items-center justify-center">
              <p className="text-muted-foreground">Map Preview</p>
            </div>
          </div>
        </div>
      </section>

      {/* Host CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-4xl font-bold mb-4">
            Share Your Property with Equestrians
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Earn extra income while welcoming horse lovers to your countryside
            property
          </p>
          <Link href="/host">
            <Button size="lg" variant="secondary">
              Become a Host
            </Button>
          </Link>
        </div>
      </section>
    </main>
    </>
  );
}

