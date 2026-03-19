import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Airbnb-style fair rotation scoring algorithm.
 *
 * Every route gets a fair chance of being featured, regardless of age or rating.
 * The algorithm balances:
 *   - Quality (avg_rating, review_count, completeness) — ~30%
 *   - Freshness (newer routes get a boost for first 14 days) — ~20%
 *   - Exposure fairness (lower impression_count = higher score) — ~30%
 *   - Admin control (boost/suppress multiplier) — multiplicative
 *   - Random jitter (controlled randomness for variety) — ~20%
 */

function computeRouteScore(route: {
  avg_rating: number | null;
  review_count: number | null;
  distance_km: number | null;
  created_at: string;
  impression_count: number | null;
  admin_boost_multiplier: number | null;
  description: string | null;
  cover_photo_url?: string | null;
  route_photos?: { url: string }[];
}): number {
  // 1. Quality score (0-30 points)
  const rating = route.avg_rating || 0;
  const reviews = route.review_count || 0;
  // Diminishing returns on reviews: log scale. 1 review = 0, 10 = ~2.3, 100 = ~4.6
  const reviewScore = reviews > 0 ? Math.log10(reviews) : 0;
  // Rating contributes 0-5, review volume 0-5
  const qualityScore = (rating * 3) + (Math.min(reviewScore, 5) * 3);

  // 2. Freshness score (0-20 points)
  const ageMs = Date.now() - new Date(route.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  // New routes (< 14 days) get full 20 points, decaying linearly to 0 at 60 days
  const freshnessScore = ageDays < 14
    ? 20
    : ageDays < 60
      ? 20 * (1 - (ageDays - 14) / 46)
      : 0;

  // 3. Exposure fairness (0-30 points)
  // Lower impression count = higher score. Routes shown rarely get boosted.
  const impressions = route.impression_count || 0;
  // Inverse log scale: 0 impressions = 30 points, 100 = ~20, 1000 = ~10, 10000 = ~0
  const exposureScore = Math.max(0, 30 - (impressions > 0 ? Math.log10(impressions) * 7.5 : 0));

  // 4. Completeness bonus (0-5 points)
  let completeness = 0;
  if (route.description && route.description.length > 20) completeness += 2;
  const hasPhoto = route.cover_photo_url || (route.route_photos && route.route_photos.length > 0);
  if (hasPhoto) completeness += 2;
  if (route.distance_km && route.distance_km > 0) completeness += 1;

  // 5. Random jitter (0-20 points) — different each time, ensures variety
  const jitter = Math.random() * 20;

  // Combine
  const rawScore = qualityScore + freshnessScore + exposureScore + completeness + jitter;

  // Apply admin multiplier (1.0 = normal, 2.0 = double, 0.5 = half, 0 = hidden)
  const multiplier = route.admin_boost_multiplier ?? 1.0;
  if (multiplier === 0) return -1; // Hidden

  return rawScore * multiplier;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "3"), 10);

    // Fetch all public, user-created routes with scoring columns
    const { data: routes, error } = await supabase
      .from("routes")
      .select(`
        id, title, description, difficulty, distance_km, county,
        terrain_tags, avg_rating, review_count, is_public,
        created_at, owner_user_id, geometry, route_type, variant_of_id,
        show_on_explore, impression_count, admin_boost_multiplier
      `)
      .eq("is_public", true)
      .not("owner_user_id", "is", null)
      .neq("show_on_explore", false);

    if (error) {
      console.error("[ROUTES_FEATURED] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!routes || routes.length === 0) {
      return NextResponse.json({ featured: [] });
    }

    // Get cover photos for all routes
    const routeIds = routes.map(r => r.id);
    const { data: photos } = await supabase
      .from("route_photos")
      .select("route_id, url, is_cover")
      .in("route_id", routeIds);

    const coverMap = new Map<string, string>();
    photos?.forEach(p => {
      if (p.is_cover && !coverMap.has(p.route_id)) {
        coverMap.set(p.route_id, p.url);
      }
    });
    photos?.forEach(p => {
      if (!coverMap.has(p.route_id)) {
        coverMap.set(p.route_id, p.url);
      }
    });

    // Score each route
    const scoredRoutes = routes
      .map(route => ({
        ...route,
        cover_photo_url: coverMap.get(route.id) || null,
        route_photos: coverMap.has(route.id) ? [{ url: coverMap.get(route.id) }] : [],
        _score: computeRouteScore({
          ...route,
          cover_photo_url: coverMap.get(route.id) || null,
          route_photos: coverMap.has(route.id) ? [{ url: coverMap.get(route.id) }] : [],
        }),
      }))
      .filter(r => r._score >= 0) // Exclude hidden routes (score = -1)
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    // Increment impression count for featured routes (fire and forget)
    if (scoredRoutes.length > 0) {
      const featuredIds = scoredRoutes.map(r => r.id);
      // Use raw SQL-like approach: increment each route's impression_count
      for (const id of featuredIds) {
        supabase
          .from("routes")
          .update({
            impression_count: (routes.find(r => r.id === id)?.impression_count || 0) + 1,
            last_featured_at: new Date().toISOString(),
          })
          .eq("id", id)
          .then(() => {});
      }
    }

    // Remove internal score from response
    const featured = scoredRoutes.map(({ _score, ...route }) => route);

    return NextResponse.json({ featured });
  } catch (error: any) {
    console.error("[ROUTES_FEATURED] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured routes" },
      { status: 500 }
    );
  }
}
