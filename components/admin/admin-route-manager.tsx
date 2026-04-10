"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  RotateCcw,
  Star,
  ArrowUpDown,
  MoreVertical,
  ExternalLink,
  User,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Route {
  id: string;
  title: string;
  difficulty: string;
  distance_km: number;
  county: string | null;
  avg_rating: number | null;
  review_count: number | null;
  is_public: boolean;
  created_at: string;
  owner_user_id: string;
  owner_name: string;
  owner_avatar_url: string | null;
  impression_count: number | null;
  admin_boost_multiplier: number | null;
  last_featured_at: string | null;
}

const BOOST_PRESETS = [
  { value: 0, label: "Hidden", color: "text-red-600", icon: EyeOff },
  { value: 0.5, label: "Suppressed", color: "text-orange-600", icon: TrendingDown },
  { value: 1.0, label: "Normal", color: "text-gray-600", icon: Eye },
  { value: 1.5, label: "Boosted", color: "text-blue-600", icon: TrendingUp },
  { value: 2.0, label: "Featured", color: "text-primary", icon: Star },
];

function getBoostInfo(multiplier: number | null) {
  const val = multiplier ?? 1.0;
  if (val === 0) return BOOST_PRESETS[0];
  if (val < 1) return BOOST_PRESETS[1];
  if (val === 1) return BOOST_PRESETS[2];
  if (val <= 1.5) return BOOST_PRESETS[3];
  return BOOST_PRESETS[4];
}

const DIFFICULTY_COLORS: Record<string, string> = {
  unrated: "bg-gray-100 text-gray-700",
  easy: "bg-green-100 text-green-700",
  moderate: "bg-blue-100 text-blue-700",
  difficult: "bg-orange-100 text-orange-700",
};

