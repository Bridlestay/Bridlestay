"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PropertyCard } from "@/components/property-card";
import { SearchBar } from "@/components/search-bar";
import { Header } from "@/components/header";
import { SearchFilters, FilterState } from "@/components/search-filters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Search as SearchIcon } from "lucide-react";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("created_at_desc");
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

  const fetchProperties = async (customFilters?: FilterState, customSortBy?: string) => {
    setLoading(true);
    try {
      const activeFilters = customFilters || filters;
      const activeSortBy = customSortBy || sortBy;
      
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: searchParams.get("location"),
          county: searchParams.get("county"),
          startDate: searchParams.get("checkIn"),
          endDate: searchParams.get("checkOut"),
          guests: searchParams.get("guests"),
          horses: searchParams.get("horses"),
          sortBy: activeSortBy,
          ...activeFilters,
        }),
      });

      const data = await response.json();
      setProperties(data.properties || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [searchParams, sortBy]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    fetchProperties(newFilters);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    fetchProperties(filters, value);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="bg-primary text-primary-foreground py-8">
          <div className="container mx-auto px-4">
            <h1 className="font-serif text-3xl font-bold mb-6">
              Find Your Perfect Stay
            </h1>
            <SearchBar />
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:col-span-1">
              <SearchFilters
                onFilterChange={handleFilterChange}
                initialFilters={filters}
              />
            </aside>

            {/* Results */}
            <div className="lg:col-span-3">
              {/* Results Header with Sort */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">
                  {loading ? "Searching..." : `${properties.length} ${properties.length === 1 ? 'property' : 'properties'} found`}
                </p>
                
                {!loading && properties.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sort by:</span>
                    <Select value={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at_desc">Newest First</SelectItem>
                        <SelectItem value="price_asc">Price (Low to High)</SelectItem>
                        <SelectItem value="price_desc">Price (High to Low)</SelectItem>
                        <SelectItem value="rating_desc">Highest Rated</SelectItem>
                        <SelectItem value="reviews_desc">Most Reviewed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : properties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="rounded-full bg-muted p-6 mb-6">
                    <Home className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">No properties found</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    We couldn't find any properties matching your search criteria. Try adjusting your filters or search in a different area.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => window.location.href = '/search'}
                      className="px-4 py-2 text-sm font-medium text-primary hover:underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
