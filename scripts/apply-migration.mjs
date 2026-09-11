// Apply Supabase migration using service role key

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  const sql = fs.readFileSync('supabase/migrations/001_init_schema.sql', 'utf8');
  
  // Split by semicolon but be careful with function definitions
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} statements to execute...`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });
      if (error) {
        console.log(`Statement ${i + 1}: ${error.message}`);
      } else {
        console.log(`Statement ${i + 1}: OK`);
      }
    } catch (e) {
      console.log(`Statement ${i + 1}: ${e.message}`);
    }
  }
  
  // Verify tables exist
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  
  if (tables) {
    console.log('\nTables in database:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
  }
}

applyMigration().catch(console.error);
