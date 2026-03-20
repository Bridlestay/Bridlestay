"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
// Using Mapbox instead of Google Maps for better outdoor mapping
import { RoutesMapMapbox as RoutesMapV2, RoutesMapMapboxHandle as RoutesMapV2Handle } from "@/components/routes/routes-map-mapbox";
import { RouteDetailDrawer } from "@/components/routes/route-detail-drawer";
import { RouteCreatorToolbar, Waypoint, RouteStyle, ToolMode } from "@/components/routes/route-creator";
import { RouteStatsPill, SaveRouteButton } from "@/components/routes/route-creation-overlay";
import { SaveRouteModal, SaveRouteFormData } from "@/components/routes/save-route-modal";
import { MapLayerControls, LayerSettings } from "@/components/routes/map-layer-controls";
import { RoutesNavTabs, RouteTab } from "@/components/routes/routes-nav-tabs";
import { FindRoutesPanel } from "@/components/routes/find-routes-panel";
import { RouteBottomSheet } from "@/components/routes/route-bottom-sheet";
import { RouteQuickCard } from "@/components/routes/route-quick-card";
import { RouteNavigator } from "@/components/routes/route-navigator";
import { PostRideReview } from "@/components/routes/post-ride-review";
import { ElevationProfile } from "@/components/routes/elevation-profile";
import { ClearRouteDialog, DiscardRouteDialog } from "@/components/routes/confirm-dialog";
import { QuickAddWaypointDialog, TempRouteWaypoint } from "@/components/routes/quick-add-waypoint-dialog";
import { RoutesMapHeader } from "@/components/routes/routes-map-header";
import { MobileTopHeader } from "@/components/routes/mobile-top-header";
import { MobileBottomNav } from "@/components/routes/mobile-bottom-nav";
import { MobileFabMenu } from "@/components/routes/mobile-fab-menu";
import { MobilePanelToggle } from "@/components/routes/mobile-panel-toggle";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Map, Settings, AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";
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

// Compute distance along a polyline from start to the nearest projection of a point
function distanceAlongCoords(
  pointLng: number, pointLat: number,
  coords: [number, number][]
): number {
  let cumDist = 0;
  let minProjDist = Infinity;
  let result = 0;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  for (let i = 0; i < coords.length - 1; i++) {
    const [aLng, aLat] = coords[i];
    const [bLng, bLat] = coords[i + 1];
    // Project point onto segment
    const dx = bLng - aLng, dy = bLat - aLat;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((pointLng - aLng) * dx + (pointLat - aLat) * dy) / lenSq));
    const nearLng = aLng + t * dx, nearLat = aLat + t * dy;
    const projDist = haversine(pointLat, pointLng, nearLat, nearLng);
    if (projDist < minProjDist) {
      minProjDist = projDist;
      result = cumDist + haversine(aLat, aLng, nearLat, nearLng);
    }
    cumDist += haversine(aLat, aLng, bLat, bLng);
  }
  return result;
}

