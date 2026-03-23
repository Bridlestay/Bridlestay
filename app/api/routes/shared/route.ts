import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch a route by share_token (bypasses RLS for link-only routes)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token || token.length < 16) {
      return NextResponse.json(
        { error: "Invalid share token" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: route, error } = await supabase
      .from("routes")
      .select("*")
      .eq("share_token", token)
      .eq("visibility", "link")
      .single();

    if (error || !route) {
      return NextResponse.json(
        { error: "Route not found or not shared" },
        { status: 404 }
      );
    }

    return NextResponse.json({ route });
  } catch (error: any) {
    console.error("[ROUTES_SHARED] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared route" },
      { status: 500 }
    );
  }
}
