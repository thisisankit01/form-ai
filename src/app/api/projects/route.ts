import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { assertSafePublicUrl, publicUrlSchema, UnsafePublicUrlError } from '@/lib/validation/url';
import { apiError, internalError, validationError } from '@/app/api/_lib/response';

const ProjectsQuerySchema = z.object({
  q: z.string().optional(),
  sort: z.enum(['updated', 'newest']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

const CreateProjectSchema = z.object({
  name: z.string().trim().max(80).optional(),
  url: publicUrlSchema,
  description: z.string().trim().min(30).max(2000),
  targetCustomer: z.string().trim().min(3).max(240),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return apiError('UNAUTHORIZED', 'Authentication is required.', 401);
    }

    const { searchParams } = new URL(request.url);
    const query = ProjectsQuerySchema.parse({
      q: searchParams.get('q') || undefined,
      sort: searchParams.get('sort') || undefined,
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const limit = query.limit || 12;
    const sort = query.sort || 'updated';
    const cursor = query.cursor;

    let queryBuilder = supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        target_customer,
        source_url,
        status,
        current_analysis_id,
        current_version_id,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order(sort === 'newest' ? 'created_at' : 'updated_at', { ascending: false })
      .limit(limit + 1);

    if (query.q) {
      queryBuilder = queryBuilder.ilike('name', `%${query.q}%`);
    }

    if (cursor) {
      queryBuilder = queryBuilder.lt('updated_at', cursor);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    const hasMore = data && data.length > limit;
    const items = hasMore ? data!.slice(0, -1) : data;
    const nextCursor = hasMore ? items[items.length - 1].updated_at : null;

    return NextResponse.json({ data: items || [], nextCursor, hasMore });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError({ fieldErrors: error.flatten().fieldErrors });
    }
    console.error('Projects list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return apiError('UNAUTHORIZED', 'Authentication is required.', 401);
    }

    const parsed = CreateProjectSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationError({ fieldErrors: parsed.error.flatten().fieldErrors });
    }
    const { name, url, description, targetCustomer } = parsed.data;
    await assertSafePublicUrl(url);

    // Check project quota
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count && count >= 10) {
      return apiError('PROJECT_LIMIT_REACHED', 'Project limit reached (max 10).', 400);
    }

    // Create project
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        owner_id: user.id,
        name: name || new URL(url).hostname,
        description,
        source_url: url,
        target_customer: targetCustomer,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof UnsafePublicUrlError) {
      return apiError('INVALID_PUBLIC_URL', 'Enter a URL that resolves to a public network address.', 400);
    }
    console.error('Project create error:', error);
    return internalError('Failed to create project.');
  }
}
