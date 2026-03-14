import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

// GET - Get variants for a route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    // Get variant links where this route is either side
    const { data: variantLinks, error: linksError } = await supabase
      .from("route_variants")
      .select("id, route_a_id, route_b_id, similarity_score, source")
      .or(`route_a_id.eq.${routeId},route_b_id.eq.${routeId}`);

    if (linksError) {
      console.error("[VARIANTS] Error fetching links:", linksError);
      return NextResponse.json(
        { error: "Failed to fetch variants" },
        { status: 500 }
      );
    }

    if (!variantLinks || variantLinks.length === 0) {
      return NextResponse.json({ variants: [], count: 0 });
    }

    // Get the IDs of the variant routes (the other side of each link)
    const variantIds = variantLinks.map((link) =>
      link.route_a_id === routeId ? link.route_b_id : link.route_a_id
    );

    // Fetch the actual route data for each variant
    const { data: variants, error: routesError } = await supabase
      .from("routes")
      .select(
        `
        id,
        title,
        description,
        distance_km,
        difficulty,
        route_type,
        visibility,
        geometry,
        owner_user_id,
        created_at,
        elevation_gain_m,
        elevation_loss_m,
        variant_of_id
      `
      )
      .in("id", variantIds);

    if (routesError) {
      console.error("[VARIANTS] Error fetching routes:", routesError);
      return NextResponse.json(
        { error: "Failed to fetch variant routes" },
        { status: 500 }
      );
    }

    // Fetch owner info for each variant
    const ownerIds = [
      ...new Set((variants || []).map((v) => v.owner_user_id).filter(Boolean)),
    ];
    const { data: owners } = await supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("id", ownerIds);

    const ownerMap = new Map(
      (owners || []).map((o) => [o.id, o])
    );

    // Combine route data with similarity scores
    const enrichedVariants = (variants || []).map((route) => {
      const link = variantLinks.find(
        (l) => l.route_a_id === route.id || l.route_b_id === route.id
      );
      return {
        ...route,
        owner: ownerMap.get(route.owner_user_id) || null,
        similarity_score: link?.similarity_score || 0,
        variant_source: link?.source || "auto",
        variant_link_id: link?.id,
      };
    });

    // Sort by similarity score descending
    enrichedVariants.sort(
      (a, b) => (b.similarity_score || 0) - (a.similarity_score || 0)
    );

    return NextResponse.json({
      variants: enrichedVariants,
      count: enrichedVariants.length,
    });
  } catch (error: any) {
    console.error("[VARIANTS] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch variants" },
      { status: 500 }
    );
  }
}

// POST - Create a variant link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { variant_route_id, similarity_score, source = "manual" } = body;

    if (!variant_route_id) {
      return NextResponse.json(
        { error: "variant_route_id is required" },
        { status: 400 }
      );
    }

    // Ensure consistent ordering (older route = route_a)
    const { data: routeA } = await supabase
      .from("routes")
      .select("id, created_at, owner_user_id, title")
      .eq("id", routeId)
      .single();

    const { data: routeB } = await supabase
      .from("routes")
      .select("id, created_at, owner_user_id, title")
      .eq("id", variant_route_id)
      .single();

    if (!routeA || !routeB) {
      return NextResponse.json(
        { error: "One or both routes not found" },
        { status: 404 }
      );
    }

    // route_a = older (parent), route_b = newer (variant)
    const isAOlder =
      new Date(routeA.created_at) <= new Date(routeB.created_at);
    const orderedA = isAOlder ? routeId : variant_route_id;
    const orderedB = isAOlder ? variant_route_id : routeId;

    // Insert variant link
    const { data: link, error } = await supabase
      .from("route_variants")
      .insert({
        route_a_id: orderedA,
        route_b_id: orderedB,
        similarity_score: similarity_score || 0,
        source,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Variant link already exists" },
          { status: 409 }
        );
      }
      console.error("[VARIANTS] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notify the parent route's owner that someone created a variant
    // Parent = routeA (older), variant = routeB (newer)
    const parentRoute = isAOlder ? routeA : routeB;
    const variantRoute = isAOlder ? routeB : routeA;
    if (parentRoute.owner_user_id) {
      // Get the variant creator's name
      const { data: creator } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();
      const creatorName = creator?.name || "Someone";

      createNotification({
        userId: parentRoute.owner_user_id,
        type: "route_variant",
        title: `${creatorName} created a variant of your route`,
        body: parentRoute.title || "Untitled Route",
        link: `/routes?route=${variantRoute.id}`,
        actorId: user.id,
      });
    }

    return NextResponse.json({ link }, { status: 201 });
  } catch (error: any) {
    console.error("[VARIANTS] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create variant link" },
      { status: 500 }
    );
  }
}
