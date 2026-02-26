"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
// Using Mapbox instead of Google Maps for better outdoor mapping
import { RoutesMapMapbox as RoutesMapV2, RoutesMapMapboxHandle as RoutesMapV2Handle } from "@/components/routes/routes-map-mapbox";
import { RouteDetailDrawer } from "@/components/routes/route-detail-drawer";
import { RouteCreator, RouteCreatorToolbar, PathLayerToggles, Waypoint, RouteData, RouteStyle, ToolMode } from "@/components/routes/route-creator";
import { MapLayerControls, LayerSettings } from "@/components/routes/map-layer-controls";
import { RoutesNavTabs, RouteTab } from "@/components/routes/routes-nav-tabs";
import { SavedRoutesPanel } from "@/components/routes/saved-routes-panel";
import { FindRoutesPanel } from "@/components/routes/find-routes-panel";
import { RouteBottomSheet } from "@/components/routes/route-bottom-sheet";
import { RouteQuickCard } from "@/components/routes/route-quick-card";
import { RouteNavigator } from "@/components/routes/route-navigator";
import { PostRideReview } from "@/components/routes/post-ride-review";
import { ElevationProfile } from "@/components/routes/elevation-profile";
import { ClearRouteDialog, DiscardRouteDialog } from "@/components/routes/confirm-dialog";
import { RoutesMapHeader } from "@/components/routes/routes-map-header";
import { MobileTopHeader } from "@/components/routes/mobile-top-header";
import { MobileBottomNav } from "@/components/routes/mobile-bottom-nav";
import { MobileFabMenu } from "@/components/routes/mobile-fab-menu";
import { MobilePanelToggle } from "@/components/routes/mobile-panel-toggle";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Map, Settings, AlertTriangle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const HAZARD_TYPES = [
  { value: "tree_fall", label: "Fallen Tree" },
  { value: "flooding", label: "Flooding" },
  { value: "erosion", label: "Path Erosion" },
  { value: "livestock", label: "Livestock Warning" },
  { value: "closure", label: "Path Closed" },
  { value: "poor_visibility", label: "Poor Visibility" },
  { value: "ice_snow", label: "Ice/Snow" },
  { value: "overgrown", label: "Overgrown Path" },
  { value: "damaged_path", label: "Damaged Surface" },
  { value: "dangerous_crossing", label: "Dangerous Crossing" },
  { value: "other", label: "Other" },
];

