"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RouteCard } from "@/components/routes/route-card";
import { RouteFilters } from "@/components/routes/route-filters";
import { KMLLayerToggles } from "@/components/routes/kml-layer-toggles";
import { RoutesMap } from "@/components/routes/routes-map";
import { RouteDetailDrawer } from "@/components/routes/route-detail-drawer";
import { Header } from "@/components/header";
import { toast } from "sonner";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function RoutesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("explore");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Explore tab state
  const [exploreRoutes, setExploreRoutes] = useState<any[]>([]);
  const [exploreFilters, setExploreFilters] = useState<any>({});
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreTotalCount, setExploreTotalCount] = useState(0);
  
  // All routes for map display
  const [allMapRoutes, setAllMapRoutes] = useState<any[]>([]);

  // My Routes tab state
  const [myRoutes, setMyRoutes] = useState<any[]>([]);
  const [myRoutesLoading, setMyRoutesLoading] = useState(false);

  // Create Route tab state
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawnCoordinates, setDrawnCoordinates] = useState<[number, number][]>(
    []
  );
  const [newRoute, setNewRoute] = useState({
    title: "",
    description: "",
    county: "",
    difficulty: "medium",
    surface: "",
    terrain_tags: [] as string[],
    seasonal_notes: "",
    is_public: true,
    featured: false,
  });
  const [saving, setSaving] = useState(false);

  // Map state
  const [kmlLayers, setKmlLayers] = useState({
    bridleways: false,
    boats: false,
    footpaths: false,
    permissive: false,
  });

  // Fetch explore routes
  useEffect(() => {
    if (activeTab === "explore") {
      fetchExploreRoutes();
      fetchAllMapRoutes(); // Load ALL routes for map
    }
  }, [activeTab, exploreFilters]);
  
  // Fetch all routes for map on initial load
  useEffect(() => {
    fetchAllMapRoutes();
  }, []);

  // Fetch my routes
  useEffect(() => {
    if (activeTab === "my-routes") {
      fetchMyRoutes();
    }
  }, [activeTab]);

  const fetchExploreRoutes = async () => {
    setExploreLoading(true);
    try {
      const res = await fetch("/api/routes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exploreFilters),
      });

      if (res.ok) {
        const data = await res.json();
        setExploreRoutes(data.routes || []);
        setExploreTotalCount(data.total || data.routes?.length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch routes:", error);
      toast.error("Failed to load routes");
    } finally {
      setExploreLoading(false);
    }
  };
  
  const fetchAllMapRoutes = async () => {
    try {
      const res = await fetch("/api/routes/map-routes");
      if (res.ok) {
        const data = await res.json();
        setAllMapRoutes(data.routes || []);
        console.log(`Loaded ${data.routes?.length || 0} routes for map`);
      }
    } catch (error) {
      console.error("Failed to fetch map routes:", error);
    }
  };

  const fetchMyRoutes = async () => {
    setMyRoutesLoading(true);
    try {
      // Fetch user's routes
      const res = await fetch("/api/routes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myRoutes: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setMyRoutes(data.routes || []);
      }
    } catch (error) {
      console.error("Failed to fetch my routes:", error);
      toast.error("Failed to load your routes");
    } finally {
      setMyRoutesLoading(false);
    }
  };

  const handleRouteClick = (routeId: string) => {
    setSelectedRouteId(routeId);
    setDrawerOpen(true);
  };

  const handleKMLToggle = (layer: string, enabled: boolean) => {
    setKmlLayers((prev) => ({ ...prev, [layer]: enabled }));
  };

  const handleDrawingComplete = (coordinates: [number, number][]) => {
    setDrawnCoordinates(coordinates);
    setDrawingMode(false);
    toast.success("Route drawn! Fill in details below to save.");
  };

  const handleSaveRoute = async () => {
    if (!newRoute.title.trim()) {
      toast.error("Please enter a route title");
      return;
    }

    if (drawnCoordinates.length < 2) {
      toast.error("Please draw a route on the map first");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newRoute,
          geometry: {
            type: "LineString",
            coordinates: drawnCoordinates,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Route created successfully!");
        
        // Reset form
        setNewRoute({
          title: "",
          description: "",
          county: "",
          difficulty: "medium",
          surface: "",
          terrain_tags: [],
          seasonal_notes: "",
          is_public: true,
          featured: false,
        });
        setDrawnCoordinates([]);
        
        // Switch to My Routes tab
        setActiveTab("my-routes");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create route");
      }
    } catch (error) {
      console.error("Failed to save route:", error);
      toast.error("Failed to save route");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return;

    try {
      const res = await fetch(`/api/routes/${routeId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Route deleted");
        fetchMyRoutes();
      } else {
        toast.error("Failed to delete route");
      }
    } catch (error) {
      toast.error("Failed to delete route");
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2">Routes</h1>
            <p className="text-muted-foreground">
              Explore riding routes, create your own, and discover bridleways
            </p>
          </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="explore">Explore</TabsTrigger>
            <TabsTrigger value="my-routes">My Routes</TabsTrigger>
            <TabsTrigger value="create">Create Route</TabsTrigger>
          </TabsList>

          {/* EXPLORE TAB */}
          <TabsContent value="explore" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left sidebar - Filters */}
              <div className="space-y-4">
                <RouteFilters onFilterChange={setExploreFilters} />
                <KMLLayerToggles layers={kmlLayers} onToggle={handleKMLToggle} />
              </div>

              {/* Main content - Map + Routes */}
              <div className="lg:col-span-2 space-y-4">
                {/* Map - shows ALL routes */}
                <Card className="h-96 overflow-hidden">
                  <RoutesMap
                    routes={allMapRoutes}
                    onRouteClick={handleRouteClick}
                    kmlLayers={kmlLayers}
                  />
                </Card>

                {/* Routes list */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">
                    {exploreLoading
                      ? "Loading..."
                      : `${exploreTotalCount} routes found${exploreRoutes.length < exploreTotalCount ? ` (showing ${exploreRoutes.length})` : ''}`}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {exploreRoutes.map((route) => (
                      <RouteCard
                        key={route.id}
                        route={route}
                        onClick={() => handleRouteClick(route.id)}
                      />
                    ))}
                  </div>
                  {exploreRoutes.length === 0 && !exploreLoading && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-lg mb-2">No routes found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* MY ROUTES TAB */}
          <TabsContent value="my-routes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card className="h-96 overflow-hidden">
                  <RoutesMap
                    routes={myRoutes}
                    onRouteClick={handleRouteClick}
                    kmlLayers={kmlLayers}
                  />
                </Card>

                <div>
                  <h2 className="text-xl font-semibold mb-4">
                    {myRoutesLoading
                      ? "Loading..."
                      : `Your Routes (${myRoutes.length})`}
                  </h2>
                  {myRoutes.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground mb-4">
                        You haven't created any routes yet
                      </p>
                      <Button onClick={() => setActiveTab("create")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Route
                      </Button>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myRoutes.map((route) => (
                        <div key={route.id} className="relative">
                          <RouteCard
                            route={route}
                            onClick={() => handleRouteClick(route.id)}
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoute(route.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <KMLLayerToggles layers={kmlLayers} onToggle={handleKMLToggle} />
              </div>
            </div>
          </TabsContent>

          {/* CREATE ROUTE TAB */}
          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map with drawing */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="h-[600px] overflow-hidden">
                  <RoutesMap
                    drawingMode={drawingMode}
                    onDrawingComplete={handleDrawingComplete}
                    kmlLayers={kmlLayers}
                  />
                </Card>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setDrawingMode(!drawingMode)}
                    variant={drawingMode ? "default" : "outline"}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {drawingMode ? "Drawing..." : "Start Drawing Route"}
                  </Button>
                  {drawnCoordinates.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDrawnCoordinates([]);
                        toast.info("Route cleared");
                      }}
                    >
                      Clear Route
                    </Button>
                  )}
                </div>
              </div>

              {/* Route details form */}
              <div className="space-y-4">
                <Card className="p-4 space-y-4">
                  <h2 className="text-xl font-semibold">Route Details</h2>

                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={newRoute.title}
                      onChange={(e) =>
                        setNewRoute({ ...newRoute, title: e.target.value })
                      }
                      placeholder="e.g., Malvern Hills Loop"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newRoute.description}
                      onChange={(e) =>
                        setNewRoute({ ...newRoute, description: e.target.value })
                      }
                      placeholder="Describe the route..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="county">County</Label>
                    <Select
                      value={newRoute.county}
                      onValueChange={(value) =>
                        setNewRoute({ ...newRoute, county: value })
                      }
                    >
                      <SelectTrigger id="county">
                        <SelectValue placeholder="Select county" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Worcestershire">Worcestershire</SelectItem>
                        <SelectItem value="Herefordshire">Herefordshire</SelectItem>
                        <SelectItem value="Gloucestershire">
                          Gloucestershire
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={newRoute.difficulty}
                      onValueChange={(value) =>
                        setNewRoute({ ...newRoute, difficulty: value })
                      }
                    >
                      <SelectTrigger id="difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="surface">Surface Type</Label>
                    <Input
                      id="surface"
                      value={newRoute.surface}
                      onChange={(e) =>
                        setNewRoute({ ...newRoute, surface: e.target.value })
                      }
                      placeholder="e.g., Grass, Track, Mixed"
                    />
                  </div>

                  {drawnCoordinates.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-900">
                        ✓ Route drawn ({drawnCoordinates.length} points)
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleSaveRoute}
                    className="w-full"
                    disabled={saving || drawnCoordinates.length < 2}
                  >
                    {saving ? "Saving..." : "Save Route"}
                  </Button>
                </Card>

                <KMLLayerToggles layers={kmlLayers} onToggle={handleKMLToggle} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Route Detail Drawer */}
      <RouteDetailDrawer
        routeId={selectedRouteId}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedRouteId(null);
        }}
      />
      </div>
    </>
  );
}
