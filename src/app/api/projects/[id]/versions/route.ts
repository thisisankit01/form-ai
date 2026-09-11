import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let query = supabase
      .from('product_versions')
      .select('id, version_number, change_summary, created_at, created_by')
      .eq('project_id', id)
      .order('version_number', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('version_number', parseInt(cursor));
    }

    const { data, error } = await query;

    if (error) throw error;

    const hasMore = data && data.length > limit;
    const items = hasMore ? data!.slice(0, -1) : data;
    const nextCursor = hasMore ? items[items.length - 1].version_number.toString() : null;

    return NextResponse.json({ data: items, nextCursor });
  } catch (error) {
    console.error('Versions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}