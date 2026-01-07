import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { PropertyCard } from "@/components/property-card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Home, Shield, MapPin, Star, Users, Compass } from "lucide-react";

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

      {/* Why Cantra */}
      <section className="py-16 bg-background border-b">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-3xl font-bold text-center mb-12">
            Why Choose Cantra?
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
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
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
              <div className="relative bg-gradient-to-br from-green-100 to-green-50 rounded-xl h-80 overflow-hidden shadow-lg">
                {/* Decorative map illustration */}
                <div className="absolute inset-0 opacity-20">
                  <svg viewBox="0 0 400 300" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                    {/* Paths representing routes */}
                    <path d="M50,150 Q100,100 150,120 T250,100 T350,150" stroke="#92400e" strokeWidth="3" fill="none" strokeDasharray="5,3"/>
                    <path d="M30,200 Q80,180 130,220 T230,180 T330,220" stroke="#2563eb" strokeWidth="3" fill="none"/>
                    <path d="M70,250 Q120,200 170,230 T270,200 T370,240" stroke="#16a34a" strokeWidth="3" fill="none"/>
                    {/* Decorative dots */}
                    <circle cx="150" cy="120" r="6" fill="#92400e"/>
                    <circle cx="250" cy="100" r="6" fill="#92400e"/>
                    <circle cx="130" cy="220" r="6" fill="#2563eb"/>
                    <circle cx="230" cy="180" r="6" fill="#2563eb"/>
                    <circle cx="170" cy="230" r="6" fill="#16a34a"/>
                    <circle cx="270" cy="200" r="6" fill="#16a34a"/>
                  </svg>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center px-6">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <p className="text-lg font-semibold text-primary">Find routes near your stay</p>
                    <p className="text-sm text-muted-foreground mt-2">
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
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
              Share Your Property with Equestrians
            </h2>
            <p className="text-xl mb-8 opacity-90 leading-relaxed">
            Do you have stables, paddocks, or equine facilities? List your property on Cantra 
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

