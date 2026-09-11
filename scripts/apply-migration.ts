import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PROJECT_REF = 'vcagwktbdlshphnhtljk'
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
}

async function applyMigrationViaManagementApi(accessToken: string) {
  const migrationPath = join(__dirname, '../supabase/migrations/001_init_schema.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  console.log('Applying migration via Supabase Management API...')
  console.log('Project:', PROJECT_REF)
  console.log('SQL length:', sql.length, 'characters')

  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Management API error: ${response.status} - ${error}`)
  }

  const result = await response.json()
  console.log('Migration applied successfully!')
  console.log('Result:', JSON.stringify(result, null, 2))
}

async function applyMigrationViaRestApi() {
  const migrationPath = join(__dirname, '../supabase/migrations/001_init_schema.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  console.log('Attempting to apply migration via REST API...')
  console.log('Note: This requires the exec_sql function to exist in your database.')

  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} statements to execute`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'
    console.log(`\n[${i + 1}/${statements.length}] Executing...`)
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ sql: statement })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Error:', error)
        console.error('Statement:', statement.substring(0, 200) + '...')
      } else {
        console.log('Success')
      }
    } catch (err) {
      console.error('Exception:', err)
      console.error('Statement:', statement.substring(0, 200) + '...')
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const accessToken = args.find(arg => arg.startsWith('--token='))?.split('=')[1]
    || process.env.SUPABASE_ACCESS_TOKEN

  if (accessToken) {
    try {
      await applyMigrationViaManagementApi(accessToken)
      return
    } catch (err) {
      console.error('Management API failed:', err)
      console.log('Falling back to REST API...')
    }
  }

  console.log('No personal access token provided. Trying REST API (requires exec_sql function)...')
  await applyMigrationViaRestApi()

  console.log('\n=== Manual Application Instructions ===')
  console.log('If the automated methods failed, apply the migration manually:')
  console.log('')
  console.log('1. Go to Supabase SQL Editor:')
  console.log('   https://supabase.com/dashboard/project/vcagwktbdlshphnhtljk/sql')
  console.log('')
  console.log('2. Click "New Query"')
  console.log('')
  console.log('3. Copy the contents of:')
  console.log('   supabase/migrations/001_init_schema.sql')
  console.log('')
  console.log('4. Paste into the query editor and click "RUN"')
  console.log('')
  console.log('To use the Management API automation, provide a personal access token:')
  console.log('  npx tsx scripts/apply-migration.ts --token=YOUR_PERSONAL_ACCESS_TOKEN')
  console.log('')
  console.log('Generate a token at: https://supabase.com/dashboard/account/tokens')
}

main().catch(console.error)