// Simple haversine distance in km between two points
function haversineSimple(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  const router = useRouter();
  const mapRef = useRef<RoutesMapV2Handle>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Fetch current user on mount — redirect if not logged in
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/sign-in");
        return;
      }
      setUserId(user.id);
      setAuthChecked(true);
    });
  }, [router]);

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<RouteTab>("map");

  // Panel states
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetRoutes, setBottomSheetRoutes] = useState<any[]>([]);
  const [isCluster, setIsCluster] = useState(false);
  const [clusterCount, setClusterCount] = useState(0);
  // Cluster route browsing — quick card with prev/next arrows
  const [clusterBrowseRoutes, setClusterBrowseRoutes] = useState<any[]>([]);
  const [clusterBrowseIndex, setClusterBrowseIndex] = useState(0);
  const clusterBrowseRef = useRef(clusterBrowseRoutes);
  clusterBrowseRef.current = clusterBrowseRoutes;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(null);

  // Route data
  const [exploreRoutes, setExploreRoutes] = useState<any[]>([]);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);
  const [selectedRouteData, setSelectedRouteData] = useState<any | null>(null);
  const [selectedRouteWaypoints, setSelectedRouteWaypoints] = useState<any[]>([]);
  const [selectedRouteHazards, setSelectedRouteHazards] = useState<any[]>([]);
  const [initialWaypointId, setInitialWaypointId] = useState<string | null>(null);
  const [initialCommentId, setInitialCommentId] = useState<string | null>(null);
  const [initialInfoTab, setInitialInfoTab] = useState<"elevation" | "waypoints" | "hazards" | "warnings" | "variants" | "weather" | "nearby-stays" | null>(null);
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

  // Waypoint placement state (for adding waypoints during route creation)
  const [placingWaypoint, setPlacingWaypoint] = useState(false);
  const [waypointClickHandler, setWaypointClickHandler] = useState<((lat: number, lng: number) => void) | null>(null);

  // Route preview (quick card at bottom)
  const [previewRoute, setPreviewRoute] = useState<any | null>(null);

  // Layer settings - paths hidden by default in explore mode
  const [layerSettings, setLayerSettings] = useState<LayerSettings>(() => {
    const defaults = {
      routeColor: "#3B82F6",
      routeThickness: 4,
      routeOpacity: 80,
    };
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("padoq_route_style_defaults");
        if (saved) Object.assign(defaults, JSON.parse(saved));
      } catch {}
    }
    return {
      mapType: "topographic",
      showBridleways: false,
      showFootpaths: false,
      showByways: false,
      showRestrictedByways: false,
      showWaymarkers: false,
      showHazards: false,
      showProperties: true,
      showPOIs: false,
      routeColor: defaults.routeColor,
      routeThickness: defaults.routeThickness,
      routeOpacity: defaults.routeOpacity,
      monochrome: false,
    };
  });

  // Create/Edit Route state
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editingRouteData, setEditingRouteData] = useState<any>(null);
  const [variantOfName, setVariantOfName] = useState<string | undefined>();
  const [variantOfRouteId, setVariantOfRouteId] = useState<string | null>(null);
  const [isPlotting, setIsPlotting] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeType, setRouteType] = useState<"circular" | "linear">("linear");
  const [history, setHistory] = useState<
    { waypoints: Waypoint[]; segments: Map<number, [number, number][]> }[]
  >([]);
  const [toolMode, setToolMode] = useState<ToolMode>("plot");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // POI waypoints during creation (points of interest placed with Insert/Waypoint tool)
  const [creationPOIs, setCreationPOIs] = useState<TempRouteWaypoint[]>([]);
  const [poiDialogOpen, setPoiDialogOpen] = useState(false);
  const [poiDialogPosition, setPoiDialogPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState<{ lat: number; lng: number }[]>([]);

  const [pendingTabChange, setPendingTabChange] = useState<RouteTab | null>(null);

  // Mobile panel state for Find/Saved (whether to show panel or map)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(true);

  // Mobile route detail view state
  const [mobileRouteDetailOpen, setMobileRouteDetailOpen] = useState(true);

  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingRoute, setNavigatingRoute] = useState<any | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number; heading: number } | null>(null);
  const [navSegmentIndex, setNavSegmentIndex] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const locateWatchRef = useRef<number | null>(null);

  // Post-ride review
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rideStats, setRideStats] = useState<any>(null);

  // Dialog states
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  
  // POI state
  const [pois, setPois] = useState<any[]>([]);

  // Derive route style from layer settings
  const routeStyle: RouteStyle = {
    color: layerSettings.routeColor,
    thickness: layerSettings.routeThickness,
    opacity: layerSettings.routeOpacity,
  };

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

  // Auto-refresh map pins every 1.5s when on main map (no route selected, not creating)
  useEffect(() => {
    const isMainMap = activeTab === "map" && !isCreating && !selectedRouteId;
    if (!isMainMap) return;

    const interval = setInterval(() => {
      fetchExploreRoutes();
    }, 1500);

    return () => clearInterval(interval);
  }, [activeTab, isCreating, selectedRouteId]);

  // Handle ?route=ID&comment=ID query params (from notification links)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const routeId = params.get("route");
    if (!routeId || exploreRoutes.length === 0) return;

    const commentId = params.get("comment");

    const openRoute = (routeData: any) => {
      setDrawnRouteId(routeId);
      setSelectedRouteId(routeId);
      setSelectedRouteData(routeData);
      setHighlightedRouteId(routeId);
      setDrawerOpen(true);
      setActiveTab("map");
      fetchRouteWaypoints(routeId);
      if (commentId) setInitialCommentId(commentId);
      router.replace("/routes", { scroll: false });
    };

    // Find the route in loaded data
    const route = exploreRoutes.find((r) => r.id === routeId);
    if (route) {
      openRoute(route);
    } else {
      // Route not in explore list — try fetching directly
      fetch(`/api/routes/${routeId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.route) {
            openRoute(data.route);
          } else {
            router.replace("/routes", { scroll: false });
          }
        })
        .catch(() => {
          router.replace("/routes", { scroll: false });
        });
    }
  }, [exploreRoutes]);

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
      // Don't call startCreating if we're already editing — startEditing
      // sets activeTab to "create" and we don't want to reset editing state
      if (!isEditing) {
        startCreating();
      }
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

  // Exit waypoints view mode when the user toggles waypoints off in settings
  useEffect(() => {
    if (!layerSettings.showWaymarkers && mapViewMode === "waypoints") {
      setMapViewMode(null);
    }
  }, [layerSettings.showWaymarkers, mapViewMode]);

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
        // Only add user's own PUBLIC routes to the map (private routes shouldn't inflate cluster counts)
        const existingIds = new Set(allRoutes.map(r => r.id));
        for (const route of myData.routes || []) {
          if (!existingIds.has(route.id) && (route.visibility === "public" || route.is_public)) {
            allRoutes.push(route);
          }
        }
      }

      // Filter out variants (show_on_explore = false) from map pins
      const visibleRoutes = allRoutes.filter(r => r.show_on_explore !== false);
      setExploreRoutes(visibleRoutes);
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

    // Clear cluster browse state — individual pin click exits cluster mode
    setClusterBrowseRoutes([]);
    setClusterBrowseIndex(0);

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

  // Handle click from Find panel — fly to route and show quick card
  const handleFindRouteClick = async (routeId: string) => {
    // Switch to map view and close Find panel
    setActiveTab("map");
    setMobilePanelOpen(false);

    // Fetch full route data
    const fullRoute = await fetchRouteData(routeId);
    if (fullRoute) {
      handleRoutePreview(fullRoute);
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
    setClusterBrowseRoutes([]);
    setClusterBrowseIndex(0);
  };

  // Handle cluster click — show quick card with prev/next navigation
  const handleClusterClick = (routeIds: string[], count: number) => {
    const routes = exploreRoutes.filter((r) => routeIds.includes(r.id));
    if (routes.length === 0) return;

    // Preserve the currently viewed route if it's in this cluster
    const currentId = previewRoute?.id || selectedRouteId;
    const preservedIndex = currentId ? routes.findIndex((r) => r.id === currentId) : -1;
    const startIndex = preservedIndex >= 0 ? preservedIndex : 0;
    const startRoute = routes[startIndex];

    setClusterBrowseRoutes(routes);
    setClusterBrowseIndex(startIndex);
    setPreviewRoute(startRoute);
    setDrawnRouteId(startRoute.id);
    setHighlightedRouteId(startRoute.id);
    setSelectedRouteData(startRoute);
    setSelectedRouteId(startRoute.id);
    setDrawerOpen(false);
    setShowBottomSheet(false);
    fetchRouteWaypoints(startRoute.id);
  };

  // When visible routes change (zoom/pan), expand cluster navigation to all visible routes
  const handleVisibleRoutesChange = useCallback((routeIds: string[]) => {
    // Only update when actively browsing cluster routes
    if (clusterBrowseRef.current.length === 0) return;

    const visibleRoutes = exploreRoutes.filter((r) => routeIds.includes(r.id));
    if (visibleRoutes.length === 0) return;

    // Cap at 50 routes to keep navigation usable
    const capped = visibleRoutes.slice(0, 50);

    // Only update if the set of routes actually changed
    const currentIds = new Set(clusterBrowseRef.current.map((r) => r.id));
    const newIds = new Set(capped.map((r) => r.id));
    if (currentIds.size === newIds.size && [...currentIds].every((id) => newIds.has(id))) return;

    // Preserve the currently viewed route's position
    const currentRoute = clusterBrowseRef.current[clusterBrowseIndex];
    const newIndex = currentRoute ? capped.findIndex((r) => r.id === currentRoute.id) : 0;

    setClusterBrowseRoutes(capped);
    setClusterBrowseIndex(newIndex >= 0 ? newIndex : 0);
  }, [exploreRoutes, clusterBrowseIndex]);

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
    // Show quick card at bottom for easy navigation back to route detail
    if (selectedRouteData) {
      setPreviewRoute(selectedRouteData);
    }
    // Sync layer settings so the toggle reflects the active view mode
    if (mode === "hazards") {
      setLayerSettings((prev) => ({ ...prev, showHazards: true }));
    }
    if (mode === "waypoints") {
      setLayerSettings((prev) => ({ ...prev, showWaymarkers: true }));
    }
    // Route stays drawn on map (selectedRouteId, selectedRouteData, drawnRouteId preserved)

    // Zoom map to fit route
    if (selectedRouteData?.geometry?.coordinates?.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitBounds(selectedRouteData.geometry.coordinates);
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
        mapRef.current?.fitBounds(selectedRouteData.geometry.coordinates);
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

  // Waypoint placement: handle mode change from RouteCreator
  const handleWaypointPlacementModeChange = (enabled: boolean, handler: (lat: number, lng: number) => void) => {
    setPlacingWaypoint(enabled);
    setWaypointClickHandler(enabled ? () => handler : null);
  };

  // Waypoint placement: user clicked on map
  const handleWaypointPlaced = (lat: number, lng: number) => {
    if (waypointClickHandler) {
      waypointClickHandler(lat, lng);
      setPlacingWaypoint(false);
      setWaypointClickHandler(null);
    }
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

  // Handle navigation completion (auto-called when rider reaches endpoint)
  const handleNavigationComplete = (stats: { distance_km: number; duration_seconds: number; avg_speed_kmh: number }) => {
    setIsNavigating(false);
    setNavSegmentIndex(0);
    setDrawnRouteId(null);
    setPreviewRoute(null);
    setSelectedRouteId(null);
    setRideStats({
      distance_km: stats.distance_km,
      duration_minutes: Math.round(stats.duration_seconds / 60),
      avg_speed_kmh: stats.avg_speed_kmh,
    });
    toast.success("Route completed! Ride logged automatically.");
    setShowReviewDialog(true);
  };

  // Handle start navigation from detail drawer
  const handleStartNavigation = async (routeId: string, routeData: any) => {
    // Fetch full route with hazards/waypoints if needed
    let fullRoute = routeData;
    if (!fullRoute?.geometry?.coordinates) {
      fullRoute = await fetchRouteData(routeId);
    }
    if (!fullRoute?.geometry?.coordinates?.length) {
      toast.error("Route has no geometry data");
      return;
    }

    // Fetch waypoints and hazards for the route
    const [waypointsRes, hazardsRes] = await Promise.all([
      fetch(`/api/routes/${routeId}/waypoints`).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/routes/${routeId}/hazards`).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]);

    setNavigatingRoute({
      ...fullRoute,
      id: routeId,
      waypoints: waypointsRes?.waypoints || [],
      hazards: (hazardsRes?.hazards || []).filter((h: any) => h.status === "active"),
    });
    setIsNavigating(true);
    setDrawerOpen(false);
    setMobileRouteDetailOpen(false);

    // Start GPS if not already locating
    if (!isLocating) {
      handleLocateMe();
    }
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

  // Map controls — locate me (GPS dot)
  const locateCenteredRef = useRef(false);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your device");
      return;
    }

    // If already locating, just re-centre on current position
    if (isLocating && userPosition) {
      mapRef.current?.flyTo(userPosition.lat, userPosition.lng, 16);
      return;
    }

    // Start GPS — use getCurrentPosition first for an immediate fix (works
    // reliably on desktop WiFi/IP geolocation), then start watchPosition
    // for continuous updates.
    setIsLocating(true);
    locateCenteredRef.current = false;

    const onPosition = (pos: GeolocationPosition) => {
      const { latitude, longitude, heading } = pos.coords;
      setUserPosition({ lat: latitude, lng: longitude, heading: heading || 0 });
      if (!locateCenteredRef.current) {
        locateCenteredRef.current = true;
        mapRef.current?.flyTo(latitude, longitude, 16);
      }
    };

    const startWatch = (highAccuracy: boolean) => {
      locateWatchRef.current = navigator.geolocation.watchPosition(
        onPosition,
        (error) => {
          console.error("GPS watch error:", error.code, error.message);
          if (highAccuracy && error.code === 3) {
            // Timeout with high accuracy — retry with low accuracy (desktop fallback)
            if (locateWatchRef.current !== null) {
              navigator.geolocation.clearWatch(locateWatchRef.current);
            }
            startWatch(false);
            return;
          }
          if (!locateCenteredRef.current) {
            toast.error(
              error.code === 1
                ? "Location permission denied. Please allow location access in your browser settings."
                : "Could not get your location"
            );
            setIsLocating(false);
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          maximumAge: highAccuracy ? 3000 : 10000,
          timeout: highAccuracy ? 15000 : 30000,
        }
      );
    };

    // One-shot first for immediate fix (especially reliable on desktop)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPosition(pos);
        startWatch(true);
      },
      () => {
        // getCurrentPosition failed — fall back to watchPosition directly
        startWatch(true);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  };

  // Cleanup locate watch on unmount
  useEffect(() => {
    return () => {
      if (locateWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locateWatchRef.current);
      }
    };
  }, []);

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

  // Snapshot current state for undo history (waypoints + snapped segments).
  // When segments are mutated before the callback (erase/drag), pass the
  // pre-mutation snapshot so history captures the true previous state.
  const pushHistory = useCallback(
    (segmentsSnapshot?: Map<number, [number, number][]>) => {
      const segments =
        segmentsSnapshot ??
        mapRef.current?.getSnappedSegments() ??
        new Map();
      setHistory((prev) => [...prev, { waypoints, segments }]);
    },
    [waypoints]
  );

  // Waypoint management
  const addWaypoint = useCallback(
    (lat: number, lng: number, snapped = false, pathType?: string) => {
      pushHistory();
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
      pushHistory();
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
    (id: string, lat: number, lng: number, snapped = false, segmentsSnapshot?: Map<number, [number, number][]>) => {
      pushHistory(segmentsSnapshot);
      setWaypoints((prev) =>
        prev.map((wp) => (wp.id === id ? { ...wp, lat, lng, snapped } : wp))
      );
    },
    [waypoints]
  );

  const removeWaypoint = useCallback(
    (id: string, segmentsSnapshot?: Map<number, [number, number][]>) => {
      pushHistory(segmentsSnapshot);
      const remaining = waypoints.filter((wp) => wp.id !== id);
      setWaypoints(remaining);
      // If route is circular, check if it should revert to linear
      if (routeType === "circular") {
        if (remaining.length < 3) {
          setRouteType("linear");
          setIsPlotting(true);
          toast.info("Route is no longer circular");
        } else {
          const first = remaining[0];
          const last = remaining[remaining.length - 1];
          const dist = haversineSimple(first.lat, first.lng, last.lat, last.lng);
          if (dist > 0.05) { // 50m — last point is too far from start
            setRouteType("linear");
            setIsPlotting(true);
            toast.info("Route is no longer circular");
            return;
          }
        }
      }
      toast.info("Waypoint removed");
    },
    [waypoints, routeType]
  );

  const handleCircularDetected = useCallback(() => {
    if (routeType === "linear") {
      setRouteType("circular");
      setIsPlotting(false);
      toast.success("Route closed! Now a circular route.");
    } else {
      if (waypoints.length > 0) {
        pushHistory();
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
    // Restore exact waypoints AND snapped segments from history snapshot
    // — no re-fetching from Mapbox, so the route looks exactly as it did
    mapRef.current?.restoreSnappedSegments(previousState.segments);
    setWaypoints(previousState.waypoints);
    // Always revert to linear when undoing from circular — the circular
    // detection doesn't add a waypoint, so undo removes the last plotted
    // point, which should reopen the route for continued plotting
    if (routeType === "circular") {
      setRouteType("linear");
      setIsPlotting(true);
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
    setCreationPOIs([]);
    setRouteType("linear");
    toast.info("Route cleared");
  }, []);

  // POI waypoint handlers (Insert/Waypoint tool)
  const handleCreationPOIAdd = useCallback((lat: number, lng: number) => {
    setPoiDialogPosition({ lat, lng });
    setPoiDialogOpen(true);
  }, []);

  const handleCreationPOIConfirm = useCallback((poi: TempRouteWaypoint) => {
    setCreationPOIs((prev) => [...prev, poi]);
    setPoiDialogOpen(false);
    setPoiDialogPosition(null);
    toast.success(`Waypoint "${poi.name}" added`);
  }, []);

  const handleCreationPOIUpdate = useCallback((id: string, lat: number, lng: number) => {
    setCreationPOIs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, lat, lng } : p))
    );
  }, []);

  const handleCreationPOIRemove = useCallback((id: string) => {
    setCreationPOIs((prev) => prev.filter((p) => p.id !== id));
    toast.info("Waypoint removed");
  }, []);

  // Edit an existing creation POI — open dialog pre-filled
  const [editingPOI, setEditingPOI] = useState<TempRouteWaypoint | null>(null);
  const handleCreationPOIEdit = useCallback((id: string) => {
    setCreationPOIs((prev) => {
      const poi = prev.find((p) => p.id === id);
      if (poi) {
        setEditingPOI(poi);
        setPoiDialogOpen(true);
      }
      return prev;
    });
  }, []);

  const handleCreationPOIEditConfirm = useCallback((updated: TempRouteWaypoint) => {
    setCreationPOIs((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    setEditingPOI(null);
    setPoiDialogOpen(false);
    toast.success(`Waypoint "${updated.name}" updated`);
  }, []);

  // Distance calculation for the floating stats pill
  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const createDistanceKm = (() => {
    if (waypoints.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      total += haversineDistance(
        waypoints[i - 1].lat, waypoints[i - 1].lng,
        waypoints[i].lat, waypoints[i].lng
      );
    }
    if (routeType === "circular" && waypoints.length > 2) {
      total += haversineDistance(
        waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng,
        waypoints[0].lat, waypoints[0].lng
      );
    }
    return total;
  })();

  const createRideTimeMinutes = Math.round((createDistanceKm / 10) * 60);

  // Handle save from the new modal (wraps handleSaveRoute + photo uploads)
  const handleModalSave = async (formData: SaveRouteFormData) => {
    if (waypoints.length < 2) {
      throw new Error("At least 2 waypoints are required");
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description?.trim() || "",
      visibility: formData.visibility,
      difficulty: formData.difficulty,
      route_type: routeType,
      geometry: {
        type: "LineString",
        coordinates: mapRef.current?.getRouteGeometry?.() || waypoints.map((wp) => [wp.lng, wp.lat]),
        // Preserve original user-placed spine points for editing
        // (the full coordinates contain snapped road geometry with many intermediate points)
        spine_points: waypoints.map((wp) => [wp.lng, wp.lat]),
      },
      distance_km: createDistanceKm,
      estimated_time_minutes: createRideTimeMinutes,
      is_public: formData.visibility === "public",
    };

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

    const savedRoute = await res.json();
    const routeId = savedRoute.route?.id || savedRoute.id;

    // Upload photos if any
    if (formData.photos.length > 0 && routeId) {
      try {
        for (const photo of formData.photos) {
          const photoForm = new FormData();
          photoForm.append("file", photo.file);
          await fetch(`/api/routes/${routeId}/photos`, {
            method: "POST",
            body: photoForm,
          });
        }
      } catch (photoError) {
        console.error("Failed to upload some photos:", photoError);
        toast.warning("Route saved, but some photos failed to upload");
      }
    }

    // Save POI waypoints if any were placed during creation
    // Sort by distance along route from start so order_index matches proximity to start
    if (creationPOIs.length > 0 && routeId) {
      try {
        const routeCoords = payload.geometry.coordinates as [number, number][];
        const sortedPOIs = [...creationPOIs].sort((a, b) => {
          const distA = distanceAlongCoords(a.lng, a.lat, routeCoords);
          const distB = distanceAlongCoords(b.lng, b.lat, routeCoords);
          return distA - distB;
        });
        for (let i = 0; i < sortedPOIs.length; i++) {
          const poi = sortedPOIs[i];
          await fetch(`/api/routes/${routeId}/waypoints`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: poi.lat,
              lng: poi.lng,
              name: poi.name,
              tag: poi.tag || "note",
              icon_type: poi.icon_type,
              description: poi.description,
              order_index: i,
            }),
          });
        }
      } catch (waypointError) {
        console.error("Failed to save some waypoints:", waypointError);
        toast.warning("Route saved, but some waypoints failed to save");
      }
    }

    // Handle variant linking (for new routes only)
    if (!isEditing && routeId) {
      const matchToLink = formData.similarMatch;
      const isFork = !!variantOfRouteId;

      if (isFork || (matchToLink && !formData.saveAsStandalone)) {
        const parentId = variantOfRouteId || matchToLink?.route_id;
        const score = matchToLink?.similarity_score || 100;
        const source = isFork ? "fork" : "auto";

        try {
          // Create variant link
          await fetch(`/api/routes/${parentId}/variants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              variant_route_id: routeId,
              similarity_score: score,
              source,
            }),
          });

          // Set show_on_explore to false for the variant
          await fetch(`/api/routes/${routeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              show_on_explore: false,
              variant_of_id: parentId,
            }),
          });
        } catch (variantError) {
          console.error("Failed to link variant:", variantError);
        }
      }
    }

    toast.success(isEditing ? "Route updated!" : "Route saved!");

    // Reset state
    setIsCreating(false);
    setIsEditing(false);
    setEditingRouteId(null);
    setEditingRouteData(null);
    setVariantOfName(undefined);
    setVariantOfRouteId(null);
    setWaypoints([]);
    setCreationPOIs([]);
    setHistory([]);
    setRouteType("linear");
    setToolMode("plot");
    setActiveTab("map");
    setDrawnRouteId(null);
    setShowSaveModal(false);
    fetchExploreRoutes();
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
    // Stop locate-me GPS watch to prevent map re-centering during creation
    if (locateWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locateWatchRef.current);
      locateWatchRef.current = null;
      setIsLocating(false);
    }
    setIsCreating(true);
    setIsEditing(false);
    setEditingRouteId(null);
    setEditingRouteData(null);
    setVariantOfName(undefined);
    setVariantOfRouteId(null);
    setIsPlotting(true);
    setToolMode("plot");
    setShowBottomSheet(false);
  };

  const startEditing = (routeId: string, routeData: any) => {
    // Close the drawer first
    setDrawerOpen(false);
    setSelectedRouteId(null);
    
    // Use original spine points if available (saved since this fix),
    // otherwise fall back to full geometry coordinates (older routes)
    const spinePoints = routeData.geometry?.spine_points;
    const coords = spinePoints || routeData.geometry?.coordinates || [];
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

  const startForkingVariant = (parentRouteId: string, parentRouteData: any) => {
    // Close the drawer first
    setDrawerOpen(false);
    setSelectedRouteId(null);

    // Extract spine points from parent route
    const spinePoints = parentRouteData.geometry?.spine_points;
    const coords = spinePoints || parentRouteData.geometry?.coordinates || [];
    const extractedWaypoints: Waypoint[] = coords.map((coord: number[], index: number) => ({
      id: `wp-${Date.now()}-${index}`,
      lat: coord[1],
      lng: coord[0],
      snapped: false,
    }));

    // Set up creation mode (NOT editing) with parent's waypoints
    setWaypoints(extractedWaypoints);
    setRouteType(parentRouteData.route_type === "circular" ? "circular" : "linear");
    setIsCreating(true);
    setIsEditing(false);
    setEditingRouteId(null);
    setEditingRouteData(null);
    setIsPlotting(true);
    setToolMode("plot");
    setActiveTab("create");

    // Set variant metadata so save modal knows this is a fork
    setVariantOfName(parentRouteData.title || "Untitled Route");
    setVariantOfRouteId(parentRouteId);
  };

  const cancelCreating = () => {
    setIsCreating(false);
    setIsEditing(false);
    setEditingRouteId(null);
    setEditingRouteData(null);
    setVariantOfName(undefined);
    setVariantOfRouteId(null);
    setIsPlotting(false);
    setWaypoints([]);
    setCreationPOIs([]);
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
              displayRouteColor={layerSettings.routeColor}
              displayRouteThickness={layerSettings.routeThickness}
              displayRouteOpacity={layerSettings.routeOpacity}
              onWaypointAdd={addWaypoint}
              onWaypointUpdate={updateWaypoint}
              onWaypointRemove={removeWaypoint}
              onWaypointInsert={insertWaypoint}
              onCircularDetected={handleCircularDetected}
              placingRouteWaypoint={placingWaypoint}
              onRouteWaypointPlaced={handleWaypointPlaced}
              creationPOIs={creationPOIs}
              onCreationPOIAdd={handleCreationPOIAdd}
              onCreationPOIUpdate={handleCreationPOIUpdate}
              onCreationPOIRemove={handleCreationPOIRemove}
              onCreationPOIEdit={handleCreationPOIEdit}
            />
          </div>

          {/* MOBILE: Top header */}
          <div className="md:hidden">
            <MobileTopHeader />

            {/* Mobile toolbar below header */}
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
                isMobile={true}
                onExitCreation={() => {
                  if (waypoints.length > 0) {
                    setShowDiscardDialog(true);
                  } else {
                    confirmCancel();
                  }
                }}
              />
            </div>
          </div>

          {/* Desktop: Always show creation toolbar */}
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
              containerClassName="top-4"
              onExitCreation={() => {
                if (waypoints.length > 0) {
                  setShowDiscardDialog(true);
                } else {
                  confirmCancel();
                }
              }}
            />
          </div>

          {/* Floating stats pill — bottom-left */}
          <div className="absolute bottom-4 left-3 z-20 md:bottom-8 md:left-8">
            <RouteStatsPill
              distanceKm={createDistanceKm}
              rideTimeMinutes={createRideTimeMinutes}
            />
          </div>

          {/* Floating save button — bottom-right */}
          <div className="absolute bottom-4 right-3 z-20 md:bottom-8 md:right-8">
            <SaveRouteButton
              waypointCount={waypoints.length}
              onClick={() => setShowSaveModal(true)}
            />
          </div>

          {/* Map controls — desktop */}
          <div className="hidden md:block">
            <MapLayerControls
              settings={layerSettings}
              onSettingsChange={setLayerSettings}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onLocateMe={handleLocateMe}
              isLocating={isLocating}
            />
          </div>

          {/* Mobile layer panel */}
          <MapLayerControls
            settings={layerSettings}
            onSettingsChange={setLayerSettings}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onLocateMe={handleLocateMe}
            isLocating={isLocating}
            showPanel={showLayerPanel}
            onPanelChange={setShowLayerPanel}
            className="hidden"
          />

          {/* Save Route Modal */}
          <SaveRouteModal
            key={isEditing ? `edit-${editingRouteId}` : "create"}
            open={showSaveModal}
            onClose={() => setShowSaveModal(false)}
            onSave={handleModalSave}
            distanceKm={createDistanceKm}
            rideTimeMinutes={createRideTimeMinutes}
            routeType={routeType}
            isEditing={isEditing}
            existingData={
              isEditing && editingRouteData
                ? {
                    title: editingRouteData.title || "",
                    description: editingRouteData.description || "",
                    visibility: editingRouteData.visibility || "private",
                    difficulty: editingRouteData.difficulty || "unrated",
                  }
                : undefined
            }
            geometry={
              showSaveModal
                ? {
                    type: "LineString",
                    coordinates:
                      mapRef.current?.getRouteGeometry?.() ||
                      waypoints.map((wp) => [wp.lng, wp.lat]),
                  }
                : undefined
            }
            editingRouteId={editingRouteId}
            variantOfName={variantOfName}
            variantOfRouteId={variantOfRouteId}
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
        <QuickAddWaypointDialog
          open={poiDialogOpen}
          onOpenChange={(open) => {
            setPoiDialogOpen(open);
            if (!open) {
              setPoiDialogPosition(null);
              setEditingPOI(null);
            }
          }}
          position={poiDialogPosition}
          onAdd={handleCreationPOIConfirm}
          editingWaypoint={editingPOI}
          onUpdate={handleCreationPOIEditConfirm}
        />
      </TooltipProvider>
    );
  }

  // Wait for auth check before rendering
  if (!authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
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
            onVisibleRoutesChange={handleVisibleRoutesChange}
            selectedRouteId={drawnRouteId}
            selectedRouteData={selectedRouteData}
            pathLayers={pathLayers}
            propertyPins={layerSettings.showProperties ? nearbyProperties : []}
            highlightedRouteId={highlightedRouteId}
            mapType={getGoogleMapType()}
            monochrome={layerSettings.monochrome}
            displayRouteColor={layerSettings.routeColor}
            displayRouteThickness={layerSettings.routeThickness}
            displayRouteOpacity={layerSettings.routeOpacity}
            userPosition={userPosition}
            followUser={isNavigating}
            navSegmentIndex={isNavigating ? navSegmentIndex : undefined}
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

        {/* Waypoint placement instruction bar (route creation mode only) */}
        {placingWaypoint && isCreating && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 md:top-4">
            <div className="flex items-center gap-3 bg-white rounded-full shadow-lg border px-5 py-2.5">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Click on the map to add a waypoint</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full"
                onClick={() => {
                  setPlacingWaypoint(false);
                  setWaypointClickHandler(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* View mode: clicking a route pin re-opens the route detail drawer */}

        {/* Mobile Top Header (hamburger, search, profile) - hidden during navigation */}
        {!isNavigating && <MobileTopHeader />}

        {/* Desktop Map Header with hamburger menu (only visible when map tab is active) */}
        {activeTab === "map" && !isNavigating && (
          <div className="hidden md:block">
            <RoutesMapHeader />
          </div>
        )}

        {/* Desktop Navigation tabs - hidden on mobile and during navigation */}
        {!isNavigating && (
          <div className="hidden md:block">
            <RoutesNavTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        )}

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
          visible={!previewRoute && !drawerOpen && !isCreating && !isNavigating && activeTab !== "find"}
        />

        {/* Mobile FAB Menu (+ button for settings) */}
        <MobileFabMenu
          onOpenSettings={() => setShowLayerPanel(true)}
          onLocateMe={handleLocateMe}
          visible={!previewRoute && !drawerOpen && !isCreating && !isNavigating && activeTab === "map"}
        />

        {/* Find Routes Panel */}
        <FindRoutesPanel
          isOpen={activeTab === "find"}
          onClose={() => setActiveTab("map")}
          onRouteClick={handleFindRouteClick}
          onRouteHover={handleRouteHover}
          onRoutesFound={(routes) => setExploreRoutes(routes)}
          mobilePanelOpen={mobilePanelOpen}
          onMobilePanelToggle={setMobilePanelOpen}
        />

        {/* Mobile Options button - shown when panel is collapsed on Find tab */}
        {activeTab === "find" && !mobilePanelOpen && (
          <div className="md:hidden fixed bottom-20 left-0 right-0 pb-2 z-30">
            <MobilePanelToggle
              mode="options"
              onClick={() => setMobilePanelOpen(true)}
              alwaysVisible={true}
            />
          </div>
        )}

        {/* Mobile: dismiss full-screen detail → shows quick card instead */}

        {/* Layer controls (bottom right) - FAB buttons hidden on mobile, panel visible on both */}
        <MapLayerControls
          settings={layerSettings}
          onSettingsChange={setLayerSettings}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onLocateMe={handleLocateMe}
          isLocating={isLocating}
          showPanel={showLayerPanel}
          onPanelChange={setShowLayerPanel}
          className="hidden md:flex"
        />

        {/* Route Quick Card - appears when a pin is clicked, hidden when Find/Saved panels are open */}
        {previewRoute && !drawerOpen && activeTab !== "find" && (
          <RouteQuickCard
            route={previewRoute}
            onClose={handleClosePreview}
            onClick={() => handleRouteClick(
              clusterBrowseRoutes.length > 1
                ? clusterBrowseRoutes[clusterBrowseIndex]?.id || previewRoute.id
                : previewRoute.id
            )}
            onOpenSection={(section) => {
              setInitialInfoTab(section as any);
              handleRouteClick(
                clusterBrowseRoutes.length > 1
                  ? clusterBrowseRoutes[clusterBrowseIndex]?.id || previewRoute.id
                  : previewRoute.id
              );
            }}
            routes={clusterBrowseRoutes.length > 1 ? clusterBrowseRoutes : undefined}
            currentIndex={clusterBrowseIndex}
            onIndexChange={(idx) => {
              setClusterBrowseIndex(idx);
              const r = clusterBrowseRoutes[idx];
              if (r) {
                setPreviewRoute(r);
                setDrawnRouteId(r.id);
                setHighlightedRouteId(r.id);
                setSelectedRouteData(r);
                setSelectedRouteId(r.id);
                fetchRouteWaypoints(r.id);
              }
            }}
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
              setNavSegmentIndex(0);
              setDrawnRouteId(null);
              setPreviewRoute(null);
              setSelectedRouteId(null);
            }}
            onComplete={handleNavigationComplete}
            onPositionUpdate={(lat, lng, heading, segmentIndex) => {
              setUserPosition({ lat, lng, heading });
              if (segmentIndex !== undefined) {
                setNavSegmentIndex(segmentIndex);
              }
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
          onDeleteRoute={async (routeId) => {
            try {
              const res = await fetch(`/api/routes/${routeId}`, { method: "DELETE" });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to delete route");
              }
              toast.success("Route deleted");
              setDrawerOpen(false);
              setSelectedRouteId(null);
              setSelectedRouteData(null);
              setDrawnRouteId(null);
              setHighlightedRouteId(null);
              setPreviewRoute(null);
              // Refresh routes list
              fetchExploreRoutes();
            } catch (error: any) {
              toast.error(error.message || "Failed to delete route");
            }
          }}
          onFlyToLocation={(lat, lng) => {
            mapRef.current?.flyTo(lat, lng, 18);
            // Close drawer and show quick card for easy navigation back
            setDrawerOpen(false);
            setMobileRouteDetailOpen(true);
            if (selectedRouteData) {
              setPreviewRoute(selectedRouteData);
            }
            // Enable waypoints on map so user can see the waypoint markers
            setLayerSettings((prev) => ({
              ...prev,
              showWaymarkers: true,
            }));
          }}
          initialWaypointId={initialWaypointId}
          onWaypointFocused={() => {
            setInitialWaypointId(null);
            // Toggle waypoints on when clicking a waypoint
            setLayerSettings((prev) => ({
              ...prev,
              showWaymarkers: true,
            }));
          }}
          initialCommentId={initialCommentId}
          onCommentFocused={() => setInitialCommentId(null)}
          onEnterViewMode={handleEnterViewMode}
          onHazardsLoaded={(hazards: any[]) => setSelectedRouteHazards(hazards)}
          onHazardResolved={(hazardId: string) => {
            setSelectedRouteHazards((prev: any[]) =>
              prev.map((h: any) => (h.id === hazardId ? { ...h, status: "resolved" } : h))
            );
          }}
          onPlaceHazard={handleStartPlacingHazard}
          onViewVariantRoute={async (variantId) => {
            // Switch the drawer to show the variant route
            setSelectedRouteId(variantId);
            setDrawnRouteId(variantId);
            setHighlightedRouteId(variantId);
            // Fetch full route data so mini card works on dismiss
            const fullRoute = await fetchRouteData(variantId);
            setSelectedRouteData(fullRoute);
            fetchRouteWaypoints(variantId);
            if (fullRoute?.geometry?.coordinates?.length > 0) {
              setTimeout(() => {
                mapRef.current?.fitBounds(fullRoute.geometry.coordinates);
              }, 100);
            }
          }}
          onForkVariant={(parentId, parentData) => {
            startForkingVariant(parentId, parentData);
          }}
          initialInfoTab={initialInfoTab}
          onInitialInfoTabConsumed={() => setInitialInfoTab(null)}
          onStartNavigation={handleStartNavigation}
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