export function AdminRouteManager() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Route | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        sortBy,
        sortDir,
      });
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const res = await fetch(`/api/admin/routes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      } else {
        toast.error("Failed to fetch routes");
      }
    } catch {
      toast.error("Failed to fetch routes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [page, sortBy, sortDir]);

  const handleSearch = () => {
    setPage(1);
    fetchRoutes();
  };

  const updateBoost = async (routeId: string, multiplier: number) => {
    setUpdatingId(routeId);
    try {
      const res = await fetch("/api/admin/routes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId,
          admin_boost_multiplier: multiplier,
        }),
      });

      if (res.ok) {
        setRoutes((prev) =>
          prev.map((r) =>
            r.id === routeId
              ? { ...r, admin_boost_multiplier: multiplier }
              : r
          )
        );
        const info = getBoostInfo(multiplier);
        toast.success(`Route set to ${info.label}`);
      } else {
        toast.error("Failed to update route");
      }
    } catch {
      toast.error("Failed to update route");
    } finally {
      setUpdatingId(null);
    }
  };

  const resetImpressions = async (routeId: string) => {
    setUpdatingId(routeId);
    try {
      const res = await fetch("/api/admin/routes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId,
          impression_count: 0,
        }),
      });

      if (res.ok) {
        setRoutes((prev) =>
          prev.map((r) =>
            r.id === routeId ? { ...r, impression_count: 0 } : r
          )
        );
        toast.success("Impressions reset");
      } else {
        toast.error("Failed to reset impressions");
      }
    } catch {
      toast.error("Failed to reset impressions");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
    setPage(1);
  };

  const deleteRoute = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/routes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: deleteTarget.id }),
      });
      if (res.ok) {
        setRoutes((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        setTotal((prev) => prev - 1);
        toast.success(`"${deleteTarget.title}" deleted`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete route");
      }
    } catch {
      toast.error("Failed to delete route");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Total Routes</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Boosted</p>
          <p className="text-2xl font-bold text-blue-600">
            {routes.filter((r) => (r.admin_boost_multiplier ?? 1) > 1).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Suppressed</p>
          <p className="text-2xl font-bold text-orange-600">
            {routes.filter((r) => (r.admin_boost_multiplier ?? 1) > 0 && (r.admin_boost_multiplier ?? 1) < 1).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Hidden</p>
          <p className="text-2xl font-bold text-red-600">
            {routes.filter((r) => r.admin_boost_multiplier === 0).length}
          </p>
        </div>
      </div>

      {/* Search + Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">
                  <button
                    className="flex items-center gap-1 hover:text-gray-900"
                    onClick={() => toggleSort("title")}
                  >
                    Route
                    {sortBy === "title" && (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-gray-900"
                    onClick={() => toggleSort("avg_rating")}
                  >
                    Rating
                    {sortBy === "avg_rating" && (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-gray-900"
                    onClick={() => toggleSort("impression_count")}
                  >
                    Impressions
                    {sortBy === "impression_count" && (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-gray-900"
                    onClick={() => toggleSort("created_at")}
                  >
                    Created
                    {sortBy === "created_at" && (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Boost</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                  </TableCell>
                </TableRow>
              ) : routes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-gray-500"
                  >
                    No routes found
                  </TableCell>
                </TableRow>
              ) : (
                routes.map((route) => {
                  const boostInfo = getBoostInfo(
                    route.admin_boost_multiplier
                  );
                  const BoostIcon = boostInfo.icon;
                  const isUpdating = updatingId === route.id;

                  return (
                    <TableRow
                      key={route.id}
                      className={cn(
                        isUpdating && "opacity-50",
                        route.admin_boost_multiplier === 0 && "bg-red-50/50"
                      )}
                    >
                      <TableCell>
                        <div>
                          <Link
                            href={`/routes?route=${route.id}`}
                            className="font-medium text-sm line-clamp-1 hover:text-primary hover:underline transition-colors"
                          >
                            {route.title}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] h-4",
                                DIFFICULTY_COLORS[route.difficulty] ||
                                  DIFFICULTY_COLORS.unrated
                              )}
                            >
                              {route.difficulty || "Unrated"}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {Number(route.distance_km || 0).toFixed(1)} km
                            </span>
                            {route.county && (
                              <span className="text-xs text-gray-400">
                                {route.county}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/profile/${route.owner_user_id}`}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={route.owner_avatar_url || undefined}
                              alt={route.owner_name}
                            />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                              {route.owner_name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-600 hover:text-primary transition-colors">
                            {route.owner_name}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {route.avg_rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">
                              {Number(route.avg_rating).toFixed(1)}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({route.review_count || 0})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No reviews
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">
                            {route.impression_count || 0}
                          </span>
                          <button
                            onClick={() => resetImpressions(route.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Reset impressions"
                            disabled={isUpdating}
                          >
                            <RotateCcw className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDate(route.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            boostInfo.color
                          )}
                        >
                          <BoostIcon className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">
                            {boostInfo.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={String(
                            route.admin_boost_multiplier ?? 1.0
                          )}
                          onValueChange={(val) =>
                            updateBoost(route.id, parseFloat(val))
                          }
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BOOST_PRESETS.map((preset) => (
                              <SelectItem
                                key={preset.value}
                                value={String(preset.value)}
                              >
                                <span
                                  className={cn(
                                    "flex items-center gap-1.5",
                                    preset.color
                                  )}
                                >
                                  <preset.icon className="h-3 w-3" />
                                  {preset.label} ({preset.value}x)
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isUpdating}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/routes?route=${route.id}`}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Route
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/profile/${route.owner_user_id}`}>
                                <User className="mr-2 h-4 w-4" />
                                Inspect User
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(route)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Route
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} routes)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Algorithm explanation */}
      <div className="bg-gray-50 rounded-xl border p-4 text-sm text-gray-600 space-y-2">
        <p className="font-medium text-gray-900">
          How the Featured Routes algorithm works
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Quality (30%)</strong> — avg rating + review count (log
            scale)
          </li>
          <li>
            <strong>Freshness (20%)</strong> — routes created in last 14 days
            get full boost, decays to 0 at 60 days
          </li>
          <li>
            <strong>Exposure fairness (30%)</strong> — routes with fewer
            impressions score higher, ensuring fair rotation
          </li>
          <li>
            <strong>Random jitter (20%)</strong> — controlled randomness so
            repeat visitors see different routes each time
          </li>
          <li>
            <strong>Admin multiplier</strong> — Hidden (0x), Suppressed
            (0.5x), Normal (1x), Boosted (1.5x), Featured (2x)
          </li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          Reset impressions to give a route a fresh chance at being featured.
          The algorithm automatically rotates routes so all creators get fair
          exposure.
        </p>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Route</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>&quot;{deleteTarget?.title}&quot;</strong> by{" "}
              {deleteTarget?.owner_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteRoute}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete Route"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
