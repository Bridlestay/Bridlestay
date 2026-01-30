"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RoutesMapV2, RoutesMapV2Handle } from "@/components/routes/routes-map-v2";
import { RouteDetailDrawer } from "@/components/routes/route-detail-drawer";
import { RouteCreator, RouteCreatorToolbar, PathLayerToggles, Waypoint, RouteData, RouteStyle, ToolMode } from "@/components/routes/route-creator";
import { MapLayerControls, LayerSettings } from "@/components/routes/map-layer-controls";
import { MapSearchPanel } from "@/components/routes/map-search-panel";
import { RouteBottomSheet } from "@/components/routes/route-bottom-sheet";
import { ClearRouteDialog, DiscardRouteDialog, DeleteRouteDialog } from "@/components/routes/confirm-dialog";
import { toast } from "sonner";
import { Plus, X, Menu } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function RoutesPage() {
  const mapRef = useRef<RoutesMapV2Handle>(null);
  
  // Panel states
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetRoutes, setBottomSheetRoutes] = useState<any[]>([]);
  const [isCluster, setIsCluster] = useState(false);
  const [clusterCount, setClusterCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Route data
  const [exploreRoutes, setExploreRoutes] = useState<any[]>([]);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);

  // Layer settings
  const [layerSettings, setLayerSettings] = useState<LayerSettings>({
    mapType: "topographic",
    showBridleways: true,
    showFootpaths: false, // Hidden by default as requested
    showByways: true,
    showRestrictedByways: true,
    showWaymarkers: true,
    showHazards: true,
    showProperties: true,
    routeLineWidth: 4,
  });

  // Create Route state
  const [isCreating, setIsCreating] = useState(false);
  const [isPlotting, setIsPlotting] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeType, setRouteType] = useState<"circular" | "linear">("linear");
  const [history, setHistory] = useState<Waypoint[][]>([]);
  const [toolMode, setToolMode] = useState<ToolMode>("plot");

  // Dialog states
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Route style state
  const [routeStyle, setRouteStyle] = useState<RouteStyle>({
    color: "#3B82F6",
    thickness: layerSettings.routeLineWidth,
    opacity: 100,
  });

  // Convert layer settings to path layers format
  const pathLayers = {
    bridleways: layerSettings.showBridleways,
    boats: layerSettings.showByways,
    footpaths: layerSettings.showFootpaths,
    permissive: layerSettings.showRestrictedByways,
  };

  // Fetch routes on mount
  useEffect(() => {
    fetchExploreRoutes();
    fetchNearbyProperties();
  }, []);

  const fetchExploreRoutes = async () => {
    try {
      const res = await fetch("/api/routes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "public" }),
      });

      if (res.ok) {
        const data = await res.json();
        setExploreRoutes(data.routes || []);
      }
    } catch (error) {
      console.error("Failed to fetch routes:", error);
    }
  };

  const fetchNearbyProperties = async () => {
    try {
      const res = await fetch("/api/properties/nearby", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        setNearbyProperties(data.properties || []);
      }
    } catch (error) {
      console.error("Failed to fetch nearby properties:", error);
    }
  };

  // Handle route click on map
  const handleRouteClick = (routeId: string) => {
    const route = exploreRoutes.find((r) => r.id === routeId);
    if (route) {
      setBottomSheetRoutes([route]);
      setSelectedRouteId(routeId);
      setShowBottomSheet(true);
      setIsCluster(false);
    }
  };

  // Handle cluster click
  const handleClusterClick = (routeIds: string[], count: number) => {
    const routes = exploreRoutes.filter((r) => routeIds.includes(r.id));
    setBottomSheetRoutes(routes);
    setSelectedRouteId(routes[0]?.id || null);
    setShowBottomSheet(true);
    setIsCluster(true);
    setClusterCount(count);
  };

  // Open full route details
  const handleRouteDetails = (routeId: string) => {
    setSelectedRouteId(routeId);
    setDrawerOpen(true);
    setShowBottomSheet(false);
  };

  // Handle route selection in carousel
  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
    // Highlight route on map
    // mapRef.current?.highlightRoute(routeId);
  };

  // Map controls
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          mapRef.current?.panTo(pos.coords.latitude, pos.coords.longitude);
          mapRef.current?.setZoom(15);
        },
        (error) => {
          toast.error("Could not get your location");
        }
      );
    }
  };

  const handleFullscreen = () => {
    const elem = document.documentElement;
    if (!isFullscreen) {
      elem.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleZoomIn = () => {
    const map = mapRef.current?.getMap();
    if (map) map.setZoom((map.getZoom() || 10) + 1);
  };

  const handleZoomOut = () => {
    const map = mapRef.current?.getMap();
    if (map) map.setZoom((map.getZoom() || 10) - 1);
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
      toast.success(`Waypoint ${waypoints.length + 1} added${snapped ? " (snapped)" : ""}`);
    },
    [waypoints]
  );

  const insertWaypoint = useCallback(
    (index: number, lat: number, lng: number, snapped = false, pathType?: string) => {
      setHistory((prev) => [...prev, waypoints]);
      const newWaypoint: Waypoint = {
        id: `wp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        lat,
        lng,
        snapped,
        pathType: pathType as Waypoint["pathType"],
      };
      setWaypoints((prev) => {
        const newArr = [...prev];
        newArr.splice(index, 0, newWaypoint);
        return newArr;
      });
      toast.success(`Waypoint inserted at position ${index + 1}`);
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

  const handleCircularDetected = useCallback(() => {
    if (routeType === "linear") {
      setRouteType("circular");
      setIsPlotting(false);
      toast.success("Route closed! Now a circular route.");
    } else {
      if (waypoints.length > 0) {
        setHistory((prev) => [...prev, waypoints]);
        setWaypoints((prev) => prev.slice(0, -1));
        setRouteType("linear");
        toast.info("Route reopened - continue plotting");
      }
    }
  }, [routeType, waypoints]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setWaypoints(previousState);
    if (previousState.length < 3 && routeType === "circular") {
      setRouteType("linear");
    }
    toast.info("Undone");
  }, [history, routeType]);

  const handleClear = useCallback(() => {
    if (waypoints.length === 0) return;
    setShowClearDialog(true);
  }, [waypoints]);

  const confirmClear = useCallback(() => {
    setHistory([]);
    setWaypoints([]);
    setRouteType("linear");
    toast.info("Route cleared");
  }, []);

  const handleSaveRoute = async (routeData: RouteData) => {
    if (!routeData.title?.trim()) {
      throw new Error("Route name is required");
    }
    if (waypoints.length < 2) {
      throw new Error("At least 2 waypoints are required");
    }

    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: routeData.title.trim(),
        description: routeData.description?.trim() || "",
        visibility: routeData.visibility,
        difficulty: routeData.difficulty,
        route_type: routeType,
        geometry: {
          type: "LineString",
          coordinates: waypoints.map((wp) => [wp.lng, wp.lat]),
        },
        distance_km: routeData.distanceKm,
        estimated_time_minutes: routeData.estimatedTimeMinutes,
        is_public: routeData.visibility === "public",
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to save route");
    }

    setIsCreating(false);
    setWaypoints([]);
    setHistory([]);
    setRouteType("linear");
    setToolMode("plot");
    fetchExploreRoutes();
    toast.success("Route saved!");
  };

  const startCreating = () => {
    setIsCreating(true);
    setIsPlotting(true);
    setToolMode("plot");
    setSearchPanelOpen(false);
    setShowBottomSheet(false);
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
    setRouteType("linear");
    setToolMode("plot");
  };

  // Route creation mode
  if (isCreating) {
    return (
      <TooltipProvider>
        <div className="fixed inset-0 bg-background">
          {/* Full-screen map for route creation */}
          <div className="absolute inset-0">
            <RoutesMapV2
              ref={mapRef}
              isCreating={isCreating}
              isPlotting={isPlotting}
              snapEnabled={snapEnabled}
              waypoints={waypoints}
              routeType={routeType}
              routeStyle={routeStyle}
              toolMode={toolMode}
              pathLayers={pathLayers}
              onWaypointAdd={addWaypoint}
              onWaypointUpdate={updateWaypoint}
              onWaypointRemove={removeWaypoint}
              onWaypointInsert={insertWaypoint}
              onCircularDetected={handleCircularDetected}
            />
          </div>

          {/* Route creation sidebar (left panel) */}
          <div className="absolute top-0 left-0 bottom-0 w-80 bg-white shadow-2xl z-20 flex flex-col overflow-hidden">
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
            <div className="border-t p-4">
              <PathLayerToggles
                layers={pathLayers}
                onToggle={(layer, enabled) => {
                  setLayerSettings((prev) => {
                    const key = layer === "bridleways" ? "showBridleways" :
                                layer === "boats" ? "showByways" :
                                layer === "footpaths" ? "showFootpaths" :
                                "showRestrictedByways";
                    return { ...prev, [key]: enabled };
                  });
                }}
              />
            </div>
          </div>

          {/* Route creation toolbar */}
          <RouteCreatorToolbar
            isPlotting={isPlotting}
            setIsPlotting={setIsPlotting}
            snapEnabled={snapEnabled}
            setSnapEnabled={setSnapEnabled}
            toolMode={toolMode}
            setToolMode={setToolMode}
            onUndo={handleUndo}
            onClear={handleClear}
            canUndo={history.length > 0}
            routeStyle={routeStyle}
            onStyleChange={setRouteStyle}
          />

          {/* Map controls */}
          <MapLayerControls
            settings={layerSettings}
            onSettingsChange={setLayerSettings}
            onLocateMe={handleLocateMe}
            onFullscreen={handleFullscreen}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            isFullscreen={isFullscreen}
            className="left-84"
          />
        </div>

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

  // Main map-first explore view
  return (
    <TooltipProvider>
      <div className="fixed inset-0 bg-background">
        {/* Full-screen map */}
        <div className="absolute inset-0">
          <RoutesMapV2
            ref={mapRef}
            routes={exploreRoutes}
            onRouteClick={handleRouteClick}
            onClusterClick={handleClusterClick}
            pathLayers={pathLayers}
            propertyPins={layerSettings.showProperties ? nearbyProperties : []}
          />
        </div>

        {/* Search panel (left side on desktop, fullscreen on mobile) */}
        <MapSearchPanel
          isOpen={searchPanelOpen}
          onToggle={() => setSearchPanelOpen(!searchPanelOpen)}
          onRouteClick={handleRouteDetails}
          onPlaceClick={(lat, lng) => {
            mapRef.current?.panTo(lat, lng);
            mapRef.current?.setZoom(14);
          }}
          onCreateRoute={startCreating}
        />

        {/* Layer controls (bottom right) */}
        <MapLayerControls
          settings={layerSettings}
          onSettingsChange={setLayerSettings}
          onLocateMe={handleLocateMe}
          onFullscreen={handleFullscreen}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          isFullscreen={isFullscreen}
        />

        {/* Route info bottom sheet */}
        {showBottomSheet && bottomSheetRoutes.length > 0 && (
          <RouteBottomSheet
            routes={bottomSheetRoutes}
            selectedRouteId={selectedRouteId}
            onRouteSelect={handleRouteSelect}
            onRouteClick={handleRouteDetails}
            onClose={() => setShowBottomSheet(false)}
            isCluster={isCluster}
            clusterCount={clusterCount}
          />
        )}

        {/* Floating create button (when search panel closed) */}
        {!searchPanelOpen && (
          <Button
            onClick={startCreating}
            className="absolute top-4 right-4 z-20 shadow-lg gap-2"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Create Route
          </Button>
        )}

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
    </TooltipProvider>
  );
}
