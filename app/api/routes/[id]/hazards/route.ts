import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Get hazards for a route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";

    let query = supabase
      .from("route_hazards")
      .select("*")
      .eq("route_id", routeId)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Filter by is_warning
    const isWarning = searchParams.get("is_warning");
    if (isWarning === "true") {
      query = query.eq("is_warning", true);
    } else {
      // Default: only hazards (not warnings)
      query = query.or("is_warning.is.null,is_warning.eq.false");
    }

    const { data: hazards, error } = await query;

    if (error) throw error;

    // Fetch reporter info for each hazard
    const hazardsWithReporter = await Promise.all(
      (hazards || []).map(async (hazard) => {
        if (hazard.reported_by_user_id) {
          const { data: reporter } = await supabase
            .from("users")
            .select("id, name, avatar_url")
            .eq("id", hazard.reported_by_user_id)
            .single();
          return { ...hazard, reporter };
        }
        return { ...hazard, reporter: null };
      })
    );

    return NextResponse.json({ hazards: hazardsWithReporter });
  } catch (error: any) {
    console.error("[ROUTE_HAZARDS_GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Report a new hazard
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { hazard_type, title, description, severity, lat, lng, photo_url, expires_at } = body;
    const isWarning = body.is_warning === true;

    if (!hazard_type || !title || !severity) {
      return NextResponse.json(
        { error: "Hazard type, title, and severity are required" },
        { status: 400 }
      );
    }

    if (isWarning && !expires_at) {
      return NextResponse.json(
        { error: "Warnings must have an expiry time" },
        { status: 400 }
      );
    }

    const { data: hazard, error } = await supabase
      .from("route_hazards")
      .insert({
        route_id: routeId,
        reported_by_user_id: user.id,
        hazard_type,
        title,
        description,
        severity,
        lat: isWarning ? null : lat,
        lng: isWarning ? null : lng,
        photo_url,
        expires_at,
        is_warning: isWarning,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ hazard });
  } catch (error: any) {
    console.error("[ROUTE_HAZARDS_POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

