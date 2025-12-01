import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET all news posts (admin only)
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all posts (including drafts)
    const { data: posts, error } = await supabase
      .from("news_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error("Error fetching news posts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch news posts" },
      { status: 500 }
    );
  }
}

// POST create new news post (admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      excerpt,
      content,
      cover_image_url,
      category,
      status,
      featured,
      tags,
      seo_description,
    } = body;

    // Create post
    const { data: post, error } = await supabase
      .from("news_posts")
      .insert({
        title,
        excerpt,
        content,
        cover_image_url,
        author_id: user.id,
        category,
        status,
        featured,
        tags,
        seo_description,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating news post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create news post" },
      { status: 500 }
    );
  }
}

