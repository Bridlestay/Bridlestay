import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// PUT update news post (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Update post
    const { data: post, error } = await supabase
      .from("news_posts")
      .update({
        title,
        excerpt,
        content,
        cover_image_url,
        category,
        status,
        featured,
        tags,
        seo_description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error("Error updating news post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update news post" },
      { status: 500 }
    );
  }
}

// DELETE news post (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Delete post
    const { error } = await supabase
      .from("news_posts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting news post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete news post" },
      { status: 500 }
    );
  }
}

