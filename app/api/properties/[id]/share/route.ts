import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    const supabase = await createClient();
    
    const body = await request.json();
    const { platform } = body;

    if (!platform) {
      return NextResponse.json(
        { error: "Platform is required" },
        { status: 400 }
      );
    }

    // Get current user (optional - anonymous shares allowed)
    const { data: { user } } = await supabase.auth.getUser();

    // Record the share
    const { error } = await supabase
      .from("property_shares")
      .insert({
        property_id: propertyId,
        user_id: user?.id || null,
        platform,
      });

    if (error) {
      console.error("Failed to record share:", error);
      // Don't fail silently - but still return success to not block UX
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Share tracking error:", error);
    return NextResponse.json({ success: true }); // Still return success to not block UX
  }
}

// GET endpoint to get share stats for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    const supabase = await createClient();

    // Get share count from properties table (quick lookup)
    const { data: property } = await supabase
      .from("properties")
      .select("share_count, host_id")
      .eq("id", propertyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // If user is the owner or admin, provide detailed breakdown
    let isOwnerOrAdmin = false;
    if (user) {
      if (property.host_id === user.id) {
        isOwnerOrAdmin = true;
      } else {
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        isOwnerOrAdmin = userData?.role === "admin";
      }
    }

    if (isOwnerOrAdmin) {
      // Get detailed breakdown by platform
      const { data: shares } = await supabase
        .from("property_shares")
        .select("platform, created_at")
        .eq("property_id", propertyId);

      const breakdown: Record<string, number> = {};
      (shares || []).forEach((share) => {
        breakdown[share.platform] = (breakdown[share.platform] || 0) + 1;
      });

      return NextResponse.json({
        total: property.share_count || 0,
        breakdown,
      });
    }

    // For non-owners, just return total
    return NextResponse.json({
      total: property.share_count || 0,
    });
  } catch (error) {
    console.error("Get share stats error:", error);
    return NextResponse.json({ total: 0 });
  }
}

