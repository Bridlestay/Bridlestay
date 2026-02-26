import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notes, rating } = await request.json();

    // Check if user already has a completion for this route
    const { data: existing } = await supabase
      .from('route_completions')
      .select('id')
      .eq('route_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    let data;
    if (existing) {
      // Update existing completion (preserves completed_at, updates notes/rating)
      const { data: updated, error: updateError } = await supabase
        .from('route_completions')
        .update({ notes, rating })
        .eq('id', existing.id)
        .select()
        .single();
      if (updateError) throw updateError;
      data = updated;
    } else {
      // Insert new completion
      const { data: inserted, error: insertError } = await supabase
        .from('route_completions')
        .insert({
          route_id: id,
          user_id: user.id,
          notes,
          rating
        })
        .select()
        .single();
      if (insertError) throw insertError;
      data = inserted;
    }

    // Update completions count on route
    const { count } = await supabase
      .from('route_completions')
      .select('*', { count: 'exact', head: true })
      .eq('route_id', id);
    await supabase
      .from('routes')
      .update({ completions_count: count || 0 })
      .eq('id', id);

    return NextResponse.json({ success: true, completion: data });
  } catch (error) {
    console.error('Error marking route as complete:', error);
    return NextResponse.json(
      { error: 'Failed to mark route as complete' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ completed: false });
    }

    // Check if user has completed this route
    const { data, error } = await supabase
      .from('route_completions')
      .select('*')
      .eq('route_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ 
      completed: !!data,
      completion: data 
    });
  } catch (error) {
    console.error('Error checking route completion:', error);
    return NextResponse.json(
      { error: 'Failed to check completion status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete completion
    const { error } = await supabase
      .from('route_completions')
      .delete()
      .eq('route_id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing route completion:', error);
    return NextResponse.json(
      { error: 'Failed to remove completion' },
      { status: 500 }
    );
  }
}