export default function RoutesPage() {
  const mapRef = useRef<RoutesMapV2Handle>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

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
  const [selectedRouteWaypoints, setSelectedRouteWaypoints] = useState<any[]>([]);
  const [selectedRouteHazards, setSelectedRouteHazards] = useState<any[]>([]);
  const [initialWaypointId, setInitialWaypointId] = useState<string | null>(null);
  const [mapViewMode, setMapViewMode] = useState<"waypoints" | "hazards" | null>(null);

  // Hazard placement state
  const [placingHazard, setPlacingHazard] = useState(false);
  const [pendingHazardLocation, setPendingHazardLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hazardCreateDialogOpen, setHazardCreateDialogOpen] = useState(false);
  const [newHazardData, setNewHazardData] = useState({
    hazard_type: "",
    title: "",
    description: "",
    severity: "medium",
  });
  const [submittingNewHazard, setSubmittingNewHazard] = useState(false);

  // Route preview (quick card at bottom)
  const [previewRoute, setPreviewRoute] = useState<any | null>(null);

  // Layer settings - paths hidden by default in explore mode
  const [layerSettings, setLayerSettings] = useState<LayerSettings>({
    mapType: "topographic",
    showBridleways: false, // Hidden in explore mode
    showFootpaths: false,
    showByways: false,
    showRestrictedByways: false,
    showWaymarkers: false,
    showHazards: false,
    showProperties: true,
    showPOIs: false,
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
  const [showToolbarInCreate, setShowToolbarInCreate] = useState(true);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState<{ lat: number; lng: number }[]>([]);

  // Mobile create route state (toggles between map and options/settings view)
  const [mobileCreateView, setMobileCreateView] = useState<"options" | "map">("options");
  const [pendingTabChange, setPendingTabChange] = useState<RouteTab | null>(null);

  // Mobile panel state for Find/Saved (whether to show panel or map)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(true);

  // Mobile route detail view state
  const [mobileRouteDetailOpen, setMobileRouteDetailOpen] = useState(true);

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
  
  // POI state
  const [pois, setPois] = useState<any[]>([]);

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

  // Auto-refresh map pins every 10s when on main map (no route selected, not creating)
  useEffect(() => {
    const isMainMap = activeTab === "map" && !isCreating && !selectedRouteId;
    if (!isMainMap) return;

    const interval = setInterval(() => {
      fetchExploreRoutes();
    }, 10000);

    return () => clearInterval(interval);
  }, [activeTab, isCreating, selectedRouteId]);

  // Fetch POIs when toggle is activated
  useEffect(() => {
    if (layerSettings.showPOIs) {
      fetchPOIs();
    } else {
      setPois([]);
    }
  }, [layerSettings.showPOIs]);

  const fetchPOIs = async () => {
    try {
      // Get the current map center (default to UK center)
      let lat = 52.4862;
      let lng = -1.8904;
      
      // Try to get current map center if available
      if (mapRef.current?.getMap) {
        const map = mapRef.current.getMap();
        const center = map?.getCenter?.();
        if (center) {
          lat = center.lat;
          lng = center.lng;
        }
      }
      
      const res = await fetch("/api/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, radius: 10, limit: 20 }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setPois(data.pois || []);
      }
    } catch (error) {
      console.error("Failed to fetch POIs:", error);
    }
  };

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
    // If viewing a route and clicking "Map" tab, keep the route visible
    if (drawerOpen && tab === "map") {
      // Just close the details panel, keep the route drawn on the map
      setDrawerOpen(false);
      setMobileRouteDetailOpen(false); // Hide details, show map with route
      setActiveTab(tab);
      return; // Don't clear route data, don't continue
    }
    
    // Close route detail drawer if open and navigating to other tabs
    if (drawerOpen) {
      setDrawerOpen(false);
      setMobileRouteDetailOpen(true);
      setSelectedRouteId(null);
      setSelectedRouteData(null);
      setHighlightedRouteId(null);
      setDrawnRouteId(null);
      setPreviewRoute(null);
    }
    
    // Close quick card if showing
    if (previewRoute) {
      setPreviewRoute(null);
      setDrawnRouteId(null);
      setHighlightedRouteId(null);
    }
    
    if (isCreating && waypoints.length > 0 && tab !== "create") {
      setPendingTabChange(tab);
      setShowDiscardDialog(true);
    } else {
      setActiveTab(tab);
      // Reset panel states when switching tabs
      setMobilePanelOpen(true);
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

  // Exit hazards view mode when the user toggles hazards off in settings
  useEffect(() => {
    if (!layerSettings.showHazards && mapViewMode === "hazards") {
      setMapViewMode(null);
    }
  }, [layerSettings.showHazards, mapViewMode]);

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

  const fetchRouteWaypoints = async (routeId: string) => {
    try {
      const res = await fetch(`/api/routes/${routeId}/waypoints`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRouteWaypoints(data.waypoints || []);
      }
    } catch {
      setSelectedRouteWaypoints([]);
    }
  };

  // State for which route's polyline is drawn on the map
  const [drawnRouteId, setDrawnRouteId] = useState<string | null>(null);

  // Handle pin click - draws route on map + shows quick card at bottom
  const handleRoutePreview = (route: any) => {
    // Draw the route polyline on the map immediately
    setDrawnRouteId(route.id);
    setHighlightedRouteId(route.id);
    setPreviewRoute(route);
    
    // Close any existing drawer
    setDrawerOpen(false);
    setShowBottomSheet(false);
    
    // Store route data for later use
    setSelectedRouteData(route);
    setSelectedRouteId(route.id);

    // Fetch waypoints for map markers
    fetchRouteWaypoints(route.id);

    // Zoom to fit the route
    if (route?.geometry?.coordinates?.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitBounds(route.geometry.coordinates);
      }, 100);
    }
  };

  // Handle quick card click OR direct "View details" - open full modal
  const handleRouteClick = async (routeId: string) => {
    // Close the quick card
    setPreviewRoute(null);
    
    // Draw the route polyline on the map
    setDrawnRouteId(routeId);
    setSelectedRouteId(routeId);
    setHighlightedRouteId(routeId);
    
    // Open the full route detail modal
    setDrawerOpen(true);
    setShowBottomSheet(false);
    
    // Mobile: switch to map tab
    setActiveTab("map");
    setMobilePanelOpen(false);
    setMobileRouteDetailOpen(true);
    
    // Fetch full route data and waypoints
    const fullRoute = await fetchRouteData(routeId);
    setSelectedRouteData(fullRoute);
    fetchRouteWaypoints(routeId);

    // Zoom to fit the route (with slight delay to ensure map is ready)
    if (fullRoute?.geometry?.coordinates?.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitBounds(fullRoute.geometry.coordinates);
      }, 100);
    }
  };

  // Close the quick card and clear route preview
  const handleClosePreview = () => {
    setPreviewRoute(null);
    setDrawnRouteId(null);
    setSelectedRouteId(null);
    setSelectedRouteData(null);
    setHighlightedRouteId(null);
    setSelectedRouteWaypoints([]);
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

  // Handle waypoint marker click on map — open drawer to waypoints panel
  const handleWaypointClick = (waypointId: string) => {
    if (mapViewMode === "waypoints") {
      // In view mode, hover popup already shows info
      return;
    }
    if (!drawerOpen && selectedRouteId) {
      setDrawerOpen(true);
      setMobileRouteDetailOpen(true);
    }
    setInitialWaypointId(waypointId);
  };

  // Enter map view mode — hide drawer, show markers on map
  const handleEnterViewMode = (mode: "waypoints" | "hazards") => {
    setMapViewMode(mode);
    setDrawerOpen(false);
    setMobileRouteDetailOpen(false);
    // Sync layer settings so the toggle reflects the active view mode
    if (mode === "hazards") {
      setLayerSettings((prev) => ({ ...prev, showHazards: true }));
    }
    // Route stays drawn on map (selectedRouteId, selectedRouteData, drawnRouteId preserved)

    // Zoom map to fit route
    if (selectedRouteData?.geometry?.coordinates?.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitBounds(selectedRouteData.geometry.coordinates, {
          top: 60,
          bottom: 80,
          left: 20,
          right: 20,
        });
      }, 200);
    }
  };

  const handleResolveHazardFromMap = async (hazardId: string) => {
    try {
      // Check if this hazard is a warning — warnings use the vote endpoint
      const hazard = selectedRouteHazards.find((h: any) => h.id === hazardId);
      if (hazard?.is_warning) {
        const res = await fetch(`/api/routes/${selectedRouteId}/hazards/${hazardId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "resolved") {
            setSelectedRouteHazards((prev: any[]) =>
              prev.map((h: any) => (h.id === hazardId ? { ...h, status: "resolved" } : h))
            );
            toast.success("Warning cleared by community votes!");
          } else {
            setSelectedRouteHazards((prev: any[]) =>
              prev.map((h: any) =>
                h.id === hazardId
                  ? { ...h, clear_votes_count: data.clear_votes_count, user_has_voted: true }
                  : h
              )
            );
            toast.success(`${data.clear_votes_count}/${data.clear_votes_needed} say cleared`);
          }
        } else if (res.status === 409) {
          toast("You've already voted on this warning");
        } else {
          toast.error("Failed to vote");
        }
        return;
      }

      const res = await fetch(`/api/routes/${selectedRouteId}/hazards/${hazardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      if (res.ok) {
        setSelectedRouteHazards((prev: any[]) =>
          prev.map((h: any) => (h.id === hazardId ? { ...h, status: "resolved" } : h))
        );
        toast.success("Hazard marked as cleared!");
      }
    } catch {
      toast.error("Failed to update hazard");
    }
  };

  // Hazard placement: enter placement mode
  const handleStartPlacingHazard = () => {
    if (!userId) {
      toast.error("Please sign in to report hazards");
      return;
    }
    setPlacingHazard(true);
    setDrawerOpen(false);
    setMobileRouteDetailOpen(false);
    setMapViewMode(null);
    // Zoom to fit route so user can see where to click
    if (selectedRouteData?.geometry?.coordinates?.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitBounds(selectedRouteData.geometry.coordinates, {
          top: 80,
          bottom: 80,
          left: 20,
          right: 20,
        });
      }, 200);
    }
  };

  // Hazard placement: user clicked on valid location
  const handleHazardPlaced = (lat: number, lng: number) => {
    setPendingHazardLocation({ lat, lng });
    setPlacingHazard(false);
    setHazardCreateDialogOpen(true);
  };

  // Hazard placement: cancel
  const handleCancelPlacingHazard = () => {
    setPlacingHazard(false);
    setDrawerOpen(true);
    setMobileRouteDetailOpen(true);
  };

  // Hazard placement: submit
  const handleSubmitNewHazard = async () => {
    if (!newHazardData.hazard_type || !newHazardData.title) {
      toast.error("Please select a hazard type and add a title");
      return;
    }
    if (!pendingHazardLocation) return;

    setSubmittingNewHazard(true);
    try {
      const res = await fetch(`/api/routes/${selectedRouteId}/hazards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newHazardData,
          lat: pendingHazardLocation.lat,
          lng: pendingHazardLocation.lng,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedRouteHazards((prev) => [data.hazard, ...prev]);
        setHazardCreateDialogOpen(false);
        setPendingHazardLocation(null);
        setNewHazardData({ hazard_type: "", title: "", description: "", severity: "medium" });
        toast.success("Hazard reported! Thank you for helping keep others safe.");
        // Return to drawer
        setDrawerOpen(true);
        setMobileRouteDetailOpen(true);
      } else {
        toast.error("Failed to report hazard");
      }
    } catch {
      toast.error("Failed to report hazard");
    } finally {
      setSubmittingNewHazard(false);
    }
  };

  // Open full route details (from panels/bottom sheet)
  const handleRouteDetails = async (routeId: string) => {
    // Close any preview
    setPreviewRoute(null);
    
    // Draw the route polyline on the map
    setDrawnRouteId(routeId);
    setSelectedRouteId(routeId);
    setDrawerOpen(true);
    setShowBottomSheet(false);
    
    // On mobile, switch to map tab when viewing route details
    setActiveTab("map");
    setMobilePanelOpen(false);
    setMobileRouteDetailOpen(true);
    
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
    setShowToolbarInCreate(true);
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

          {/* Desktop: Show either nav tabs or creation toolbar (one at a time) */}
          {!showToolbarInCreate && (
            <div className="hidden md:block">
              <RoutesNavTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onSwitchToToolbar={() => setShowToolbarInCreate(true)}
              />
            </div>
          )}

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
              <div className="fixed bottom-20 left-0 right-0 pb-2 z-30">
                <MobilePanelToggle
                  mode="options"
                  onClick={() => setMobileCreateView("options")}
                  alwaysVisible={true}
                />
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

              {/* Fixed bottom buttons */}
              <div className="px-4 pb-4 pt-2 border-t bg-white space-y-3">
                {/* Map button - centered, discreet */}
                <MobilePanelToggle
                  mode="map"
                  onClick={() => setMobileCreateView("map")}
                  alwaysVisible={true}
                />
                
                {/* Cancel / Save buttons side by side */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full h-10 border-2 border-red-500 text-red-500 hover:bg-red-50"
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
                    className="flex-1 rounded-full h-10 bg-[#2E8B57] hover:bg-[#256b45] text-white"
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

          {/* Desktop Route creation toolbar (replaces nav tabs position) */}
          {showToolbarInCreate && (
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
                containerClassName="top-4"
                onSwitchBar={() => setShowToolbarInCreate(false)}
              />
            </div>
          )}

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
            selectedRouteData={selectedRouteData}
            pathLayers={pathLayers}
            propertyPins={layerSettings.showProperties ? nearbyProperties : []}
            highlightedRouteId={highlightedRouteId}
            mapType={getGoogleMapType()}
            monochrome={layerSettings.monochrome}
            userPosition={userPosition}
            followUser={isNavigating}
            recordedPath={recordedPath}
            pois={layerSettings.showPOIs ? pois : []}
            routeWaypoints={
              (mapViewMode === "waypoints" || layerSettings.showWaymarkers)
                ? selectedRouteWaypoints
                : []
            }
            showWaypoints={mapViewMode === "waypoints" || layerSettings.showWaymarkers}
            onWaypointClick={handleWaypointClick}
            routeHazards={
              (mapViewMode === "hazards" || layerSettings.showHazards)
                ? selectedRouteHazards.filter((h: any) => h.status === "active" && h.lat && h.lng)
                : []
            }
            showHazards={mapViewMode === "hazards" || layerSettings.showHazards}
            onHazardResolve={handleResolveHazardFromMap}
            isAuthenticated={!!userId}
            placingHazard={placingHazard}
            onHazardPlaced={handleHazardPlaced}
          />
        </div>

        {/* Hazard placement instruction bar */}
        {placingHazard && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 md:top-4">
            <div className="flex items-center gap-3 bg-white rounded-full shadow-lg border px-5 py-2.5">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Click on the route to place a hazard</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full"
                onClick={handleCancelPlacingHazard}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* View mode: clicking a route pin re-opens the route detail drawer */}

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

        {/* Mobile FAB Menu (+ button for settings) - only show when map is visible */}
        {/* Show when: map tab with no open panels, or viewing route with details collapsed */}
        {((activeTab === "map" && !drawerOpen) || 
          (activeTab === "map" && drawerOpen && !mobileRouteDetailOpen) ||
          ((activeTab === "find" || activeTab === "saved") && !mobilePanelOpen)) && (
          <MobileFabMenu 
            onOpenSettings={() => setShowLayerPanel(true)}
            onLocateMe={handleLocateMe}
          />
        )}

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
          <div className="md:hidden fixed bottom-20 left-0 right-0 pb-2 z-30">
            <MobilePanelToggle
              mode="options"
              onClick={() => setMobilePanelOpen(true)}
              alwaysVisible={true}
            />
          </div>
        )}

        {/* Mobile Options button - shown when viewing route with details collapsed */}
        {drawerOpen && !mobileRouteDetailOpen && (
          <div className="md:hidden fixed bottom-20 left-0 right-0 pb-2 z-30">
            <MobilePanelToggle
              mode="options"
              onClick={() => setMobileRouteDetailOpen(true)}
              alwaysVisible={true}
            />
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

        {/* Route Quick Card - appears when a pin is clicked */}
        {previewRoute && !drawerOpen && (
          <RouteQuickCard
            route={previewRoute}
            onClose={handleClosePreview}
            onClick={() => handleRouteClick(previewRoute.id)}
          />
        )}

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

        {/* Route Detail Modal */}
        {drawerOpen && (
        <RouteDetailDrawer
          routeId={selectedRouteId}
          open={drawerOpen}
          onClose={() => {
            // Full close: clear everything (called from full cleanup paths)
            setDrawerOpen(false);
            setSelectedRouteId(null);
            setSelectedRouteData(null);
            setHighlightedRouteId(null);
            setDrawnRouteId(null);
            setPreviewRoute(null);
            setMobileRouteDetailOpen(true);
          }}
          onDismiss={() => {
            // Dismiss modal only: keep route drawn, restore quick card
            setDrawerOpen(false);
            setMobileRouteDetailOpen(true);
            // Restore quick card with current route data
            if (selectedRouteData) {
              setPreviewRoute(selectedRouteData);
            }
            // Keep drawnRouteId, selectedRouteId, selectedRouteData, highlightedRouteId
          }}
          onShowPropertyOnMap={(propertyId, lat, lng) => {
            // Close the route drawer
            setDrawerOpen(false);
            setSelectedRouteId(null);
            setSelectedRouteData(null);
            setHighlightedRouteId(null);
            setDrawnRouteId(null);
            setMobileRouteDetailOpen(true);
            
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
          onFlyToLocation={(lat, lng) => {
            mapRef.current?.flyTo(lat, lng, 18);
          }}
          initialWaypointId={initialWaypointId}
          onWaypointFocused={() => setInitialWaypointId(null)}
          onEnterViewMode={handleEnterViewMode}
          onHazardsLoaded={(hazards: any[]) => setSelectedRouteHazards(hazards)}
          onHazardResolved={(hazardId: string) => {
            setSelectedRouteHazards((prev: any[]) =>
              prev.map((h: any) => (h.id === hazardId ? { ...h, status: "resolved" } : h))
            );
          }}
          onPlaceHazard={handleStartPlacingHazard}
          mobileShowDetails={mobileRouteDetailOpen}
          onMobileToggleDetails={setMobileRouteDetailOpen}
        />
        )}

        {/* Hazard Creation Dialog (page-level, after map placement) */}
        <Dialog
          open={hazardCreateDialogOpen}
          onOpenChange={(open) => {
            setHazardCreateDialogOpen(open);
            if (!open) {
              setPendingHazardLocation(null);
              setDrawerOpen(true);
              setMobileRouteDetailOpen(true);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report a Hazard</DialogTitle>
              <DialogDescription>
                Help other riders by reporting hazards on this route.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Hazard Type *</Label>
                <Select
                  value={newHazardData.hazard_type}
                  onValueChange={(v) => setNewHazardData((prev) => ({ ...prev, hazard_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {HAZARD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title *</Label>
                <Input
                  placeholder="Brief description..."
                  value={newHazardData.title}
                  onChange={(e) => setNewHazardData((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Details</Label>
                <Textarea
                  placeholder="Additional details..."
                  value={newHazardData.description}
                  onChange={(e) => setNewHazardData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <Label>Severity</Label>
                <Select
                  value={newHazardData.severity}
                  onValueChange={(v) => setNewHazardData((prev) => ({ ...prev, severity: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                    <SelectItem value="medium">Medium - Use caution</SelectItem>
                    <SelectItem value="high">High - Significant danger</SelectItem>
                    <SelectItem value="critical">Critical - Do not proceed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleSubmitNewHazard}
                disabled={submittingNewHazard}
                variant="destructive"
              >
                {submittingNewHazard ? "Submitting..." : "Report Hazard"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Elevation Profile moved inside the route detail panel */}
      </div>
    </TooltipProvider>
  );
}
