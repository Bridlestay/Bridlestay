"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RouteCard } from "@/components/routes/route-card";
import { RouteFilters } from "@/components/routes/route-filters";
import { RoutesMapV2, RoutesMapV2Handle } from "@/components/routes/routes-map-v2";
import { RouteDetailDrawer } from "@/components/routes/route-detail-drawer";
import { RouteCreator, RouteCreatorToolbar, PathLayerToggles, Waypoint, RouteData, RouteStyle } from "@/components/routes/route-creator";
import { KMLLayerToggles } from "@/components/routes/kml-layer-toggles";
import { ClearRouteDialog, DiscardRouteDialog, DeleteRouteDialog } from "@/components/routes/confirm-dialog";
import { Header } from "@/components/header";
import { toast } from "sonner";
import { Plus, Trash2, Compass, Route, ArrowLeft, Home, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function RoutesPage() {
  const router = useRouter();
  const mapRef = useRef<RoutesMapV2Handle>(null);
  
  const [activeTab, setActiveTab] = useState("explore");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Explore tab state
  const [exploreRoutes, setExploreRoutes] = useState<any[]>([]);
  const [exploreFilters, setExploreFilters] = useState<any>({});
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreTotalCount, setExploreTotalCount] = useState(0);

  // My Routes tab state
  const [myRoutes, setMyRoutes] = useState<any[]>([]);
  const [myRoutesLoading, setMyRoutesLoading] = useState(false);

  // Nearby properties for the map
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);
  const [showProperties, setShowProperties] = useState(true);

  // Create Route state
  const [isCreating, setIsCreating] = useState(false);
  const [isPlotting, setIsPlotting] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeType, setRouteType] = useState<"circular" | "linear">("linear");
  const [history, setHistory] = useState<Waypoint[][]>([]);

  // Dialog states
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<{id: string, name?: string} | null>(null);

  // Path layer state
  const [pathLayers, setPathLayers] = useState({
    bridleways: true,
    boats: false,
    footpaths: false,
    permissive: false,
  });

  // Route style state
  const [routeStyle, setRouteStyle] = useState<RouteStyle>({
    color: "#3B82F6",
    thickness: 4,
    opacity: 100,
  });

  const handlePathLayerToggle = (layer: string, enabled: boolean) => {
    setPathLayers((prev) => ({ ...prev, [layer]: enabled }));
  };

  const handleStyleChange = (style: RouteStyle) => {
    setRouteStyle(style);
  };

  // Fetch explore routes
  useEffect(() => {
    if (activeTab === "explore" && !isCreating) {
      fetchExploreRoutes();
    }
  }, [activeTab, exploreFilters, isCreating]);

  // Fetch my routes
  useEffect(() => {
    if (activeTab === "my-routes") {
      fetchMyRoutes();
    }
  }, [activeTab]);

  // Fetch nearby properties when not creating
  useEffect(() => {
    if (!isCreating && showProperties) {
      fetchNearbyProperties();
    }
  }, [isCreating, showProperties]);

  const fetchExploreRoutes = async () => {
    setExploreLoading(true);
    try {
      const res = await fetch("/api/routes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...exploreFilters, visibility: "public" }),
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

  const fetchMyRoutes = async () => {
    setMyRoutesLoading(true);
    try {
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

  const fetchNearbyProperties = async () => {
    try {
      // Fetch all published properties with coordinates
      const res = await fetch("/api/properties/nearby", {
        method: "GET",
      });

      if (res.ok) {
        const data = await res.json();
        setNearbyProperties(data.properties || []);
      }
    } catch (error) {
      console.error("Failed to fetch nearby properties:", error);
    }
  };

  const handleRouteClick = (routeId: string) => {
    setSelectedRouteId(routeId);
    setDrawerOpen(true);
  };

  // Waypoint management
  const addWaypoint = useCallback(
    (lat: number, lng: number, snapped = false, pathType?: string) => {
      setHistory((prev) => [...prev, waypoints]);
      const newWaypoint: Waypoint = {
        id: `wp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        lat,
        lng,
        snapped,
        pathType: pathType as Waypoint["pathType"],
      };
      setWaypoints((prev) => [...prev, newWaypoint]);
      toast.success(`Waypoint ${waypoints.length + 1} added${snapped ? " (snapped to path)" : ""}`);
    },
    [waypoints]
  );

  const updateWaypoint = useCallback(
    (id: string, lat: number, lng: number, snapped = false) => {
      setHistory((prev) => [...prev, waypoints]);
      setWaypoints((prev) =>
        prev.map((wp) => (wp.id === id ? { ...wp, lat, lng, snapped } : wp))
      );
    },
    [waypoints]
  );

  const removeWaypoint = useCallback(
    (id: string) => {
      setHistory((prev) => [...prev, waypoints]);
      setWaypoints((prev) => prev.filter((wp) => wp.id !== id));
      toast.info("Waypoint removed");
    },
    [waypoints]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setWaypoints(previousState);
    toast.info("Undone");
  }, [history]);

  const handleClear = useCallback(() => {
    if (waypoints.length === 0) return;
    setShowClearDialog(true);
  }, [waypoints]);

  const confirmClear = useCallback(() => {
    setHistory([]);
    setWaypoints([]);
    toast.info("Route cleared");
  }, []);

  const handleReverse = useCallback(() => {
    if (waypoints.length < 2) return;
    setHistory((prev) => [...prev, waypoints]);
    setWaypoints((prev) => [...prev].reverse());
    toast.success("Route reversed");
  }, [waypoints]);

  const handleRetrace = useCallback(() => {
    if (waypoints.length < 2) return;
    setHistory((prev) => [...prev, waypoints]);
    // Create a return path by reversing and appending (excluding duplicate at junction)
    const returnPath = [...waypoints].reverse().slice(1);
    setWaypoints((prev) => [...prev, ...returnPath]);
    toast.success("Route retraced back to start");
  }, [waypoints]);

  const handleSaveRoute = async (routeData: RouteData) => {
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: routeData.title,
          description: routeData.description,
          visibility: routeData.visibility,
          difficulty: routeData.difficulty,
          route_type: routeData.routeType,
          geometry: routeData.geometry,
          distance_km: routeData.distanceKm,
          estimated_time_minutes: routeData.estimatedTimeMinutes,
          is_public: routeData.visibility === "public",
        }),
      });

      if (res.ok) {
        toast.success("Route created successfully!");
        setIsCreating(false);
        setWaypoints([]);
        setHistory([]);
        setActiveTab("my-routes");
        fetchMyRoutes();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create route");
      }
    } catch (error) {
      console.error("Failed to save route:", error);
      toast.error("Failed to save route");
    }
  };

  const handleDeleteRoute = async () => {
    if (!routeToDelete) return;

    try {
      const res = await fetch(`/api/routes/${routeToDelete.id}`, {
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
    } finally {
      setRouteToDelete(null);
    }
  };

  const startCreating = () => {
    setIsCreating(true);
    setIsPlotting(true);
  };

  const cancelCreating = () => {
    if (waypoints.length > 0) {
      setShowDiscardDialog(true);
    } else {
      confirmCancel();
    }
  };

  const confirmCancel = () => {
    setIsCreating(false);
    setIsPlotting(false);
    setWaypoints([]);
    setHistory([]);
    setActiveTab("explore");
  };

  // Render Create Route view (sidebar layout)
  if (isCreating) {
    return (
      <TooltipProvider>
        <Header />
        <div className="min-h-screen bg-background">
          <div className="flex h-[calc(100vh-64px)]">
            {/* Left sidebar - Route creator form + path toggles */}
            <div className="w-80 border-r bg-background flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <RouteCreator
                  onSave={handleSaveRoute}
                  onCancel={cancelCreating}
                  mapRef={mapRef}
                  existingRoute={{
                    title: "",
                    description: "",
                    visibility: "private",
                    difficulty: "unrated",
                    routeType,
                    waypoints,
                    geometry: {
                      type: "LineString",
                      coordinates: waypoints.map((wp) => [wp.lng, wp.lat]),
                    },
                    distanceKm: 0,
                    estimatedTimeMinutes: 0,
                  }}
                />
              </div>
              {/* Path layer toggles at bottom of sidebar */}
              <div className="border-t p-4">
                <PathLayerToggles
                  layers={pathLayers}
                  onToggle={handlePathLayerToggle}
                />
              </div>
            </div>

            {/* Map area - full width */}
            <div className="flex-1 relative">
              <RoutesMapV2
                ref={mapRef}
                isCreating={isCreating}
                isPlotting={isPlotting}
                snapEnabled={snapEnabled}
                waypoints={waypoints}
                routeType={routeType}
                routeStyle={routeStyle}
                pathLayers={pathLayers}
                onWaypointAdd={addWaypoint}
                onWaypointUpdate={updateWaypoint}
                onWaypointRemove={removeWaypoint}
              />

              {/* Route creation toolbar */}
              <RouteCreatorToolbar
                isPlotting={isPlotting}
                setIsPlotting={setIsPlotting}
                snapEnabled={snapEnabled}
                setSnapEnabled={setSnapEnabled}
                onUndo={handleUndo}
                onClear={handleClear}
                onReverse={handleReverse}
                onRetrace={handleRetrace}
                canUndo={history.length > 0}
                canReverse={waypoints.length >= 2}
                canRetrace={waypoints.length >= 2}
                routeStyle={routeStyle}
                onStyleChange={handleStyleChange}
              />
            </div>
          </div>
        </div>

        {/* Dialogs */}
        <ClearRouteDialog
          open={showClearDialog}
          onOpenChange={setShowClearDialog}
          onConfirm={confirmClear}
        />
        <DiscardRouteDialog
          open={showDiscardDialog}
          onOpenChange={setShowDiscardDialog}
          onConfirm={confirmCancel}
        />
      </TooltipProvider>
    );
  }

  // Render Explore/My Routes view (original layout with map + cards)
  return (
    <TooltipProvider>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Routes</h1>
              <p className="text-muted-foreground">
                Discover riding routes or create your own
              </p>
            </div>
            <Button onClick={startCreating} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Route
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="explore">Explore Routes</TabsTrigger>
              <TabsTrigger value="my-routes">My Routes</TabsTrigger>
            </TabsList>

            {/* EXPLORE TAB */}
            <TabsContent value="explore" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left sidebar - Filters + Path Layers */}
                <div className="space-y-4">
                  <RouteFilters onFilterChange={setExploreFilters} />
                  <KMLLayerToggles layers={pathLayers} onToggle={handlePathLayerToggle} />
                </div>

                {/* Main content - Map + Routes */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Map */}
                  <Card className="h-96 overflow-hidden relative">
                    <RoutesMapV2
                      routes={exploreRoutes}
                      onRouteClick={handleRouteClick}
                      pathLayers={pathLayers}
                      propertyPins={showProperties ? nearbyProperties : []}
                    />
                    {/* Property toggle */}
                    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 z-10">
                      <Home className="h-4 w-4 text-purple-600" />
                      <Label htmlFor="show-props-explore" className="text-sm font-medium cursor-pointer">
                        Properties
                      </Label>
                      <Switch
                        id="show-props-explore"
                        checked={showProperties}
                        onCheckedChange={setShowProperties}
                      />
                    </div>
                    {showProperties && nearbyProperties.length > 0 && (
                      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 z-10">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                          <span>{nearbyProperties.length} properties nearby</span>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Routes list */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">
                      {exploreLoading
                        ? "Loading..."
                        : exploreTotalCount > 0
                        ? `${exploreTotalCount} public routes`
                        : "No public routes yet"}
                    </h2>

                    {exploreRoutes.length === 0 && !exploreLoading ? (
                      <Card className="p-8 text-center">
                        <Compass className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No routes found</h3>
                        <p className="text-muted-foreground mb-6">
                          Be the first to share a riding route in this area!
                        </p>
                        <Button onClick={startCreating}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create First Route
                        </Button>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {exploreRoutes.map((route) => (
                          <RouteCard
                            key={route.id}
                            route={route}
                            onClick={() => handleRouteClick(route.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* MY ROUTES TAB */}
            <TabsContent value="my-routes" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Map + Path Layers */}
                <div className="lg:col-span-2 space-y-4">
                  <Card className="h-96 overflow-hidden relative">
                    <RoutesMapV2
                      routes={myRoutes}
                      onRouteClick={handleRouteClick}
                      pathLayers={pathLayers}
                      propertyPins={showProperties ? nearbyProperties : []}
                    />
                    {/* Property toggle */}
                    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 z-10">
                      <Home className="h-4 w-4 text-purple-600" />
                      <Label htmlFor="show-props-myroutes" className="text-sm font-medium cursor-pointer">
                        Properties
                      </Label>
                      <Switch
                        id="show-props-myroutes"
                        checked={showProperties}
                        onCheckedChange={setShowProperties}
                      />
                    </div>
                  </Card>
                  <KMLLayerToggles layers={pathLayers} onToggle={handlePathLayerToggle} />
                </div>

                {/* Routes list */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">
                    {myRoutesLoading
                      ? "Loading..."
                      : `Your Routes (${myRoutes.length})`}
                  </h2>

                  {myRoutes.length === 0 && !myRoutesLoading ? (
                    <Card className="p-6 text-center">
                      <Route className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">
                        You haven't created any routes yet
                      </p>
                      <Button onClick={startCreating} variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Route
                      </Button>
                    </Card>
                  ) : (
                    <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                      {myRoutes.map((route) => (
                        <div key={route.id} className="relative">
                          <RouteCard
                            route={route}
                            onClick={() => handleRouteClick(route.id)}
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRouteToDelete({ id: route.id, name: route.title });
                              setShowDeleteDialog(true);
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

        {/* Delete Route Dialog */}
        <DeleteRouteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDeleteRoute}
          routeName={routeToDelete?.name}
        />
      </div>
    </TooltipProvider>
  );
}
