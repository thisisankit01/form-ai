import { inngest } from '@/lib/jobs/client';
import { serve } from 'inngest/next';
import { analyzeJob, buildJob, editJob, qaJob, exportJob, cancelJob } from '@/lib/jobs/inngest';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeJob,
    buildJob,
    editJob,
    qaJob,
    exportJob,
    cancelJob,
  ],
});
