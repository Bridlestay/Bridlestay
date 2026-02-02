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
import { PostRideReview } from "@/components/routes/post-ride-review";
import { ElevationProfile } from "@/components/routes/elevation-profile";
import { ClearRouteDialog, DiscardRouteDialog } from "@/components/routes/confirm-dialog";
import { RoutesMapHeader } from "@/components/routes/routes-map-header";
import { MobileTopHeader } from "@/components/routes/mobile-top-header";
import { MobileBottomNav } from "@/components/routes/mobile-bottom-nav";
import { MobileFabMenu } from "@/components/routes/mobile-fab-menu";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Map, Settings } from "lucide-react";

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

  // Create/Edit Route state
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editingRouteData, setEditingRouteData] = useState<any>(null);
  const [isPlotting, setIsPlotting] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeType, setRouteType] = useState<"circular" | "linear">("linear");
  const [history, setHistory] = useState<Waypoint[][]>([]);
  const [toolMode, setToolMode] = useState<ToolMode>("plot");

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState<{ lat: number; lng: number }[]>([]);

  // Mobile create route state (toggles between map and options/settings view)
  const [mobileCreateView, setMobileCreateView] = useState<"options" | "map">("options");
  const [pendingTabChange, setPendingTabChange] = useState<RouteTab | null>(null);

  // Mobile panel state for Find/Saved (whether to show panel or map)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(true);

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
  const [showLayerPanel, setShowLayerPanel] = useState(false);

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
      setMobileCreateView("options"); // Start with options on mobile
    } else {
      if (isCreating && waypoints.length > 0) {
        // Don't auto-cancel if there's a pending tab change dialog
        if (!pendingTabChange) {
          setShowDiscardDialog(true);
        }
      } else {
        cancelCreating();
      }
    }
    // Reset mobile panel state when switching tabs
    setMobilePanelOpen(true);
  }, [activeTab]);

  // Handle mobile tab change with discard confirmation
  const handleMobileTabChange = (tab: RouteTab) => {
    if (isCreating && waypoints.length > 0 && tab !== "create") {
      setPendingTabChange(tab);
      setShowDiscardDialog(true);
    } else {
      setActiveTab(tab);
    }
  };

  // Handle discard confirmation for mobile
  const handleDiscardConfirm = () => {
    cancelCreating();
    if (pendingTabChange) {
      setActiveTab(pendingTabChange);
      setPendingTabChange(null);
    } else {
      setActiveTab("map");
    }
  };

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
      // Fetch public routes
      const publicRes = await fetch("/api/routes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      // Also fetch user's own routes (they should see their own regardless of visibility)
      const myRes = await fetch("/api/routes/my-routes");

      let allRoutes: any[] = [];

      if (publicRes.ok) {
        const data = await publicRes.json();
        allRoutes = data.routes || [];
      }

      if (myRes.ok) {
        const myData = await myRes.json();
        const myRouteIds = new Set((myData.routes || []).map((r: any) => r.id));
        // Add user's own routes that aren't already in the list
        const existingIds = new Set(allRoutes.map(r => r.id));
        for (const route of myData.routes || []) {
          if (!existingIds.has(route.id)) {
            allRoutes.push(route);
          }
        }
      }

      setExploreRoutes(allRoutes);
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
    
    // Open the full route drawer (now on left side)
    setDrawerOpen(true);
    setShowBottomSheet(false);
    
    // Fetch full route data
    const fullRoute = await fetchRouteData(routeId);
    setSelectedRouteData(fullRoute);
    
    // Zoom to fit the route
    if (fullRoute?.geometry?.coordinates?.length > 0) {
      mapRef.current?.fitBounds(fullRoute.geometry.coordinates);
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
    
    // Zoom to fit the route
    if (fullRoute?.geometry?.coordinates?.length > 0) {
      mapRef.current?.fitBounds(fullRoute.geometry.coordinates);
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

    const payload = {
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
    };

    // Use PATCH for editing, POST for creating
    const url = isEditing && editingRouteId 
      ? `/api/routes/${editingRouteId}` 
      : "/api/routes";
    const method = isEditing && editingRouteId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to save route");
    }

    // Reset state
    setIsCreating(false);
    setIsEditing(false);
    setEditingRouteId(null);
    setEditingRouteData(null);
    setWaypoints([]);
    setHistory([]);
    setRouteType("linear");
    setToolMode("plot");
    setActiveTab("map");
    setDrawnRouteId(null);
    fetchExploreRoutes();
    toast.success(isEditing ? "Route updated!" : "Route saved!");
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
    setIsEditing(false);
    setEditingRouteId(null);
    setEditingRouteData(null);
    setIsPlotting(true);
    setToolMode("plot");
    setShowBottomSheet(false);
  };

  const startEditing = (routeId: string, routeData: any) => {
    // Close the drawer first
    setDrawerOpen(false);
    setSelectedRouteId(null);
    
    // Extract waypoints from route geometry
    const coords = routeData.geometry?.coordinates || [];
    const extractedWaypoints: Waypoint[] = coords.map((coord: number[], index: number) => ({
      id: `wp-${Date.now()}-${index}`,
      lat: coord[1],
      lng: coord[0],
      snapped: false,
    }));
    
    // Set up editing state
    setWaypoints(extractedWaypoints);
    setRouteType(routeData.route_type === "circular" ? "circular" : "linear");
    setIsEditing(true);
    setEditingRouteId(routeId);
    setEditingRouteData(routeData);
    setIsCreating(true);
    setIsPlotting(true);
    setToolMode("plot");
    setActiveTab("create");
    
    // Keep the route visible by setting drawnRouteId temporarily
    setDrawnRouteId(routeId);
  };

  const cancelCreating = () => {
    setIsCreating(false);
    setIsEditing(false);
    setEditingRouteId(null);
    setEditingRouteData(null);
    setIsPlotting(false);
    setWaypoints([]);
    setHistory([]);
    setRouteType("linear");
    setToolMode("plot");
    setDrawnRouteId(null);
  };

  const confirmCancel = () => {
    handleDiscardConfirm();
  };

  // Route creation mode
  if (isCreating && activeTab === "create") {
    return (
      <TooltipProvider>
        <div className="fixed inset-0 bg-background">
          {/* Full-screen map for route creation - always rendered, visibility controlled */}
          <div className={cn(
            "absolute inset-0",
            // On mobile, only show map when in map view
            mobileCreateView === "options" ? "hidden md:block" : "block"
          )}>
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

          {/* Desktop Navigation tabs - hidden on mobile */}
          <div className="hidden md:block">
            <RoutesNavTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* DESKTOP: Route creation sidebar (left panel) */}
          <div className="hidden md:flex absolute top-0 left-0 bottom-0 w-96 bg-white shadow-2xl z-20 flex-col overflow-hidden">
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
                  title: isEditing && editingRouteData ? editingRouteData.title : "",
                  description: isEditing && editingRouteData ? (editingRouteData.description || "") : "",
                  visibility: isEditing && editingRouteData ? (editingRouteData.visibility || "private") : "private",
                  difficulty: isEditing && editingRouteData ? (editingRouteData.difficulty || "unrated") : "unrated",
                  routeType,
                  waypoints,
                  geometry: {
                    type: "LineString",
                    coordinates: waypoints.map((wp) => [wp.lng, wp.lat]),
                  },
                  distanceKm: isEditing && editingRouteData ? (editingRouteData.distance_km || 0) : 0,
                  estimatedTimeMinutes: isEditing && editingRouteData ? (editingRouteData.estimated_time_minutes || 0) : 0,
                }}
                isEditing={isEditing}
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

          {/* MOBILE: Map view with bottom sheet for options */}
          <div className="md:hidden">
            {/* Mobile top header with hamburger, search, profile - always visible */}
            <MobileTopHeader />

            {/* Mobile Route Creator Toolbar below header */}
            <div className="fixed top-14 left-0 right-0 z-30 bg-white border-b border-gray-100 px-3 py-2">
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
                isMobile={true}
              />
            </div>

            {/* Options button - bottom center (only when sheet is closed) */}
            {mobileCreateView === "map" && (
              <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30">
                <Button
                  onClick={() => setMobileCreateView("options")}
                  className="rounded-full px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white shadow-lg flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Options
                </Button>
              </div>
            )}

            {/* Mobile FAB for map settings (only when sheet is closed) */}
            {mobileCreateView === "map" && (
              <MobileFabMenu 
                onOpenSettings={() => setShowLayerPanel(true)}
                onLocateMe={handleLocateMe}
              />
            )}

            {/* Bottom sheet for route options - slides up */}
            <div
              className={cn(
                "fixed left-0 right-0 bottom-0 z-40 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out",
                mobileCreateView === "options"
                  ? "translate-y-0"
                  : "translate-y-full"
              )}
              style={{ maxHeight: "85vh" }}
            >
              {/* Sheet handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Create Route Form - scrollable */}
              <div className="overflow-y-auto pb-4" style={{ maxHeight: "calc(85vh - 180px)" }}>
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
                    title: isEditing && editingRouteData ? editingRouteData.title : "",
                    description: isEditing && editingRouteData ? (editingRouteData.description || "") : "",
                    visibility: isEditing && editingRouteData ? (editingRouteData.visibility || "private") : "private",
                    difficulty: isEditing && editingRouteData ? (editingRouteData.difficulty || "unrated") : "unrated",
                    routeType,
                    waypoints,
                    geometry: {
                      type: "LineString",
                      coordinates: waypoints.map((wp) => [wp.lng, wp.lat]),
                    },
                    distanceKm: isEditing && editingRouteData ? (editingRouteData.distance_km || 0) : 0,
                    estimatedTimeMinutes: isEditing && editingRouteData ? (editingRouteData.estimated_time_minutes || 0) : 0,
                  }}
                  isEditing={isEditing}
                  isMobile={true}
                  onMapClick={() => setMobileCreateView("map")}
                />
              </div>

              {/* Fixed bottom buttons - Map button above Cancel/Save */}
              <div className="px-4 pb-4 pt-2 border-t bg-white space-y-3">
                {/* Map button */}
                <Button
                  onClick={() => setMobileCreateView("map")}
                  variant="outline"
                  className="w-full rounded-full h-11 border-2 border-gray-800 text-gray-800 hover:bg-gray-100 flex items-center justify-center gap-2"
                >
                  <Map className="h-4 w-4" />
                  Map
                </Button>
                
                {/* Cancel / Save buttons side by side */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full h-11 border-2 border-red-500 text-red-500 hover:bg-red-50"
                    onClick={() => {
                      if (waypoints.length > 0) {
                        setShowDiscardDialog(true);
                      } else {
                        confirmCancel();
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 rounded-full h-11 bg-[#2E8B57] hover:bg-[#256b45] text-white"
                    onClick={() => {
                      // Trigger save from RouteCreator
                      const saveBtn = document.querySelector('[data-mobile-save]') as HTMLButtonElement;
                      saveBtn?.click();
                    }}
                    disabled={waypoints.length < 2}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Bottom Nav - always visible */}
            <MobileBottomNav 
              activeTab={activeTab} 
              onTabChange={handleMobileTabChange}
              isRecording={isRecording}
              onRecordClick={() => {
                if (isRecording) {
                  setIsRecording(false);
                } else {
                  setIsRecording(true);
                  setRecordedPath([]);
                }
              }}
            />
          </div>

          {/* Desktop Route creation toolbar */}
          <div className="hidden md:block">
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
          </div>

          {/* Map controls - desktop only, mobile uses FAB */}
          <div className="hidden md:block">
            <MapLayerControls
              settings={layerSettings}
              onSettingsChange={setLayerSettings}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
            />
          </div>

          {/* Mobile layer panel - shared between views */}
          <MapLayerControls
            settings={layerSettings}
            onSettingsChange={setLayerSettings}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            showPanel={showLayerPanel}
            onPanelChange={setShowLayerPanel}
            className="hidden"
          />
        </div>

        <ClearRouteDialog
          open={showClearDialog}
          onOpenChange={setShowClearDialog}
          onConfirm={confirmClear}
        />
        <DiscardRouteDialog
          open={showDiscardDialog}
          onOpenChange={(open) => {
            setShowDiscardDialog(open);
            if (!open) setPendingTabChange(null);
          }}
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

        {/* Mobile Top Header (hamburger, search, profile) - visible on mobile */}
        <MobileTopHeader />

        {/* Desktop Map Header with hamburger menu (only visible when map tab is active) */}
        {activeTab === "map" && (
          <div className="hidden md:block">
            <RoutesMapHeader />
          </div>
        )}

        {/* Desktop Navigation tabs - hidden on mobile */}
        <div className="hidden md:block">
          <RoutesNavTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav 
          activeTab={activeTab} 
          onTabChange={handleMobileTabChange}
          isRecording={isRecording}
          onRecordClick={() => {
            if (isRecording) {
              setIsRecording(false);
            } else {
              setIsRecording(true);
              setRecordedPath([]);
            }
          }}
        />

        {/* Mobile FAB Menu (+ button for settings) */}
        <MobileFabMenu 
          onOpenSettings={() => setShowLayerPanel(true)}
          onLocateMe={handleLocateMe}
        />

        {/* Saved Routes Panel */}
        <SavedRoutesPanel
          isOpen={activeTab === "saved"}
          onClose={() => setActiveTab("map")}
          onRouteClick={handleRouteDetails}
          onRouteHover={handleRouteHover}
          mobilePanelOpen={mobilePanelOpen}
          onMobilePanelToggle={setMobilePanelOpen}
        />

        {/* Find Routes Panel */}
        <FindRoutesPanel
          isOpen={activeTab === "find"}
          onClose={() => setActiveTab("map")}
          onRouteClick={handleRouteDetails}
          onRouteHover={handleRouteHover}
          onRoutesFound={(routes) => setExploreRoutes(routes)}
          mobilePanelOpen={mobilePanelOpen}
          onMobilePanelToggle={setMobilePanelOpen}
        />

        {/* Mobile Options button - shown when panel is collapsed on Find/Saved tabs */}
        {(activeTab === "find" || activeTab === "saved") && !mobilePanelOpen && (
          <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-30">
            <Button
              onClick={() => setMobilePanelOpen(true)}
              className="rounded-full px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white shadow-lg flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Options
            </Button>
          </div>
        )}

        {/* Layer controls (bottom right) - FAB buttons hidden on mobile, panel visible on both */}
        <MapLayerControls
          settings={layerSettings}
          onSettingsChange={setLayerSettings}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          showPanel={showLayerPanel}
          onPanelChange={setShowLayerPanel}
          className="hidden md:flex"
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
          onShowPropertyOnMap={(propertyId, lat, lng) => {
            // Close the route drawer
            setDrawerOpen(false);
            setSelectedRouteId(null);
            setSelectedRouteData(null);
            setHighlightedRouteId(null);
            setDrawnRouteId(null);
            
            // Pan to the property location and zoom in
            mapRef.current?.panTo(lat, lng);
            mapRef.current?.setZoom(15);
            
            // Switch to map tab to show the property pin
            setActiveTab("map");
            
            // Open the property's info window after a short delay (allow map to pan first)
            setTimeout(() => {
              mapRef.current?.showPropertyInfoWindow(propertyId);
            }, 500);
          }}
          onEditRoute={(routeId, routeData) => {
            startEditing(routeId, routeData);
          }}
        />

        {/* Elevation Profile moved inside the route detail panel */}
      </div>
    </TooltipProvider>
  );
}
