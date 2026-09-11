#!/bin/bash

# Script to apply Supabase migrations
# Usage: ./scripts/apply-migrations.sh

set -e  # Exit on any error

echo "FORM Database Migration Helper"
echo "=============================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "Supabase CLI not found. Please install it first:"
    echo "  npm install -g supabase"
    echo "  or"
    echo "  brew install supabase/tap/supabase"
    exit 1
fi

# Check for required environment variables
if [ -z "$SUPABASE_URL" ]; then
    echo "Error: SUPABASE_URL environment variable not set"
    echo "Please set it to your Supabase project URL"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set"
    echo "Please set it to your Supabase service role key"
    exit 1
fi

echo "Supabase URL: $SUPABASE_URL"
echo ""

# Link to the Supabase project
echo "Linking to Supabase project..."
supabase link --project-ref "$SUPABASE_URL" --supabase-resource-url "$SUPABASE_URL" || {
    echo "Failed to link to Supabase project. Make sure the URL is correct."
    exit 1
}

# Apply migrations
echo "Applying database migrations..."
supabase db push --linked

echo ""
echo "Migration application complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env.local with the database credentials if needed"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:3000 to see the application"