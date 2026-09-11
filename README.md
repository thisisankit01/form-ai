# FORM - Website-to-Product Studio

A Next.js application that transforms websites into production-ready products using AI.

## Overview

FORM is a website-to-product studio that captures, analyzes, and transforms websites into customizable products. The application uses AI to analyze website content and generate product specifications that can be turned into functional code.

## Features

- **Website Capture**: Extract content and screenshots from websites using Firecrawl
- **AI Analysis**: Analyze captured content using DeepSeek AI to understand the product
- **Product Specification**: Generate detailed product specs with themes, sections, and components
- **Live Preview**: Preview generated products in real-time with interactive components
- **Authentication**: Secure user authentication with Supabase
- **Database**: Persistent storage of projects, analyses, and product specifications
- **Responsive Design**: Works across desktop, tablet, and mobile views
- **Theme System**: Three preset themes (editorial-light, precision-dark, warm-service)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn or pnpm or bun
- Supabase account
- DeepSeek API key (for AI features)
- Firecrawl API key (for website capture)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in the required environment variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anonymous key
   - `AI_API_KEY`: Your DeepSeek API key
   - `FIRECRAWL_API_KEY`: Your Firecrawl API key
   - `INNGEST_SIGNING_KEY`: Your Inngest signing key
   - `INNGEST_EVENT_KEY`: Your Inngest event key

### Database Setup

1. Apply the Supabase migrations:
   ```bash
   # Option 1: Using Supabase CLI (if you have the access token)
   supabase db push --supabase-resource-url $SUPABASE_URL --password $SUPABASE_DB_PASSWORD

   # Option 2: Manual application via Supabase SQL editor
    # Apply both migrations in order. The second adds jobs, storage,
    # operational tables, RLS policies, and quota helpers.
    # supabase/migrations/001_init_schema.sql
    # supabase/migrations/002_operational_schema.sql
   ```

### Development

```bash
# Start the Next.js development server
npm run dev

# Start the Inngest dev server (in another terminal)
npx inngest-cli@latest dev

 # Open http://localhost:3000 in your browser
```

Run the automated checks with `npm test`, `npx tsc --noEmit`, and `npm run lint`.
See `docs/README.md`, `docs/ARCHITECTURE.md`, and `docs/SUBMISSION.md` for the
current operating model, evaluator walkthrough, and known limitations.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous key | Yes |
| `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for server-side) | Yes (for migrations) |
| `AI_API_KEY` | DeepSeek API key for text generation | Yes |
| `AI_VISION_API_KEY` | Optional: Vision-capable API key for screenshot analysis | No |
| `FIRECRAWL_API_KEY` | Firecrawl API key for website capture | Yes |
| `INNGEST_SIGNING_KEY` | Inngest signing key | Yes |
| `INNGEST_EVENT_KEY` | Inngest event key | Yes |
| `INNGEST_SERVICE_KEY` | Inngest service key | Yes |

## Project Structure

```
src/
├── app/                 # Next.js app router
│   ├── (marketing)/     # Public marketing pages
│   │   ├── demo/        # Product preview demo
│   │   ├── login/       # Authentication pages
│   │   └── signup/
│   └── (dashboard)/     # User dashboard (Phase 2+)
├── components/          # Reusable components
│   ├── layout/          # Layout components (header, etc.)
│   ├── ui/              # UI primitives (button, input, etc.)
│   └── product-renderer/# Product specification renderer
├── lib/                 # Utilities and services
│   ├── ai/              # AI provider integration
│   ├── product/         # Product specification schema and validation
│   ├── supabase/        # Supabase client utilities
│   ├── theme/           # Theme system
│   └── ...              # Other utilities
├── docs/                # Documentation (PRD, progress, decisions)
└── supabase/            # Supabase migration files
```

## Architecture

FORM follows a modular architecture:

1. **Capture Stage**: Uses Firecrawl to extract website content and screenshots
2. **Analysis Stage**: Uses AI to analyze captured content and produce structured analysis
3. **Specification Stage**: Converts analysis into product specifications using UI/UX best practices
4. **Rendering Stage**: Renders product specifications into interactive previews
5. **Export Stage**: Generates and validates downloadable React/Vite code ZIPs

## Database Schema

The application uses Supabase for persistent storage with tables for:
- Projects (user workspaces)
- Analyses (captured websites and AI analysis results)
- Product specifications (generated product designs)
- Pages and sections (within specifications)
- UI elements and component data
- Evidence and claims (for analysis traceability)
- Row Level Security (RLS) policies for data protection

## Roadmap

See [PROGRESS.md](docs/PROGRESS.md) for current status and upcoming phases.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Backend Documentation

See [`docs/README.md`](docs/README.md) for API error contracts, export and URL security boundaries, setup verification, AI prompt logging, debugging examples, and known limitations.

## License

This project is licensed under the MIT License.
# form-ai
