import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    const { notes, rating } = await request.json();

    // Mark route as complete
    const { data, error } = await supabase
      .from('route_completions')
      .insert({
        route_id: params.id,
        user_id: user.id,
        notes,
        rating
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate completion
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Route already marked as complete' },
          { status: 409 }
        );
      }
      throw error;
    }

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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ completed: false });
    }

    // Check if user has completed this route
    const { data, error } = await supabase
      .from('route_completions')
      .select('*')
      .eq('route_id', params.id)
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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete completion
    const { error } = await supabase
      .from('route_completions')
      .delete()
      .eq('route_id', params.id)
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
