"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { 
  Trophy, 
  Lock, 
  Star, 
  Compass, 
  Home, 
  Users, 
  MapPin,
  Sparkles,
  Award,
  Medal,
  Crown,
  Gem,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgesSectionProps {
  userId: string;
  isOwnProfile?: boolean;
}

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
  is_hidden: boolean;
}

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  is_featured: boolean;
  progress_value: number | null;
  badge: BadgeData;
}

interface UserStats {
  routes_created: number;
  routes_completed: number;
  routes_reviewed: number;
  bookings_completed: number;
  counties_visited: string[];
  properties_listed: number;
  bookings_hosted: number;
  reviews_written: number;
  referrals_made: number;
}

// Badge icons mapping
const BADGE_ICONS: Record<string, React.ReactNode> = {
  "🗺️": <Compass className="h-6 w-6" />,
  "🧭": <Compass className="h-6 w-6" />,
  "🏆": <Trophy className="h-6 w-6" />,
  "⭐": <Star className="h-6 w-6" />,
  "🐴": <span className="text-2xl">🐴</span>,
  "🎠": <span className="text-2xl">🎠</span>,
  "🏅": <Medal className="h-6 w-6" />,
  "📝": <span className="text-2xl">📝</span>,
  "📚": <span className="text-2xl">📚</span>,
  "🏠": <Home className="h-6 w-6" />,
  "🛏️": <span className="text-2xl">🛏️</span>,
  "✈️": <span className="text-2xl">✈️</span>,
  "🌟": <Sparkles className="h-6 w-6" />,
  "📍": <MapPin className="h-6 w-6" />,
  "🇬🇧": <span className="text-2xl">🇬🇧</span>,
  "👑": <Crown className="h-6 w-6" />,
  "🏡": <Home className="h-6 w-6" />,
  "🔑": <span className="text-2xl">🔑</span>,
  "💎": <Gem className="h-6 w-6" />,
  "💬": <span className="text-2xl">💬</span>,
  "🤝": <Users className="h-6 w-6" />,
  "🎉": <span className="text-2xl">🎉</span>,
  "🚀": <span className="text-2xl">🚀</span>,
  "🏛️": <span className="text-2xl">🏛️</span>,
};

// Tier colors
const TIER_COLORS: Record<string, string> = {
  bronze: "from-amber-600 to-amber-800",
  silver: "from-slate-300 to-slate-500",
  gold: "from-yellow-400 to-yellow-600",
  platinum: "from-cyan-300 to-cyan-500",
  diamond: "from-violet-400 to-violet-600",
};

// Rarity colors
const RARITY_COLORS: Record<string, string> = {
  common: "border-slate-300 bg-slate-50",
  uncommon: "border-green-400 bg-green-50",
  rare: "border-blue-400 bg-blue-50",
  epic: "border-purple-400 bg-purple-50",
  legendary: "border-amber-400 bg-amber-50",
};

// Category labels and icons
const CATEGORIES = [
  { id: "all", label: "All Badges", icon: Award },
  { id: "routes", label: "Routes", icon: Compass },
  { id: "stays", label: "Stays", icon: Home },
  { id: "explorer", label: "Explorer", icon: MapPin },
  { id: "hosting", label: "Hosting", icon: Home },
  { id: "community", label: "Community", icon: Users },
  { id: "special", label: "Special", icon: Sparkles },
];

