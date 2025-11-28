import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID required" },
        { status: 400 }
      );
    }

    // Check if already favorited
    const { data: existingFavorite } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("property_id", propertyId)
      .single();

    if (existingFavorite) {
      // Remove favorite
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("property_id", propertyId);

      if (error) throw error;

      return NextResponse.json({ favorited: false });
    } else {
      // Add favorite
      const { error } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          property_id: propertyId,
        });

      if (error) throw error;

      return NextResponse.json({ favorited: true });
    }
  } catch (error: any) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle favorite" },
      { status: 500 }
    );
  }
}



