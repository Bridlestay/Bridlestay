import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { validateRoutePhotoUpload } from '@/lib/file-validation';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Fetch all photos for this route (including user-uploaded and stock photos)
    const { data: userPhotos, error: userError } = await supabase
      .from('route_user_photos')
      .select(`
        *,
        user:user_id (
          username,
          avatar_url
        )
      `)
      .eq('route_id', params.id)
      .order('uploaded_at', { ascending: false });

    if (userError) throw userError;

    const { data: stockPhotos, error: stockError } = await supabase
      .from('route_photos')
      .select('*')
      .eq('route_id', params.id)
      .order('order_index');

    if (stockError) throw stockError;

    return NextResponse.json({
      userPhotos: userPhotos || [],
      stockPhotos: stockPhotos || []
    });
  } catch (error) {
    console.error('Error fetching route photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has completed this route
    const { data: completion } = await supabase
      .from('route_completions')
      .select('id')
      .eq('route_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!completion) {
      return NextResponse.json(
        { error: 'You must complete this route before uploading photos' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const validation = await validateRoutePhotoUpload(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Upload to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('route-photos')
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('route-photos')
      .getPublicUrl(fileName);

    // Insert photo record
    const { data: photo, error: insertError } = await supabase
      .from('route_user_photos')
      .insert({
        route_id: params.id,
        user_id: user.id,
        url: publicUrl,
        caption: caption || null
      })
      .select(`
        *,
        user:user_id (
          username,
          avatar_url
        )
      `)
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, photo });
  } catch (error) {
    console.error('Error uploading route photo:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Get photo to find storage path
    const { data: photo, error: fetchError } = await supabase
      .from('route_user_photos')
      .select('url, user_id')
      .eq('id', photoId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Extract file path from URL
    const urlParts = photo.url.split('/route-photos/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];

      // Delete from storage
      await supabase.storage
        .from('route-photos')
        .remove([filePath]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('route_user_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting route photo:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
