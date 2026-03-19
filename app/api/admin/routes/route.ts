import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/routes — list all routes with scoring data for admin management
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check — admin only
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const q = searchParams.get("q") || "";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortDir = searchParams.get("sortDir") === "asc" ? true : false;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("routes")
      .select(
        `id, title, description, difficulty, distance_km, county,
         avg_rating, review_count, is_public, created_at, owner_user_id,
         route_type, variant_of_id, show_on_explore,
         impression_count, admin_boost_multiplier, last_featured_at`,
        { count: "exact" }
      )
      .not("owner_user_id", "is", null);

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    // Sort
    const validSorts = [
      "created_at",
      "avg_rating",
      "review_count",
      "impression_count",
      "admin_boost_multiplier",
      "distance_km",
      "title",
    ];
    const sortColumn = validSorts.includes(sortBy) ? sortBy : "created_at";
    query = query.order(sortColumn, { ascending: sortDir });

    query = query.range(offset, offset + limit - 1);

    const { data: routes, error, count } = await query;

    if (error) {
      console.error("[ADMIN_ROUTES] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get owner names
    const ownerIds = [...new Set((routes || []).map((r) => r.owner_user_id).filter(Boolean))];
    let ownerMap = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase
        .from("users")
        .select("id, name")
        .in("id", ownerIds);
      owners?.forEach((o) => ownerMap.set(o.id, o.name));
    }

    const routesWithOwner = (routes || []).map((route) => ({
      ...route,
      owner_name: ownerMap.get(route.owner_user_id) || "Unknown",
    }));

    return NextResponse.json({
      routes: routesWithOwner,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error: any) {
    console.error("[ADMIN_ROUTES] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch routes" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/routes — update boost/suppress for a route
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check — admin only
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { routeId, admin_boost_multiplier, impression_count } = body;

    if (!routeId) {
      return NextResponse.json({ error: "routeId is required" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (admin_boost_multiplier !== undefined) {
      if (typeof admin_boost_multiplier !== "number" || admin_boost_multiplier < 0 || admin_boost_multiplier > 10) {
        return NextResponse.json(
          { error: "admin_boost_multiplier must be between 0 and 10" },
          { status: 400 }
        );
      }
      updates.admin_boost_multiplier = admin_boost_multiplier;
    }
    if (impression_count !== undefined) {
      if (typeof impression_count !== "number" || impression_count < 0) {
        return NextResponse.json(
          { error: "impression_count must be >= 0" },
          { status: 400 }
        );
      }
      updates.impression_count = impression_count;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("routes")
      .update(updates)
      .eq("id", routeId);

    if (error) {
      console.error("[ADMIN_ROUTES_PATCH] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, routeId, updates });
  } catch (error: any) {
    console.error("[ADMIN_ROUTES_PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update route" },
      { status: 500 }
    );
  }
}
