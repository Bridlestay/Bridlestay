import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Get photos for a route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    // Get route photos - basic query without new columns that may not exist yet
    const { data: routePhotos, error: routeError } = await supabase
      .from("route_photos")
      .select(`
        *,
        uploader:users!route_photos_uploaded_by_user_id_fkey(id, name, avatar_url)
      `)
      .eq("route_id", routeId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });

    if (routeError) throw routeError;

    // Separate photos by type (handle gracefully if columns don't exist)
    const photos = routePhotos || [];
    const coverPhoto = photos.find(p => p.is_cover === true);
    const displayPhotos = photos.filter(p => p.is_display === true && p.is_cover !== true);
    const authorPhotos = photos.filter(p => p.photo_type === 'author');
    const userPhotos = photos.filter(p => p.photo_type === 'user' || p.photo_type === 'completion' || !p.photo_type);

    // Get user-contributed photos from completions table (if it exists)
    let completionPhotos: any[] = [];
    try {
      const { data } = await supabase
        .from("route_user_photos")
        .select(`
          *,
          user:users!route_user_photos_user_id_fkey(id, name, avatar_url)
        `)
        .eq("route_id", routeId)
        .order("created_at", { ascending: false });
      completionPhotos = data || [];
    } catch {
      // Table may not exist, ignore
    }

    return NextResponse.json({ 
      photos: photos,
      coverPhoto: coverPhoto || null,
      displayPhotos,
      authorPhotos,
      userPhotos: [...userPhotos, ...completionPhotos],
    });
  } catch (error: any) {
    console.error("[ROUTE_PHOTOS_GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Upload a photo to a route
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check content type to determine if it's a file upload or JSON
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "File must be an image" }, { status: 400 });
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
      }

      // Check if user is route owner or admin
      const { data: route } = await supabase
        .from("routes")
        .select("owner_user_id")
        .eq("id", routeId)
        .single();

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      const isOwnerOrAdmin = route?.owner_user_id === user.id || userData?.role === "admin";
      const source = formData.get("source") as string || "";
      const isReviewUpload = source === "review";

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${routeId}/${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("route-photos")
        .upload(fileName, file);

      if (uploadError) {
        console.error("[ROUTE_PHOTOS_UPLOAD] Error:", uploadError);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("route-photos")
        .getPublicUrl(fileName);

      if (isOwnerOrAdmin && !isReviewUpload) {
        // Store in route_photos table (official route photos)
        const { data: photo, error } = await supabase
          .from("route_photos")
          .insert({
            route_id: routeId,
            url: publicUrl,
            caption: formData.get("caption") as string || null,
            uploaded_by_user_id: user.id,
            order_index: 0,
            photo_type: 'author',
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ photo }, { status: 201 });
      } else {
        // Store in user photos table (for community photos)
        const { data: photo, error } = await supabase
          .from("route_user_photos")
          .insert({
            route_id: routeId,
            user_id: user.id,
            url: publicUrl,
            caption: formData.get("caption") as string || null,
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ photo }, { status: 201 });
      }
    } else {
      // Handle JSON body (for route owner adding photos by URL)
      const body = await request.json();
      const { url, caption, order_index } = body;

      // Check if user owns the route for URL-based uploads
      const { data: route } = await supabase
        .from("routes")
        .select("owner_user_id")
        .eq("id", routeId)
        .single();

      if (!route || route.owner_user_id !== user.id) {
        return NextResponse.json({ error: "Only route owner can add photos by URL" }, { status: 403 });
      }

      if (!url) {
        return NextResponse.json({ error: "Photo URL is required" }, { status: 400 });
      }

      const { data: photo, error } = await supabase
        .from("route_photos")
        .insert({
          route_id: routeId,
          url,
          caption,
          uploaded_by_user_id: user.id,
          order_index: order_index || 0,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ photo }, { status: 201 });
    }
  } catch (error: any) {
    console.error("[ROUTE_PHOTOS_POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a user photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID required" }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try deleting from route_user_photos first (community/review photos)
    const { data: userPhotoDeleted, error: userPhotoError } = await supabase
      .from("route_user_photos")
      .delete()
      .eq("id", photoId)
      .eq("user_id", user.id)
      .select();

    if (userPhotoError) throw userPhotoError;

    // If nothing was deleted, try route_photos (owner/admin photos)
    if (!userPhotoDeleted || userPhotoDeleted.length === 0) {
      const { error: routePhotoError } = await supabase
        .from("route_photos")
        .delete()
        .eq("id", photoId)
        .eq("uploaded_by_user_id", user.id);

      if (routePhotoError) throw routePhotoError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ROUTE_PHOTOS_DELETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update photo settings (cover, display, etc.)
// NOTE: Requires migration 057_route_photos_categorization.sql to be run
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: routeId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is route owner or admin
    const { data: route } = await supabase
      .from("routes")
      .select("owner_user_id")
      .eq("id", routeId)
      .single();

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isOwnerOrAdmin = route?.owner_user_id === user.id || userData?.role === "admin";

    if (!isOwnerOrAdmin) {
      return NextResponse.json({ error: "Only route owner can update photo settings" }, { status: 403 });
    }

    const body = await request.json();
    const { photoId, is_cover, is_display } = body;

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID required" }, { status: 400 });
    }

    // First, verify the photo exists and get its current state
    const { data: existingPhoto, error: fetchError } = await supabase
      .from("route_photos")
      .select("*")
      .eq("id", photoId)
      .eq("route_id", routeId)
      .single();

    if (fetchError || !existingPhoto) {
      console.error("[ROUTE_PHOTOS_PATCH] Photo not found:", fetchError);
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Check if is_cover column exists by looking at the existing photo
    const hasCoverColumn = existingPhoto.hasOwnProperty("is_cover");
    const hasDisplayColumn = existingPhoto.hasOwnProperty("is_display");

    console.log("[ROUTE_PHOTOS_PATCH] Columns check:", { hasCoverColumn, hasDisplayColumn });
    console.log("[ROUTE_PHOTOS_PATCH] Updating:", { photoId, is_cover, is_display });

    if ((is_cover !== undefined && !hasCoverColumn) || (is_display !== undefined && !hasDisplayColumn)) {
      return NextResponse.json({ 
        error: "Photo categorization columns not available. Please run migration 057_route_photos_categorization.sql in Supabase.",
        requiresMigration: true,
        message: "Run this SQL in Supabase: ALTER TABLE route_photos ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT FALSE; ALTER TABLE route_photos ADD COLUMN IF NOT EXISTS is_display BOOLEAN DEFAULT FALSE;"
      }, { status: 400 });
    }

    // If setting as cover, first unset any existing cover
    if (is_cover === true) {
      const { error: unsetError } = await supabase
        .from("route_photos")
        .update({ is_cover: false })
        .eq("route_id", routeId)
        .eq("is_cover", true);
      
      if (unsetError) {
        console.error("[ROUTE_PHOTOS_PATCH] Error unsetting cover:", unsetError);
      }
    }

    // Update the photo
    const updateData: any = {};
    if (typeof is_cover === "boolean") updateData.is_cover = is_cover;
    if (typeof is_display === "boolean") updateData.is_display = is_display;

    console.log("[ROUTE_PHOTOS_PATCH] Update data:", updateData);

    const { data: photos, error } = await supabase
      .from("route_photos")
      .update(updateData)
      .eq("id", photoId)
      .eq("route_id", routeId)
      .select();

    if (error) {
      console.error("[ROUTE_PHOTOS_PATCH] Update error:", error);
      throw error;
    }

    const photo = photos?.[0] || null;
    console.log("[ROUTE_PHOTOS_PATCH] Updated photo:", photo);

    if (!photo) {
      return NextResponse.json({ 
        error: "Failed to update photo - no rows affected",
        success: false 
      }, { status: 400 });
    }

    return NextResponse.json({ photo, success: true });
  } catch (error: any) {
    console.error("[ROUTE_PHOTOS_PATCH] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
