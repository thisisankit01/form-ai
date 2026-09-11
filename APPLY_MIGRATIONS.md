# How to Apply Supabase Migrations

You have your Supabase credentials ready in `.env.local`. Now apply the database schema:

## Method 1: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you don't have it:
   ```bash
   # Using npm
   npm install -g supabase
   
   # Or using Homebrew (macOS)
   brew install supabase/tap/supabase
   ```

2. Login to your Supabase account:
   ```bash
   supabase login
   ```

3. Link to your project:
   ```bash
   supabase link --project-ref vcagwktbdlshphnhtljk
   ```

4. Apply the migrations:
   ```bash
   supabase db push
   ```

## Method 2: Manual via Supabase Dashboard

1. Go to your Supabase project dashboard:
   https://supabase.com/dashboard/project/vcagwktbdlshphnhtljk/sql

2. Click "New Query"

3. Copy the entire contents of:
   `supabase/migrations/001_init_schema.sql`

4. Paste into the query editor and click "RUN"

## Verification

After applying migrations, you should see these tables in your Supabase dashboard under Table Editor:
- projects
- analyses
- analysis_target_users
- analysis_key_features
- analysis_improvements
- analysis_mvp_features
- analysis_evidence
- analysis_visual
- product_specs
- product_spec_features
- product_spec_themes
- product_spec_navigation
- product_spec_pages
- sections
- section_heroes
- section_feature_list_items
- section_steps_items
- section_pricing_plans
- section_pricing_plan_features
- section_pricing_plan_actions
- section_faq_items
- section_ctas
- section_metric_row_metrics
- section_data_table_columns
- section_data_table_rows
- section_data_table_cells
- section_activity_list_items
- section_rich_text_paragraphs
- Plus RLS policies and indexes

## Next Steps

Once migrations are applied, run:
```bash
# Terminal 1
npm run dev

# Terminal 2
npx inngest-cli@latest dev

# Visit: http://localhost:3000
```

The application will then be able to store and retrieve projects, analyses, and product specifications.
