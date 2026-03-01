import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST - Mark route as completed
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

    // Verify route exists
    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("id, name")
      .eq("id", routeId)
      .single();

    if (routeError || !route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Insert completion record (upsert to handle duplicate attempts)
    const { data: completion, error } = await supabase
      .from("route_completions")
      .upsert(
        {
          route_id: routeId,
          user_id: user.id,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: "route_id,user_id",
          ignoreDuplicates: false, // Update completed_at if already exists
        }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ completion }, { status: 201 });
  } catch (error: any) {
    console.error("[ROUTE_COMPLETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove completion record
export async function DELETE(
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

    const { error } = await supabase
      .from("route_completions")
      .delete()
      .eq("route_id", routeId)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ROUTE_COMPLETE_DELETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Check if user has completed the route
export async function GET(
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
      return NextResponse.json({ completed: false });
    }

    const { data: completion } = await supabase
      .from("route_completions")
      .select("id, completed_at")
      .eq("route_id", routeId)
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({ completed: !!completion, completion });
  } catch (error: any) {
    console.error("[ROUTE_COMPLETE_GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
