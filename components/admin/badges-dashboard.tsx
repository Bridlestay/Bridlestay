"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Award, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Users, 
  Trophy,
  Gift,
  Loader2,
  Eye,
  EyeOff,
  UserPlus
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BadgeData {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  tier: string | null;
  tier_order: number;
  criteria_type: string;
  criteria_field: string | null;
  criteria_value: number | null;
  points: number;
  rarity: string;
  is_active: boolean;
  is_hidden: boolean;
  created_at: string;
}

interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  user?: {
    name: string;
    email: string;
  };
  badge?: BadgeData;
}

const CATEGORIES = ["routes", "stays", "explorer", "hosting", "community", "special"];
const TIERS = ["bronze", "silver", "gold", "platinum", "diamond"];
// Rarity is deprecated - keeping for backwards compatibility but not shown in UI
// const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];
const CRITERIA_TYPES = ["count", "milestone", "streak", "special"];
const CRITERIA_FIELDS = [
  { value: "routes_created", label: "Routes Created" },
  { value: "routes_completed", label: "Routes Completed" },
  { value: "routes_reviewed", label: "Routes Reviewed" },
  { value: "bookings_completed", label: "Bookings Completed" },
  { value: "counties_visited_count", label: "Counties Visited" },
  { value: "properties_listed", label: "Properties Listed" },
  { value: "bookings_hosted", label: "Bookings Hosted" },
  { value: "reviews_written", label: "Reviews Written" },
  { value: "referrals_made", label: "Referrals Made" },
];

const BADGE_EMOJIS = ["🏆", "⭐", "🎯", "🏅", "👑", "💎", "🔥", "⚡", "🎉", "🚀", "🌟", "🏛️", "🗺️", "🧭", "📍", "🏠", "🛏️", "🐴", "🎠", "📝", "📚", "💬", "🤝", "✈️", "🇬🇧"];

