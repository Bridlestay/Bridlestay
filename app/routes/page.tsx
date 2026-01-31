"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RoutesMapV2, RoutesMapV2Handle } from "@/components/routes/routes-map-v2";
import { RouteDetailDrawer } from "@/components/routes/route-detail-drawer";
import { RouteCreator, RouteCreatorToolbar, PathLayerToggles, Waypoint, RouteData, RouteStyle, ToolMode } from "@/components/routes/route-creator";
import { MapLayerControls, LayerSettings } from "@/components/routes/map-layer-controls";
import { RoutesNavTabs, RouteTab } from "@/components/routes/routes-nav-tabs";
import { SavedRoutesPanel } from "@/components/routes/saved-routes-panel";
import { FindRoutesPanel } from "@/components/routes/find-routes-panel";
import { RouteBottomSheet } from "@/components/routes/route-bottom-sheet";
import { RouteNavigator } from "@/components/routes/route-navigator";
import { RouteRecorder } from "@/components/routes/route-recorder";
import { PostRideReview } from "@/components/routes/post-ride-review";
import { ElevationProfile } from "@/components/routes/elevation-profile";
import { ClearRouteDialog, DiscardRouteDialog } from "@/components/routes/confirm-dialog";
import { RoutesMapHeader } from "@/components/routes/routes-map-header";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function RoutesPage() {
  const mapRef = useRef<RoutesMapV2Handle>(null);

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<RouteTab>("map");

  // Panel states
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetRoutes, setBottomSheetRoutes] = useState<any[]>([]);
  const [isCluster, setIsCluster] = useState(false);
  const [clusterCount, setClusterCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(null);

  // Route data
  const [exploreRoutes, setExploreRoutes] = useState<any[]>([]);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);
  const [selectedRouteData, setSelectedRouteData] = useState<any | null>(null);

  // Layer settings - paths hidden by default in explore mode
  const [layerSettings, setLayerSettings] = useState<LayerSettings>({
    mapType: "topographic",
    showBridleways: false, // Hidden in explore mode
    showFootpaths: false,
    showByways: false,
    showRestrictedByways: false,
    showWaymarkers: true,
    showHazards: true,
    showProperties: true,
    routeLineWidth: 4,
    monochrome: false,
  });

  // Create Route state
  const [isCreating, setIsCreating] = useState(false);
  const [isPlotting, setIsPlotting] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeType, setRouteType] = useState<"circular" | "linear">("linear");
  const [history, setHistory] = useState<Waypoint[][]>([]);
  const [toolMode, setToolMode] = useState<ToolMode>("plot");

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState<{ lat: number; lng: number }[]>([]);

  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingRoute, setNavigatingRoute] = useState<any | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number; heading: number } | null>(null);

  // Post-ride review
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rideStats, setRideStats] = useState<any>(null);

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

  // Get Google Maps type from our type
  const getGoogleMapType = () => {
    switch (layerSettings.mapType) {
      case "aerial": return "satellite";
      case "topographic": return "terrain";
      default: return "roadmap";
    }
  };

  // Fetch routes on mount
  useEffect(() => {
    fetchExploreRoutes();
    fetchNearbyProperties();
  }, []);

  // Handle tab changes
  useEffect(() => {
    if (activeTab === "create") {
      startCreating();
    } else {
      if (isCreating && waypoints.length > 0) {
        setShowDiscardDialog(true);
      } else {
        cancelCreating();
      }
    }
  }, [activeTab]);

  // Enable path layers when creating routes
  useEffect(() => {
    if (isCreating) {
      setLayerSettings((prev) => ({
        ...prev,
        showBridleways: true,
        showByways: true,
        showRestrictedByways: true,
        showFootpaths: false, // Still keep footpaths off
      }));
    } else {
      // Reset to explore mode defaults
      setLayerSettings((prev) => ({
        ...prev,
        showBridleways: false,
        showByways: false,
        showRestrictedByways: false,
        showFootpaths: false,
      }));
    }
  }, [isCreating]);

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

  // Fetch full route data for navigation
  const fetchRouteData = async (routeId: string) => {
    try {
      const res = await fetch(`/api/routes/${routeId}`);
      if (res.ok) {
        const data = await res.json();
        return data.route;
      }
    } catch (error) {
      console.error("Failed to fetch route:", error);
    }
    return null;
  };

  // State for which route's polyline is drawn on the map
  const [drawnRouteId, setDrawnRouteId] = useState<string | null>(null);

  // Handle pin click - shows preview card (from info window)
  const handleRoutePreview = (route: any) => {
    // Just highlight, don't draw polyline yet
    setHighlightedRouteId(route.id);
  };

  // Handle "View details" click from preview card - draw route & show details
  const handleRouteClick = async (routeId: string) => {
    // Draw the route polyline on the map
    setDrawnRouteId(routeId);
    setSelectedRouteId(routeId);
    setHighlightedRouteId(routeId);
    
    // Open the full route drawer
    setDrawerOpen(true);
    setShowBottomSheet(false);
    
    // Fetch full route data
    const fullRoute = await fetchRouteData(routeId);
    setSelectedRouteData(fullRoute);
    
    // Pan to route
    if (fullRoute?.geometry?.coordinates?.length > 0) {
      const midIdx = Math.floor(fullRoute.geometry.coordinates.length / 2);
      const midPoint = fullRoute.geometry.coordinates[midIdx];
      mapRef.current?.panTo(midPoint[1], midPoint[0]);
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
    if (routes[0]) setHighlightedRouteId(routes[0].id);
  };

  // Open full route details (from panels/bottom sheet)
  const handleRouteDetails = async (routeId: string) => {
    // Draw the route polyline on the map
    setDrawnRouteId(routeId);
    setSelectedRouteId(routeId);
    setDrawerOpen(true);
    setShowBottomSheet(false);
    
    // Fetch full route data for navigation/elevation
    const fullRoute = await fetchRouteData(routeId);
    setSelectedRouteData(fullRoute);
    
    // Pan to route center
    if (fullRoute?.geometry?.coordinates?.length > 0) {
      const midIdx = Math.floor(fullRoute.geometry.coordinates.length / 2);
      const midPoint = fullRoute.geometry.coordinates[midIdx];
      mapRef.current?.panTo(midPoint[1], midPoint[0]);
    }
  };

  // Handle route selection in carousel
  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
    setHighlightedRouteId(routeId);
    mapRef.current?.highlightRoute(routeId);
  };

  // Handle route hover in panels
  const handleRouteHover = (routeId: string | null) => {
    setHighlightedRouteId(routeId);
    mapRef.current?.highlightRoute(routeId);
  };

  // Start following a route
  const handleStartNavigation = async (routeId: string) => {
    const route = await fetchRouteData(routeId);
    if (route) {
      setNavigatingRoute(route);
      setIsNavigating(true);
      setShowBottomSheet(false);
      setDrawerOpen(false);
      toast.success("Navigation started! Follow the route on the map.");
    }
  };

  // Handle navigation completion
  const handleNavigationComplete = () => {
    setIsNavigating(false);
    setRideStats({
      distance_km: navigatingRoute?.distance_km || 0,
      duration_minutes: 45, // Would come from actual tracking
      avg_speed_kmh: 12,
    });
    setShowReviewDialog(true);
  };

  // Submit post-ride review
  const handleSubmitReview = async (review: { rating: number; difficulty: string; review_text: string }) => {
    try {
      await fetch(`/api/routes/${navigatingRoute?.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review),
      });
      setNavigatingRoute(null);
    } catch (error) {
      throw error;
    }
  };

  // Map controls
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          mapRef.current?.panTo(pos.coords.latitude, pos.coords.longitude);
          mapRef.current?.setZoom(15);
        },
        () => {
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
    setActiveTab("map");
    fetchExploreRoutes();
    toast.success("Route saved!");
  };

  // Handle recorded route save
  const handleSaveRecordedRoute = async (routeData: {
    title: string;
    description: string;
    visibility: string;
    difficulty: string;
    geometry: { type: string; coordinates: [number, number][] };
    distance_km: number;
    estimated_time_minutes: number;
  }) => {
    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...routeData,
        route_type: "linear",
        is_public: routeData.visibility === "public",
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to save route");
    }

    setRecordedPath([]);
    fetchExploreRoutes();
  };

  const startCreating = () => {
    setIsCreating(true);
    setIsPlotting(true);
    setToolMode("plot");
    setShowBottomSheet(false);
  };

  const cancelCreating = () => {
    setIsCreating(false);
    setIsPlotting(false);
    setWaypoints([]);
    setHistory([]);
    setRouteType("linear");
    setToolMode("plot");
  };

  const confirmCancel = () => {
    cancelCreating();
    setActiveTab("map");
  };

  // Route creation mode
  if (isCreating && activeTab === "create") {
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
              mapType={getGoogleMapType()}
              monochrome={layerSettings.monochrome}
              onWaypointAdd={addWaypoint}
              onWaypointUpdate={updateWaypoint}
              onWaypointRemove={removeWaypoint}
              onWaypointInsert={insertWaypoint}
              onCircularDetected={handleCircularDetected}
            />
          </div>

          {/* Navigation tabs */}
          <RoutesNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Route creation sidebar (left panel) */}
          <div className="absolute top-0 left-0 bottom-0 w-96 bg-white shadow-2xl z-20 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <RouteCreator
                onSave={handleSaveRoute}
                onCancel={() => {
                  if (waypoints.length > 0) {
                    setShowDiscardDialog(true);
                  } else {
                    confirmCancel();
                  }
                }}
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

          {/* Map controls - stays on right side */}
          <MapLayerControls
            settings={layerSettings}
            onSettingsChange={setLayerSettings}
            onLocateMe={handleLocateMe}
            onFullscreen={handleFullscreen}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            isFullscreen={isFullscreen}
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
            onRoutePreview={handleRoutePreview}
            onClusterClick={handleClusterClick}
            selectedRouteId={drawnRouteId}
            pathLayers={pathLayers}
            propertyPins={layerSettings.showProperties ? nearbyProperties : []}
            highlightedRouteId={highlightedRouteId}
            mapType={getGoogleMapType()}
            monochrome={layerSettings.monochrome}
            userPosition={userPosition}
            followUser={isNavigating}
            recordedPath={recordedPath}
          />
        </div>

        {/* Map Header with hamburger menu (only visible when map tab is active) */}
        {activeTab === "map" && (
          <RoutesMapHeader />
        )}

        {/* Navigation tabs */}
        <RoutesNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Saved Routes Panel */}
        <SavedRoutesPanel
          isOpen={activeTab === "saved"}
          onClose={() => setActiveTab("map")}
          onRouteClick={handleRouteDetails}
          onRouteHover={handleRouteHover}
        />

        {/* Find Routes Panel */}
        <FindRoutesPanel
          isOpen={activeTab === "find"}
          onClose={() => setActiveTab("map")}
          onRouteClick={handleRouteDetails}
          onRouteHover={handleRouteHover}
          onRoutesFound={(routes) => setExploreRoutes(routes)}
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
        {showBottomSheet && bottomSheetRoutes.length > 0 && !isNavigating && (
          <RouteBottomSheet
            routes={bottomSheetRoutes}
            selectedRouteId={selectedRouteId}
            onRouteSelect={handleRouteSelect}
            onRouteClick={handleRouteDetails}
            onClose={() => {
              setShowBottomSheet(false);
              setHighlightedRouteId(null);
            }}
            isCluster={isCluster}
            clusterCount={clusterCount}
          />
        )}

        {/* Route Navigation */}
        {isNavigating && navigatingRoute && (
          <RouteNavigator
            route={navigatingRoute}
            isActive={isNavigating}
            onClose={() => {
              setIsNavigating(false);
              setNavigatingRoute(null);
            }}
            onComplete={handleNavigationComplete}
            onPositionUpdate={(lat, lng, heading) => {
              setUserPosition({ lat, lng, heading });
            }}
          />
        )}

        {/* Route Recorder - MOBILE ONLY (GPS recording while riding) */}
        {!isCreating && activeTab === "map" && (
          <div className="md:hidden">
            <RouteRecorder
              isRecording={isRecording}
              onStart={() => {
                setIsRecording(true);
                setRecordedPath([]);
              }}
              onPause={() => {}}
              onResume={() => {}}
              onStop={() => setIsRecording(false)}
              onSave={handleSaveRecordedRoute}
              onDiscard={() => {
                setIsRecording(false);
                setRecordedPath([]);
              }}
              onPointRecorded={(point) => {
                setRecordedPath((prev) => [...prev, { lat: point.lat, lng: point.lng }]);
              }}
            />
          </div>
        )}

        {/* Post-Ride Review Dialog */}
        <PostRideReview
          open={showReviewDialog}
          onOpenChange={setShowReviewDialog}
          routeId={navigatingRoute?.id || ""}
          routeTitle={navigatingRoute?.title || ""}
          rideStats={rideStats || { distance_km: 0, duration_minutes: 0 }}
          onSubmit={handleSubmitReview}
        />

        {/* Route Detail Drawer */}
        <RouteDetailDrawer
          routeId={selectedRouteId}
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedRouteId(null);
            setSelectedRouteData(null);
            setHighlightedRouteId(null);
            setDrawnRouteId(null); // Clear route polyline from map
          }}
        />

        {/* Elevation Profile (shown when route selected) */}
        {selectedRouteData?.geometry?.coordinates && drawerOpen && (
          <div className="absolute bottom-4 left-4 right-[600px] z-10">
            <ElevationProfile
              coordinates={selectedRouteData.geometry.coordinates}
              distanceKm={selectedRouteData.distance_km || 0}
              onHover={(idx, pos) => {
                // Could highlight point on map
              }}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
