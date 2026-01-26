"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RouteCreator, RouteCreatorToolbar, PathLayerToggles, Waypoint, RouteData, RouteStyle, ToolMode } from "@/components/routes/route-creator";
import { RoutesMapV2, RoutesMapV2Handle } from "@/components/routes/routes-map-v2";
import { KMLLayerToggles } from "@/components/routes/kml-layer-toggles";
import { ClearRouteDialog, DiscardRouteDialog } from "@/components/routes/confirm-dialog";
import { Header } from "@/components/header";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
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
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeType, setRouteType] = useState<"linear" | "circular">("linear");
  const [history, setHistory] = useState<Waypoint[][]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  
  // Map layer toggles
  const [showBridleways, setShowBridleways] = useState(true);
  const [showByways, setShowByways] = useState(true);
  const [showFootpaths, setShowFootpaths] = useState(false);
  const [showRestrictedByways, setShowRestrictedByways] = useState(false);
  
  // Route style
  const [routeStyle, setRouteStyle] = useState<RouteStyle>({
    strokeColor: "#2D5A27",
    strokeWeight: 4,
    strokeOpacity: 0.9,
  });
  
  // Tool mode
  const [toolMode, setToolMode] = useState<ToolMode>("draw");

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

        // Extract waypoints from geometry
        if (routeData.geometry?.coordinates) {
          const coords = routeData.geometry.coordinates;
          const extractedWaypoints: Waypoint[] = coords.map((coord: number[], index: number) => ({
            id: `wp-${index}`,
            lat: coord[1],
            lng: coord[0],
            isSnapped: false,
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
    if (waypoints.length > 0) {
      setShowDiscardDialog(true);
    } else {
      router.push("/routes");
    }
  }, [waypoints, router]);

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

  return (
    <TooltipProvider>
      <Header />
      <main className="min-h-screen bg-muted/30">
        <div className="flex h-[calc(100vh-64px)]">
          {/* Map area */}
          <div className="flex-1 relative">
            <RoutesMapV2
              ref={mapRef}
              mode="edit"
              waypoints={waypoints}
              onWaypointsChange={(newWaypoints) => {
                setHistory((prev) => [...prev.slice(-19), waypoints]);
                setWaypoints(newWaypoints);
              }}
              onCircularDetected={handleCircularDetected}
              routeType={routeType}
              routeStyle={routeStyle}
              toolMode={toolMode}
              showBridleways={showBridleways}
              showByways={showByways}
              showFootpaths={showFootpaths}
              showRestrictedByways={showRestrictedByways}
            />

            {/* Toolbar */}
            <div className="absolute top-4 left-4 z-10">
              <RouteCreatorToolbar
                toolMode={toolMode}
                onToolModeChange={setToolMode}
                onUndo={handleUndo}
                onClear={handleClear}
                canUndo={history.length > 0}
                canClear={waypoints.length > 0}
              />
            </div>

            {/* Layer toggles */}
            <div className="absolute top-4 right-4 z-10 space-y-2">
              <PathLayerToggles
                layers={{
                  bridleways: showBridleways,
                  boats: showByways,
                  footpaths: showFootpaths,
                  permissive: showRestrictedByways,
                }}
                onToggle={(layer, enabled) => {
                  switch (layer) {
                    case "bridleways":
                      setShowBridleways(enabled);
                      break;
                    case "boats":
                      setShowByways(enabled);
                      break;
                    case "footpaths":
                      setShowFootpaths(enabled);
                      break;
                    case "permissive":
                      setShowRestrictedByways(enabled);
                      break;
                  }
                }}
              />
            </div>
          </div>

          {/* Sidebar with form */}
          <div className="w-96 border-l bg-background overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg">Edit Route</h2>
              <p className="text-sm text-muted-foreground">
                Modify your route path and details
              </p>
              {originalRoute.last_edited_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last edited: {new Date(originalRoute.last_edited_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <RouteCreator
              mapRef={mapRef}
              onSave={handleSaveRoute}
              onCancel={handleCancel}
              existingRoute={{
                title: originalRoute.title,
                description: originalRoute.description || "",
                visibility: originalRoute.visibility || "private",
                difficulty: originalRoute.difficulty || "unrated",
                routeType: routeType,
                waypoints: waypoints,
              }}
              onRouteTypeChange={handleRouteTypeChange}
            />
          </div>
        </div>
      </main>

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
