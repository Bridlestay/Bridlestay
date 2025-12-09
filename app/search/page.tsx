"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PropertyCard } from "@/components/property-card";
import { SearchBar } from "@/components/search-bar";
import { Header } from "@/components/header";
import { SearchFilters, FilterState } from "@/components/search-filters";
import { SearchMap } from "@/components/search/search-map";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Home, Map, List, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("created_at_desc");
  const [viewMode, setViewMode] = useState<"split" | "list" | "map">("split");
  const [searchAsYouMove, setSearchAsYouMove] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
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
    customSortBy?: string,
    bounds?: MapBounds | null
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

      // Add map bounds if searching as you move
      if (bounds && searchAsYouMove) {
        body.bounds = bounds;
      }

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
  }, [filters, sortBy, searchParams, searchAsYouMove]);

  useEffect(() => {
    fetchProperties();
  }, [searchParams]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    fetchProperties(newFilters, sortBy, mapBounds);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    fetchProperties(filters, value, mapBounds);
  };

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
    if (searchAsYouMove) {
      fetchProperties(filters, sortBy, bounds);
    }
  }, [searchAsYouMove, filters, sortBy, fetchProperties]);

  const handleSearchAsYouMoveChange = (enabled: boolean) => {
    setSearchAsYouMove(enabled);
    if (enabled && mapBounds) {
      fetchProperties(filters, sortBy, mapBounds);
    } else if (!enabled) {
      // Refresh with original search when disabling
      fetchProperties(filters, sortBy, null);
    }
  };

  const handlePropertyClick = (propertyId: string) => {
    // Could scroll to property in list or highlight it
    const element = document.getElementById(`property-${propertyId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-primary");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-primary");
      }, 2000);
    }
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

        {/* View Toggle & Controls */}
        <div className="sticky top-0 z-20 bg-background border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {loading ? "Searching..." : `${properties.length} ${properties.length === 1 ? 'property' : 'properties'} found`}
                </p>
                {searchAsYouMove && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    Map search active
                  </span>
                )}
              </div>
              
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

                {/* View mode toggle */}
                <div className="hidden md:flex items-center border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === "list" 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("split")}
                    className={cn(
                      "p-2 transition-colors border-x",
                      viewMode === "split" 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                    title="Split view"
                  >
                    <div className="flex gap-0.5">
                      <List className="h-4 w-4" />
                      <Map className="h-4 w-4" />
                    </div>
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === "map" 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                    title="Map view"
                  >
                    <Map className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <div className={cn(
            "grid gap-6",
            viewMode === "split" && "lg:grid-cols-[280px_1fr_1fr]",
            viewMode === "list" && "lg:grid-cols-[280px_1fr]",
            viewMode === "map" && "lg:grid-cols-[280px_1fr]"
          )}>
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
            {(viewMode === "split" || viewMode === "list") && (
              <div className={cn(
                "space-y-4",
                viewMode === "split" && "max-h-[calc(100vh-200px)] overflow-y-auto pr-2"
              )}>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : properties.length > 0 ? (
                  <div className={cn(
                    viewMode === "list" 
                      ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                      : "space-y-4"
                  )}>
                    {properties.map((property) => (
                      <div 
                        key={property.id} 
                        id={`property-${property.id}`}
                        className="transition-all duration-300"
                      >
                        <PropertyCard 
                          property={property} 
                          variant={viewMode === "split" ? "horizontal" : "default"}
                        />
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
                      {searchAsYouMove 
                        ? "Try moving the map to a different area or disable 'Search as I move' to see all results."
                        : "We couldn't find any properties matching your search. Try adjusting your filters."}
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchAsYouMove(false);
                          fetchProperties(filters, sortBy, null);
                        }}
                      >
                        Show all results
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Map */}
            {(viewMode === "split" || viewMode === "map") && (
              <div className={cn(
                "rounded-lg overflow-hidden border bg-muted",
                viewMode === "split" && "h-[calc(100vh-200px)] sticky top-[140px]",
                viewMode === "map" && "h-[calc(100vh-200px)]"
              )}>
                <SearchMap
                  properties={properties}
                  onBoundsChange={handleBoundsChange}
                  onPropertyClick={handlePropertyClick}
                  searchAsYouMove={searchAsYouMove}
                  onSearchAsYouMoveChange={handleSearchAsYouMoveChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Map Toggle (Fixed at bottom) */}
        <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
          <Button
            onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
            className="shadow-lg rounded-full px-6"
          >
            {viewMode === "map" ? (
              <>
                <List className="h-4 w-4 mr-2" />
                Show List
              </>
            ) : (
              <>
                <Map className="h-4 w-4 mr-2" />
                Show Map
              </>
            )}
          </Button>
        </div>
      </main>
    </>
  );
}
