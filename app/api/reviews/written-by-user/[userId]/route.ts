import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;

    // Get property reviews written by this user
    const { data: propertyReviews } = await supabase
      .from("property_reviews")
      .select(`
        *,
        properties!inner(
          id, 
          name, 
          city, 
          county,
          property_photos(url, is_main, order_index)
        )
      `)
      .eq("reviewer_id", userId)
      .order("created_at", { ascending: false });

    // Get user reviews written by this user (if they're a host)
    const { data: userReviews } = await supabase
      .from("user_reviews")
      .select(`
        *,
        reviewed_user:users!user_reviews_reviewed_user_id_fkey(id, name, avatar_url)
      `)
      .eq("reviewer_id", userId)
      .order("created_at", { ascending: false });

    // Combine and format
    const allReviews = [
      ...(propertyReviews || []).map(review => {
        // Get main image
        const mainImage = review.properties.property_photos?.find((p: any) => p.is_main)
          || review.properties.property_photos?.[0];
        
        return {
          ...review,
          property: {
            ...review.properties,
            main_image_url: mainImage?.url || null,
          },
          type: "property"
        };
      }),
      ...(userReviews || []).map(review => ({
        ...review,
        reviewed_user: review.reviewed_user,
        type: "user"
      }))
    ];

    // Sort by created_at
    allReviews.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({ reviews: allReviews });
  } catch (error: any) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

