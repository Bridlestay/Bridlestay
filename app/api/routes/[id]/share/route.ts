import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST - Record a share event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { share_method } = body;

    // Record the share (even for anonymous users)
    const { error } = await supabase
      .from("route_shares")
      .insert({
        route_id: routeId,
        shared_by_user_id: user?.id || null,
        share_method: share_method || "link",
      });

    if (error) throw error;

    // Get updated share count
    const { data: route } = await supabase
      .from("routes")
      .select("shares_count")
      .eq("id", routeId)
      .single();

    return NextResponse.json({ 
      success: true, 
      shares_count: route?.shares_count || 0 
    });
  } catch (error: any) {
    console.error("[ROUTE_SHARE_POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get share stats (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const { data: route } = await supabase
      .from("routes")
      .select("shares_count, share_token")
      .eq("id", routeId)
      .single();

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Generate share URL
    const shareUrl = route.share_token 
      ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/routes/shared/${route.share_token}`
      : `${process.env.NEXT_PUBLIC_APP_URL || ""}/routes?routeId=${routeId}`;

    return NextResponse.json({
      shares_count: route.shares_count || 0,
      share_url: shareUrl,
    });
  } catch (error: any) {
    console.error("[ROUTE_SHARE_GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

