"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PropertyCard } from "@/components/property-card";
import { SearchBar } from "@/components/search-bar";
import { Header } from "@/components/header";
import { SearchFilters, FilterState } from "@/components/search-filters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Home, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("created_at_desc");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    priceMin: 50,
    priceMax: 5000,
    arenaType: "any",
    propertyType: "all",
    minStables: 0,
    bridlewayAccess: false,
    wifi: false,
    parking: false,
    paddock: false,
    washBay: false,
  });

  const fetchProperties = useCallback(async (
    customFilters?: FilterState, 
    customSortBy?: string
  ) => {
    setLoading(true);
    try {
      const activeFilters = customFilters || filters;
      const activeSortBy = customSortBy || sortBy;
      
      const body: any = {
        location: searchParams.get("location"),
        county: searchParams.get("county"),
        startDate: searchParams.get("checkIn"),
        endDate: searchParams.get("checkOut"),
        guests: searchParams.get("guests"),
        horses: searchParams.get("horses"),
        sortBy: activeSortBy,
        ...activeFilters,
      };

      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setProperties(data.properties || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, searchParams]);

  useEffect(() => {
    fetchProperties();
  }, [searchParams]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    fetchProperties(newFilters, sortBy);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    fetchProperties(filters, value);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        {/* Search Header */}
        <div className="bg-primary text-primary-foreground py-6">
          <div className="container mx-auto px-4">
            <h1 className="font-serif text-2xl md:text-3xl font-bold mb-4">
              Find Your Perfect Stay
            </h1>
            <SearchBar />
          </div>
        </div>

        {/* Controls */}
        <div className="sticky top-16 z-20 bg-background border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {loading ? "Searching..." : `${properties.length} ${properties.length === 1 ? 'property' : 'properties'} found`}
              </p>
              
              <div className="flex items-center gap-3">
                {/* Mobile filter toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  Filters
                </Button>

                {/* Sort dropdown */}
                {!loading && properties.length > 0 && (
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at_desc">Newest First</SelectItem>
                      <SelectItem value="price_asc">Price: Low to High</SelectItem>
                      <SelectItem value="price_desc">Price: High to Low</SelectItem>
                      <SelectItem value="rating_desc">Highest Rated</SelectItem>
                      <SelectItem value="reviews_desc">Most Reviewed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Filters Sidebar */}
            <aside className={cn(
              "lg:block",
              showFilters ? "fixed inset-0 z-50 bg-background p-4 overflow-y-auto lg:relative lg:inset-auto lg:z-auto lg:p-0" : "hidden lg:block"
            )}>
              {showFilters && (
                <div className="flex items-center justify-between mb-4 lg:hidden">
                  <h2 className="text-lg font-semibold">Filters</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              )}
              <SearchFilters
                onFilterChange={handleFilterChange}
                initialFilters={filters}
              />
            </aside>

            {/* Property List */}
            <div>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-80 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : properties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <div 
                      key={property.id} 
                      id={`property-${property.id}`}
                      className="transition-all duration-300"
                    >
                      <PropertyCard property={property} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="rounded-full bg-muted p-6 mb-6">
                    <Home className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">No properties found</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    We couldn't find any properties matching your search. Try adjusting your filters.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fetchProperties()}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// Wrap in Suspense for useSearchParams
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
