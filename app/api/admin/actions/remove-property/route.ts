import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPropertyRemovalMessage } from "@/lib/system-messages";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminData } = await supabase
      .from("users")
      .select("role, name")
      .eq("id", user.id)
      .single();

    if (!adminData || adminData.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { propertyId, reason } = await request.json();

    if (!propertyId || !reason) {
      return NextResponse.json(
        { error: "Property ID and reason are required" },
        { status: 400 }
      );
    }

    // Get property and host info
    const { data: property } = await supabase
      .from("properties")
      .select("name, host_id, host:users!host_id(name, email)")
      .eq("id", propertyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Remove the property
    const { error: removeError } = await supabase
      .from("properties")
      .update({
        removed: true,
        removal_reason: reason,
        removed_at: new Date().toISOString(),
        removed_by: user.id,
        published: false, // Unpublish it too
      })
      .eq("id", propertyId);

    if (removeError) throw removeError;

    // Extract host data (could be array or object)
    const hostData: any = Array.isArray(property.host) ? property.host[0] : property.host;

    // Log admin action
    await supabase.from("admin_actions").insert({
      admin_id: user.id,
      target_property_id: propertyId,
      target_user_id: property.host_id,
      action_type: "remove_property",
      reason,
      metadata: {
        property_name: property.name,
        host_email: hostData?.email,
        host_name: hostData?.name,
      },
    });

    // Send system message to host
    const removalMsg = getPropertyRemovalMessage(
      property.host_id,
      hostData?.name || "Host",
      property.name,
      reason,
      adminData.name || "Admin"
    );

    await fetch(`${request.nextUrl.origin}/api/system/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(removalMsg),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing property:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove property" },
      { status: 500 }
    );
  }
}

