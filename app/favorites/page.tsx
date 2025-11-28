import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Search } from "lucide-react";
import Link from "next/link";

export default async function FavoritesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Get user's favorites with full property details
  const { data: favorites } = await supabase
    .from("favorites")
    .select(`
      id,
      created_at,
      property:properties (
        *,
        property_photos (url, "order", is_cover),
        property_amenities (*),
        property_equine (*)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Extract properties from favorites
  const favoritedProperties = favorites?.map((fav) => (fav as any).property).filter(Boolean) || [];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Heart className="h-8 w-8 fill-red-500 text-red-500" />
                <h1 className="font-serif text-4xl font-bold">My Favorites</h1>
              </div>
              <p className="text-muted-foreground">
                {favoritedProperties.length === 0
                  ? "Start saving your favorite properties"
                  : `${favoritedProperties.length} ${
                      favoritedProperties.length === 1 ? "property" : "properties"
                    } saved`}
              </p>
            </div>

            {/* Favorites Grid */}
            {favoritedProperties.length === 0 ? (
              <Card className="p-12">
                <div className="flex flex-col items-center text-center max-w-md mx-auto">
                  <div className="rounded-full bg-muted p-6 mb-6">
                    <Heart className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h2 className="font-serif text-2xl font-semibold mb-2">
                    No favorites yet
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Click the heart icon on any property to save it here. Build your collection of dream equestrian stays!
                  </p>
                  <div className="flex gap-3">
                    <Button asChild>
                      <Link href="/search">
                        <Search className="mr-2 h-4 w-4" />
                        Search Properties
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/">Browse Home</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoritedProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}