export function BadgesDashboard() {
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [recentAwards, setRecentAwards] = useState<UserBadge[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast } = useToast();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "🏆",
    color: "#3B82F6",
    category: "special",
    tier: "",
    tier_order: 0,
    criteria_type: "special",
    criteria_field: "",
    criteria_value: 0,
    points: 10,
    rarity: "common",
    is_active: true,
    is_hidden: false,
  });

  // Award form state
  const [awardUserId, setAwardUserId] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Fetch all badges
      const { data: badgesData } = await supabase
        .from("badges")
        .select("*")
        .order("category")
        .order("tier_order");

      // Fetch recent badge awards
      const { data: awardsData } = await supabase
        .from("user_badges")
        .select(`
          *,
          user:users(name, email),
          badge:badges(name, icon)
        `)
        .order("earned_at", { ascending: false })
        .limit(20);

      setBadges(badgesData || []);
      setRecentAwards(awardsData || []);
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBadge = async () => {
    setSubmitting(true);
    const supabase = createClient();

    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, "_");
      
      const { error } = await supabase.from("badges").insert({
        ...formData,
        slug,
        tier: formData.tier || null,
        criteria_field: formData.criteria_field || null,
        criteria_value: formData.criteria_value || null,
      });

      if (error) throw error;

      toast({ title: "Badge created successfully!" });
      setCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBadge = async () => {
    if (!selectedBadge) return;
    setSubmitting(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("badges")
        .update({
          ...formData,
          tier: formData.tier || null,
          criteria_field: formData.criteria_field || null,
          criteria_value: formData.criteria_value || null,
        })
        .eq("id", selectedBadge.id);

      if (error) throw error;

      toast({ title: "Badge updated successfully!" });
      setEditDialogOpen(false);
      setSelectedBadge(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm("Are you sure you want to delete this badge?")) return;
    
    const supabase = createClient();
    const { error } = await supabase.from("badges").delete().eq("id", badgeId);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Badge deleted" });
      fetchData();
    }
  };

  const handleToggleActive = async (badge: BadgeData) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("badges")
      .update({ is_active: !badge.is_active })
      .eq("id", badge.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      fetchData();
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchedUsers([]);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("id, name, email")
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    setSearchedUsers(data || []);
  };

  const handleAwardBadge = async () => {
    if (!selectedBadge || !awardUserId) return;
    setSubmitting(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.from("user_badges").insert({
        user_id: awardUserId,
        badge_id: selectedBadge.id,
      });

      if (error) throw error;

      toast({ title: "Badge awarded successfully!" });
      setAwardDialogOpen(false);
      setSelectedBadge(null);
      setAwardUserId("");
      setSearchedUsers([]);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (badge: BadgeData) => {
    setSelectedBadge(badge);
    setFormData({
      name: badge.name,
      slug: badge.slug,
      description: badge.description,
      icon: badge.icon,
      color: badge.color,
      category: badge.category,
      tier: badge.tier || "",
      tier_order: badge.tier_order,
      criteria_type: badge.criteria_type,
      criteria_field: badge.criteria_field || "",
      criteria_value: badge.criteria_value || 0,
      points: badge.points,
      rarity: badge.rarity,
      is_active: badge.is_active,
      is_hidden: badge.is_hidden,
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      icon: "🏆",
      color: "#3B82F6",
      category: "special",
      tier: "",
      tier_order: 0,
      criteria_type: "special",
      criteria_field: "",
      criteria_value: 0,
      points: 10,
      rarity: "common",
      is_active: true,
      is_hidden: false,
    });
  };

  const filteredBadges = badges.filter((badge) => {
    const matchesSearch = badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      badge.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || badge.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Stats
  const totalBadges = badges.length;
  const activeBadges = badges.filter(b => b.is_active).length;
  const totalAwarded = recentAwards.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBadges}</p>
                <p className="text-sm text-muted-foreground">Total Badges</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeBadges}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAwarded}</p>
                <p className="text-sm text-muted-foreground">Recent Awards</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-center">
            <Button onClick={() => setCreateDialogOpen(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create Badge
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Award Section for Hidden/Mystery Badges */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-purple-600" />
            Quick Award - Hidden/Mystery Badge
          </CardTitle>
          <CardDescription>
            Create and award a special one-off badge directly to a user. These badges won&apos;t appear in attainable sections - perfect for surprise rewards!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            To create a hidden mystery badge:
          </p>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mb-4">
            <li>Click &quot;Create Badge&quot; above</li>
            <li>Set Category to &quot;special&quot;</li>
            <li>Set Criteria Type to &quot;special&quot; (manually awarded)</li>
            <li>Toggle &quot;Hidden&quot; ON - badge won&apos;t show until earned</li>
            <li>Save the badge, then use &quot;Award to User&quot; button to give it to someone</li>
          </ol>
          <p className="text-sm text-muted-foreground">
            Hidden badges create a sense of mystery and delight when users unexpectedly earn them!
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="all-badges">
        <TabsList>
          <TabsTrigger value="all-badges">All Badges</TabsTrigger>
          <TabsTrigger value="recent-awards">Recent Awards</TabsTrigger>
        </TabsList>

        {/* All Badges Tab */}
        <TabsContent value="all-badges" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search badges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="capitalize">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Badges Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Badge</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Criteria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBadges.map((badge) => (
                  <TableRow key={badge.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{badge.icon}</span>
                        <div>
                          <p className="font-medium">{badge.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {badge.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {badge.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {badge.tier ? (
                        <Badge variant="secondary" className="capitalize">
                          {badge.tier}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {badge.criteria_type === "count" && badge.criteria_value ? (
                        <span className="text-sm">
                          {badge.criteria_field?.replace(/_/g, " ")} ≥ {badge.criteria_value}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground capitalize">
                          {badge.criteria_type}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {badge.is_active ? (
                          <Badge variant="default" className="bg-primary">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {badge.is_hidden && (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBadge(badge);
                            setAwardDialogOpen(true);
                          }}
                          title="Award to user"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(badge)}
                          title="Edit badge"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(badge)}
                          title={badge.is_active ? "Deactivate badge" : "Activate badge"}
                        >
                          {badge.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBadge(badge.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete badge"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Recent Awards Tab */}
        <TabsContent value="recent-awards">
          <Card>
            <CardHeader>
              <CardTitle>Recent Badge Awards</CardTitle>
              <CardDescription>Latest badges earned by users</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Badge</TableHead>
                    <TableHead>Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAwards.map((award) => (
                    <TableRow key={award.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{award.user?.name}</p>
                          <p className="text-xs text-muted-foreground">{award.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{award.badge?.icon}</span>
                          <span>{award.badge?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(award.earned_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Badge Dialog */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          setSelectedBadge(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDialogOpen ? "Edit Badge" : "Create New Badge"}</DialogTitle>
            <DialogDescription>
              {editDialogOpen ? "Update the badge details below." : "Create a new achievement badge for users."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Badge name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does the user need to do to earn this?"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_EMOJIS.map((emoji) => (
                      <SelectItem key={emoji} value={emoji}>
                        <span className="text-xl">{emoji}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Rarity removed - keep tiers only for progression badges */}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tier (optional)</Label>
                <Select value={formData.tier || "none"} onValueChange={(v) => setFormData({ ...formData, tier: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="No tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No tier</SelectItem>
                    {TIERS.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tier Order</Label>
                <Input
                  type="number"
                  value={formData.tier_order}
                  onChange={(e) => setFormData({ ...formData, tier_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              {/* Points removed - not using points system */}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Criteria Type</Label>
                <Select value={formData.criteria_type} onValueChange={(v) => setFormData({ ...formData, criteria_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRITERIA_TYPES.map((ct) => (
                      <SelectItem key={ct} value={ct} className="capitalize">
                        {ct}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.criteria_type === "count" && (
                <>
                  <div className="space-y-2">
                    <Label>Criteria Field</Label>
                    <Select 
                      value={formData.criteria_field || "routes_created"} 
                      onValueChange={(v) => setFormData({ ...formData, criteria_field: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {CRITERIA_FIELDS.map((cf) => (
                          <SelectItem key={cf.value} value={cf.value}>
                            {cf.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Value</Label>
                    <Input
                      type="number"
                      value={formData.criteria_value}
                      onChange={(e) => setFormData({ ...formData, criteria_value: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_hidden}
                  onCheckedChange={(v) => setFormData({ ...formData, is_hidden: v })}
                />
                <Label>Hidden until earned</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={editDialogOpen ? handleUpdateBadge : handleCreateBadge} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editDialogOpen ? "Update Badge" : "Create Badge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Award Badge Dialog */}
      <Dialog open={awardDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setAwardDialogOpen(false);
          setSelectedBadge(null);
          setAwardUserId("");
          setSearchedUsers([]);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award Badge to User</DialogTitle>
            <DialogDescription>
              Manually award "{selectedBadge?.name}" to a user.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search User</Label>
              <Input
                placeholder="Search by name or email..."
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
              />
            </div>

            {searchedUsers.length > 0 && (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchedUsers.map((user) => (
                  <button
                    key={user.id}
                    className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors ${
                      awardUserId === user.id ? "bg-primary/10" : ""
                    }`}
                    onClick={() => setAwardUserId(user.id)}
                  >
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </button>
                ))}
              </div>
            )}

            {awardUserId && (
              <p className="text-sm text-primary">
                ✓ User selected
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAwardDialogOpen(false);
              setSelectedBadge(null);
              setAwardUserId("");
              setSearchedUsers([]);
            }}>
              Cancel
            </Button>
            <Button onClick={handleAwardBadge} disabled={!awardUserId || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Award Badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