export function BadgesSection({ userId, isOwnProfile = true }: BadgesSectionProps) {
  const [loading, setLoading] = useState(true);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeData[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("earned");

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Fetch user's earned badges
      const { data: userBadges } = await supabase
        .from("user_badges")
        .select(`
          *,
          badge:badges(*)
        `)
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

      // Fetch all badges
      const { data: badges } = await supabase
        .from("badges")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("tier_order");

      // Fetch user stats for progress
      const { data: stats } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      setEarnedBadges(userBadges || []);
      setAllBadges(badges || []);
      setUserStats(stats || null);
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false);
    }
  };

  const earnedBadgeIds = new Set(earnedBadges.map(ub => ub.badge_id));

  const getProgressForBadge = (badge: BadgeData): number => {
    if (!userStats || !badge.criteria_field || !badge.criteria_value) return 0;
    
    let currentValue = 0;
    switch (badge.criteria_field) {
      case "routes_created": currentValue = userStats.routes_created; break;
      case "routes_completed": currentValue = userStats.routes_completed; break;
      case "routes_reviewed": currentValue = userStats.routes_reviewed; break;
      case "bookings_completed": currentValue = userStats.bookings_completed; break;
      case "counties_visited_count": currentValue = userStats.counties_visited?.length || 0; break;
      case "properties_listed": currentValue = userStats.properties_listed; break;
      case "bookings_hosted": currentValue = userStats.bookings_hosted; break;
      case "reviews_written": currentValue = userStats.reviews_written; break;
      case "referrals_made": currentValue = userStats.referrals_made; break;
    }
    
    return Math.min((currentValue / badge.criteria_value) * 100, 100);
  };

  const filteredEarnedBadges = activeCategory === "all" 
    ? earnedBadges 
    : earnedBadges.filter(ub => ub.badge.category === activeCategory);

  const unearnedBadges = allBadges.filter(b => !earnedBadgeIds.has(b.id) && !b.is_hidden);
  const filteredUnearnedBadges = activeCategory === "all"
    ? unearnedBadges
    : unearnedBadges.filter(b => b.category === activeCategory);

  const totalPoints = earnedBadges.reduce((sum, ub) => sum + (ub.badge.points || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{earnedBadges.length} Badges Earned</h2>
                <p className="text-muted-foreground">
                  {totalPoints} total points • {allBadges.length - earnedBadges.length} badges to unlock
                </p>
              </div>
            </div>
            {earnedBadges.length > 0 && (
              <div className="hidden md:flex items-center gap-2">
                {earnedBadges.slice(0, 5).map((ub) => (
                  <div
                    key={ub.id}
                    className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center border-2",
                      ub.badge.tier ? `bg-gradient-to-br ${TIER_COLORS[ub.badge.tier]}` : "bg-slate-100"
                    )}
                    title={ub.badge.name}
                  >
                    {BADGE_ICONS[ub.badge.icon] || <Award className="h-5 w-5" />}
                  </div>
                ))}
                {earnedBadges.length > 5 && (
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    +{earnedBadges.length - 5}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="earned" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Earned ({filteredEarnedBadges.length})
          </TabsTrigger>
          <TabsTrigger value="locked" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            To Unlock ({filteredUnearnedBadges.length})
          </TabsTrigger>
        </TabsList>

        {/* Earned Badges */}
        <TabsContent value="earned" className="mt-6">
          {filteredEarnedBadges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No badges yet</h3>
                <p className="text-muted-foreground">
                  {isOwnProfile 
                    ? "Start exploring, creating routes, and booking stays to earn badges!"
                    : "This user hasn't earned any badges in this category yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEarnedBadges.map((ub) => (
                <BadgeCard
                  key={ub.id}
                  badge={ub.badge}
                  earnedAt={ub.earned_at}
                  isFeatured={ub.is_featured}
                  isEarned={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Locked Badges */}
        <TabsContent value="locked" className="mt-6">
          {filteredUnearnedBadges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">All badges earned!</h3>
                <p className="text-muted-foreground">
                  Amazing! You've collected all badges in this category.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUnearnedBadges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={false}
                  progress={getProgressForBadge(badge)}
                  currentValue={
                    badge.criteria_field && userStats
                      ? getStatValue(userStats, badge.criteria_field)
                      : undefined
                  }
                  targetValue={badge.criteria_value || undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getStatValue(stats: UserStats, field: string): number {
  switch (field) {
    case "routes_created": return stats.routes_created;
    case "routes_completed": return stats.routes_completed;
    case "routes_reviewed": return stats.routes_reviewed;
    case "bookings_completed": return stats.bookings_completed;
    case "counties_visited_count": return stats.counties_visited?.length || 0;
    case "properties_listed": return stats.properties_listed;
    case "bookings_hosted": return stats.bookings_hosted;
    case "reviews_written": return stats.reviews_written;
    case "referrals_made": return stats.referrals_made;
    default: return 0;
  }
}

interface BadgeCardProps {
  badge: BadgeData;
  isEarned: boolean;
  earnedAt?: string;
  isFeatured?: boolean;
  progress?: number;
  currentValue?: number;
  targetValue?: number;
}

function BadgeCard({ badge, isEarned, earnedAt, isFeatured, progress, currentValue, targetValue }: BadgeCardProps) {
  const tierColor = badge.tier ? TIER_COLORS[badge.tier] : "";
  const rarityClass = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-lg",
      isEarned ? rarityClass : "bg-muted/30 border-dashed opacity-75",
      isFeatured && "ring-2 ring-primary"
    )}>
      {isFeatured && (
        <div className="absolute top-2 right-2">
          <Badge variant="default" className="text-xs">Featured</Badge>
        </div>
      )}
      
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Badge Icon */}
          <div className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0 border-2",
            isEarned && badge.tier ? `bg-gradient-to-br ${tierColor} text-white` : "",
            !isEarned && "bg-muted text-muted-foreground"
          )}>
            {!isEarned && <Lock className="h-5 w-5" />}
            {isEarned && (BADGE_ICONS[badge.icon] || <Award className="h-6 w-6" />)}
          </div>

          {/* Badge Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn("font-semibold truncate", !isEarned && "text-muted-foreground")}>
                {badge.name}
              </h3>
              {badge.tier && (
                <Badge variant="outline" className="text-xs capitalize">
                  {badge.tier}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {badge.description}
            </p>

            {/* Progress or Earned Date */}
            {isEarned && earnedAt ? (
              <p className="text-xs text-muted-foreground mt-2">
                Earned {new Date(earnedAt).toLocaleDateString()}
              </p>
            ) : !isEarned && progress !== undefined && targetValue ? (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{currentValue || 0} / {targetValue}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            ) : null}
          </div>
        </div>

        {/* Points */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <Badge variant="secondary" className="text-xs capitalize">
            {badge.rarity}
          </Badge>
          <span className="text-sm font-medium text-primary">
            +{badge.points} pts
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

