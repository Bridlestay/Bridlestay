import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { PropertyCard } from "@/components/property-card";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Home, Shield, Users, Compass } from "lucide-react";

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
    .limit(8);

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
      {/* Photo Hero */}
      <section className="pt-2 md:pt-3 pb-10 md:pb-16">
        <div className="max-w-[1800px] mx-auto px-2 md:px-4">
          <div className="relative overflow-hidden rounded-3xl shadow-xl h-[420px] md:h-[560px]">
            <Image
              src="/photo-hero.png"
              alt="Horses grazing in a UK countryside paddock"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1800px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 px-6 md:px-12 pb-16 md:pb-24 text-white">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="font-serif text-3xl md:text-6xl font-bold mb-3 md:mb-4 drop-shadow-lg">
                  Discover Your Perfect Equestrian Escape
                </h1>
                <p className="text-base md:text-xl mb-6 md:mb-8 text-white/95 drop-shadow">
                  Explore the UK&apos;s finest countryside stays for you and your horses
                </p>
                <SearchBar />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Stays */}
      <section className="pb-10 md:pb-16">
        <div className="max-w-[1800px] mx-auto px-2 md:px-4">
          <h2 className="font-serif text-2xl md:text-4xl font-bold mb-6 md:mb-8">
            Featured Stays
          </h2>
          {properties && properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

      {/* Why padoq */}
      <section className="py-10 md:py-16 bg-background border-b">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">
            Why Choose padoq?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Home className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Horse-Friendly Stays</h3>
              <p className="text-muted-foreground text-sm">
                Every property includes stables, paddocks, or livery facilities for your horses
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Verified Facilities</h3>
              <p className="text-muted-foreground text-sm">
                Properties with verified equine facilities so you know exactly what to expect
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Compass className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Riding Routes</h3>
              <p className="text-muted-foreground text-sm">
                Discover, create and ride routes all across the UK
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Community Reviews</h3>
              <p className="text-muted-foreground text-sm">
                Real reviews from fellow equestrians on properties and routes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Routes Teaser */}
      <section className="py-10 md:py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1">
              <h2 className="font-serif text-2xl md:text-4xl font-bold mb-4">
                Explore Riding Routes
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Discover curated trails across the Cotswolds, New Forest, and
                Exmoor. Each route includes points of interest, terrain details,
                and local recommendations.
              </p>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-amber-600"></div>
                  <span>Bridleways</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span>BOATs</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span>User Routes</span>
                </div>
              </div>
              <Link href="/routes">
                <Button size="lg">
                  <Compass className="mr-2 h-5 w-5" />
                  Browse Routes
                </Button>
              </Link>
            </div>
            <div className="flex-1">
              <div className="relative rounded-2xl h-80 overflow-hidden shadow-lg">
                <Image
                  src="/Find-Routes-Image-2.png"
                  alt="Riding routes across UK countryside"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center px-6">
                    <p className="text-xl md:text-2xl font-semibold text-primary drop-shadow-md">
                      Find routes near your stay
                    </p>
                    <p className="text-sm text-foreground/80 mt-2 drop-shadow-sm">
                      Browse bridleways, byways, and community-created riding trails
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Host CTA */}
      <section className="py-12 md:py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-5xl font-bold mb-4 md:mb-6">
              Share Your Property with Equestrians
            </h2>
            <p className="text-xl mb-8 opacity-90 leading-relaxed">
            Do you have stables, paddocks, or equine facilities? List your property on padoq 
            and welcome horse owners looking for their perfect countryside escape.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/host">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Start Hosting
                </Button>
              </Link>
              <Link href="/how-it-works/hosts">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
    </>
  );
}

