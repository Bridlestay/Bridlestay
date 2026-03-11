"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteCreator, RouteCreatorToolbar, PathLayerToggles, Waypoint, RouteData, RouteStyle, ToolMode } from "@/components/routes/route-creator";
import { RoutesMapV2, RoutesMapV2Handle } from "@/components/routes/routes-map-v2";
import { ClearRouteDialog, DiscardRouteDialog } from "@/components/routes/confirm-dialog";
import { Header } from "@/components/header";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function EditRoutePage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;
  const supabase = createClient();
  const mapRef = useRef<RoutesMapV2Handle>(null);

  // Loading & Auth state
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [originalRoute, setOriginalRoute] = useState<any>(null);

  // Route editing state (same as creation)
  const [isPlotting, setIsPlotting] = useState(true); // Start in plotting mode
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeType, setRouteType] = useState<"linear" | "circular">("linear");
  const [history, setHistory] = useState<Waypoint[][]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [toolMode, setToolMode] = useState<ToolMode>("plot");

  // Path layers (same structure as create)
  const [pathLayers, setPathLayers] = useState({
    bridleways: true,
    boats: false,
    footpaths: false,
    permissive: false,
  });

  // Route style
  const [routeStyle, setRouteStyle] = useState<RouteStyle>({
    color: "#3B82F6",
    thickness: 4,
    opacity: 100,
  });

  // Path layer toggle handler
  const handlePathLayerToggle = (layer: string, enabled: boolean) => {
    setPathLayers((prev) => ({ ...prev, [layer]: enabled }));
  };

  // Load route data
  useEffect(() => {
    const loadRoute = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/auth/sign-in");
          return;
        }

        const res = await fetch(`/api/routes/${routeId}`);
        if (!res.ok) {
          toast.error("Route not found");
          router.push("/routes");
          return;
        }

        const data = await res.json();
        const routeData = data.route;

        // Check ownership
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        const isAdmin = userData?.role === "admin";
        const ownsRoute = routeData.owner_user_id === user.id;

        if (!ownsRoute && !isAdmin) {
          toast.error("You don't have permission to edit this route");
          router.push("/routes");
          return;
        }

        setIsOwner(true);
        setOriginalRoute(routeData);

        // Use original spine points if available, otherwise fall back to full geometry
        const spinePoints = routeData.geometry?.spine_points;
        const coords = spinePoints || routeData.geometry?.coordinates;
        if (coords) {
          const extractedWaypoints: Waypoint[] = coords.map((coord: number[], index: number) => ({
            id: `wp-${Date.now()}-${index}`,
            lat: coord[1],
            lng: coord[0],
            snapped: false,
          }));
          setWaypoints(extractedWaypoints);
        }

        // Set route type
        if (routeData.route_type === "circular") {
          setRouteType("circular");
        }

      } catch (error) {
        console.error("Error loading route:", error);
        toast.error("Failed to load route");
      } finally {
        setLoading(false);
      }
    };

    loadRoute();
  }, [routeId, router, supabase]);

  // Center map on route when loaded - zoom level based on route size
  useEffect(() => {
    if (waypoints.length > 0 && mapRef.current && !loading) {
      // Give map time to initialize
      setTimeout(() => {
        if (mapRef.current && waypoints.length > 0) {
          // Convert waypoints to [lng, lat] format for fitBounds
          const coordinates: [number, number][] = waypoints.map(wp => [wp.lng, wp.lat]);
          mapRef.current.fitBounds?.(coordinates);
        }
      }, 800);
    }
  }, [waypoints.length, loading]);

  // Waypoint management (same as create)
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

  // Handle circular route detection
  const handleCircularDetected = useCallback(() => {
    if (routeType === "linear" && waypoints.length >= 3) {
      setRouteType("circular");
      toast.success("Circular route detected!");
    }
  }, [routeType, waypoints.length]);

  // Handle route type change from creator
  const handleRouteTypeChange = useCallback((newType: "linear" | "circular") => {
    setRouteType(newType);
    if (newType === "linear" && waypoints.length > 0) {
      toast.info("Route reopened - continue editing");
    }
  }, [waypoints.length]);

  // Handle undo
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

  // Handle clear
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

  // Handle style change
  const handleStyleChange = useCallback((newStyle: Partial<RouteStyle>) => {
    setRouteStyle((prev) => ({ ...prev, ...newStyle }));
  }, []);

  // Handle save (update existing route)
  const handleSaveRoute = async (routeData: RouteData) => {
    if (!routeData.title?.trim()) {
      throw new Error("Route name is required");
    }
    if (waypoints.length < 2) {
      throw new Error("At least 2 waypoints are required");
    }

    const res = await fetch(`/api/routes/${routeId}`, {
      method: "PATCH",
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
      console.error("Route update error:", errorData);
      throw new Error(errorData.error || "Failed to update route");
    }

    toast.success("Route updated!");
    router.push("/routes");
  };

  // Handle cancel
  const handleCancel = useCallback(() => {
    // Check if changes were made
    const hasChanges = originalRoute && (
      waypoints.length !== (originalRoute.geometry?.coordinates?.length || 0)
    );
    
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      router.push("/routes");
    }
  }, [waypoints, originalRoute, router]);

  const confirmDiscard = useCallback(() => {
    router.push("/routes");
  }, [router]);

  if (loading) {
    return (
      <TooltipProvider>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </TooltipProvider>
    );
  }

  if (!isOwner || !originalRoute) {
    return null;
  }

  // Render Edit Route view - SAME LAYOUT AS CREATE
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
                onCancel={handleCancel}
                mapRef={mapRef}
                existingRoute={{
                  title: originalRoute.title,
                  description: originalRoute.description || "",
                  visibility: originalRoute.visibility || "private",
                  difficulty: originalRoute.difficulty || "unrated",
                  routeType,
                  waypoints,
                  geometry: {
                    type: "LineString",
                    coordinates: waypoints.map((wp) => [wp.lng, wp.lat]),
                  },
                  distanceKm: originalRoute.distance_km || 0,
                  estimatedTimeMinutes: originalRoute.estimated_time_minutes || 0,
                }}
                onRouteTypeChange={handleRouteTypeChange}
                isEditing={true}
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
              isCreating={true}
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
        onConfirm={confirmDiscard}
      />
    </TooltipProvider>
  );
}
