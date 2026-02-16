import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH - Update hazard (mark resolved, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; hazardId: string }> }
) {
  try {
    const supabase = await createClient();
    const { hazardId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Resolve-only requests are allowed for any authenticated user
    const isResolveOnly = body.status === "resolved" &&
      Object.keys(body).filter((k) => k !== "status").length === 0;

    if (!isResolveOnly) {
      // For non-resolve updates, check if user is reporter or admin
      const { data: hazard } = await supabase
        .from("route_hazards")
        .select("reported_by_user_id")
        .eq("id", hazardId)
        .single();

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      const isOwner = hazard?.reported_by_user_id === user.id;
      const isAdmin = userData?.role === "admin";

      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const updates: any = {};

    if (body.status) {
      updates.status = body.status;
      if (body.status === "resolved") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by_user_id = user.id;
      }
    }
    if (body.description !== undefined) updates.description = body.description;
    if (body.severity) updates.severity = body.severity;

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("route_hazards")
      .update(updates)
      .eq("id", hazardId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ hazard: updated });
  } catch (error: any) {
    console.error("[ROUTE_HAZARD_PATCH] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete hazard (owner or admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; hazardId: string }> }
) {
  try {
    const supabase = await createClient();
    const { hazardId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner or admin
    const { data: hazard } = await supabase
      .from("route_hazards")
      .select("reported_by_user_id")
      .eq("id", hazardId)
      .single();

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isOwner = hazard?.reported_by_user_id === user.id;
    const isAdmin = userData?.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("route_hazards")
      .delete()
      .eq("id", hazardId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ROUTE_HAZARD_DELETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

