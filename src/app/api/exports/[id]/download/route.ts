import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError, internalError } from '@/app/api/_lib/response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return apiError('UNAUTHORIZED', 'Authentication is required.', 401);
    }

    const { id } = await params;

    // Verify export ownership via project
    const { data: exportRecord } = await supabase
      .from('exports')
      .select('id, storage_path, checksum, project_id, status')
      .eq('id', id)
      .single();

    if (!exportRecord) {
      return apiError('NOT_FOUND', 'Export not found.', 404);
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', exportRecord.project_id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return apiError('NOT_FOUND', 'Export not found.', 404);
    }

    if (exportRecord.status !== 'completed' || !exportRecord.storage_path.startsWith(`exports/${exportRecord.project_id}/`)) {
      return apiError('EXPORT_NOT_READY', 'Export is not available for download.', 409);
    }

    // Create signed URL for download (valid for 1 hour)
    const { data: signedUrl, error } = await supabase.storage
      .from('exports')
      .createSignedUrl(exportRecord.storage_path, 3600);

    if (error || !signedUrl) {
      return internalError('Failed to create download URL.');
    }

    const signedUrlObject = new URL(signedUrl.signedUrl);
    const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!configuredSupabaseUrl || signedUrlObject.origin !== new URL(configuredSupabaseUrl).origin) {
      console.error('Rejected unexpected export download origin.');
      return internalError('Failed to create download URL.');
    }

    return NextResponse.redirect(signedUrl.signedUrl, 302);
  } catch (error) {
    console.error('Export download error:', error);
    return NextResponse.json(
      internalError('Failed to download export.')
    );
  }
}
