# FORM: Reality Architecture

This document describes what the repository actually does today. It is a code
trace, not a product-spec summary. Claims below are based on the implementation
in this repository and call out fallbacks, mocks, incomplete paths, and
external dependencies explicitly.

## 1. One-Sentence Truth

FORM is a Next.js App Router application where an authenticated user submits a
public URL, the server creates a durable Supabase/Inngest job, Firecrawl and
optionally Playwright collect source evidence, several LLM calls produce a
Zod-validated `ProductSpec` JSON document, the browser renders that document
using a fixed set of React section components, and later edits create immutable
JSON versions. It does not clone arbitrary source HTML/CSS, does not produce a
complete production backend for the generated site, and does not have a
repository-contained deployment or live end-to-end provider test.

## 2. Runtime Inventory

### 2.1 Application stack

From `package.json`:

- Next.js `16.3.4`, App Router.
- React and React DOM `19.2.8`.
- TypeScript `^5`.
- Tailwind CSS `^4` through PostCSS.
- Supabase JS and Supabase SSR for PostgreSQL, Auth, Storage, and cookies.
- Inngest `4.20.0` for durable asynchronous jobs.
- Firecrawl JS for website extraction and its screenshot format.
- Playwright for the optional independent browser/fidelity capture and QA
  rendering.
- Vercel AI SDK plus `@ai-sdk/openai-compatible` for text generation.
- Zod for all important input/ProductSpec validation.
- JSZip for export archive creation and validation.
- Radix UI primitives and Lucide React for the application interface.
- Vitest for tests and Playwright Test/axe-core as installed tooling.

### 2.2 Scripts

`package.json` defines:

```text
npm run dev          -> next dev
npm run build        -> next build
npm run start        -> next start
npm run lint         -> eslint
npm test             -> vitest run
npm run test:full-flow -> vitest run tests/full-flow.test.tsx
```

There is no repository script for deploying Vercel, syncing Inngest, applying
Supabase migrations, or running a live provider-backed E2E test.

### 2.3 Configuration reality

`next.config.ts` has no custom runtime configuration. `vitest.config.ts` uses
the Node environment, maps `@` to `src`, and includes `src/**/*.test.{ts,tsx}`
and `tests/**/*.test.tsx`.

No `.github` workflow, Dockerfile, `vercel.json`, or deployment manifest was
found. Vercel can still deploy a conventional Next.js app, but deployment is
an outside-the-repository operation.

## 3. Route Map

### 3.1 Public routes

- `/`: marketing landing page under `src/app/(marketing)/page.tsx`.
- `/demo`: static preview of `sampleSpec` from
  `src/lib/product/defaults.ts`; this is not a live capture.
- `/terms` and `/privacy`: static legal pages.

### 3.2 Authentication routes

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/auth/callback`

The auth pages are under `src/app/(auth)/`. The callback exchanges a Supabase
authorization code for a session and redirects to reset-password for recovery
flows or `/app` otherwise.

### 3.3 Protected routes

- `/app`: project library.
- `/app/projects`: same project library entry point.
- `/app/projects/new`: project creation form.
- `/app/projects/[id]`: project workspace.
- `/app/settings`: settings page.

`src/app/app/layout.tsx` creates a server Supabase client, checks the current
user, redirects unauthenticated requests, and renders the sidebar/top bar
shell. The browser does not receive the service-role key.

### 3.4 API routes

The API is REST-like and lives under `src/app/api/`:

```text
GET    /api/health
GET    /api/projects
POST   /api/projects
GET    /api/projects/[id]
PATCH  /api/projects/[id]
DELETE /api/projects/[id]
POST   /api/projects/[id]/analyze
POST   /api/projects/[id]/build
GET    /api/projects/[id]/messages
POST   /api/projects/[id]/messages
POST   /api/projects/[id]/qa
POST   /api/projects/[id]/export
POST   /api/projects/[id]/restore
GET    /api/projects/[id]/versions
GET    /api/projects/[id]/versions/[versionId]
GET    /api/jobs/[id]
POST   /api/jobs/[id]/cancel
GET    /api/exports/[id]/download
GET    /api/inngest
POST   /api/inngest
PUT    /api/inngest
```

All project-scoped routes authenticate and verify ownership before returning
or mutating project data. The shared error helper is in
`src/app/api/_lib/response.ts`, but older routes still return a legacy
`{ error: string }` shape instead of the newer `{ error: { code, message,
details } }` envelope.

## 4. Authentication and Trust Boundaries

`src/lib/supabase/server.ts` creates the SSR Supabase client from:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- request cookies from `next/headers`

Cookie write failures in server components are swallowed because server
components cannot always mutate the cookie response directly. Auth actions in
`src/lib/auth/actions.ts` implement login, signup, logout, forgot-password,
reset-password, `getSession`, and `getUser`.

Signup requires an eight-character password and matching confirmation. It stores
the email prefix as display-name metadata. Forgot-password intentionally does
not reveal whether an email exists.

Workers use `src/lib/supabase/admin.ts` and the service-role key. Worker code
does not trust an event as authorization: it loads the project and checks its
relationships before reading analyses or versions. Supabase RLS remains the
database-side ownership boundary for normal user requests.

## 5. Database Model

The migrations are in `supabase/migrations/`.

### 5.1 `001_init_schema.sql`

Defines the core product model:

- `projects`
- `analyses`
- `analysis_target_users`
- `analysis_key_features`
- `analysis_improvements`
- `analysis_mvp_features`
- `analysis_evidence`
- `analysis_visual`
- `product_specs`
- `product_spec_features`
- `product_spec_themes`
- `product_spec_navigation`
- `product_spec_pages`
- `sections`
- section-specific rows for hero, feature-list, steps, pricing, FAQ, CTA,
  metric-row, data-table, activity-list, and rich-text.

RLS is enabled for application tables. Ownership is generally derived from
the project owner. This migration also creates the profile trigger that maps a
new `auth.users` row into `profiles`.

### 5.2 `002_operational_schema.sql`

Adds operational tables:

- `source_captures`: requested/final URL, capture kind, normalized text,
  screenshot path, metadata, and capture time.
- `product_versions`: immutable version number, parent version, full canonical
  `spec` JSON, summary, and creator.
- `messages`: user/assistant conversation and edit status.
- `jobs`: job kind/status/stage/idempotency/request payload/result/error fields,
  cancellation state, and timestamps.
- `job_steps`: per-stage state, attempt, prompt version, model, usage,
  duration, output reference, and timestamps.
- `qa_reports`: QA findings for a version.
- `exports`: generated ZIP status and storage path.
- `usage_counters`: quota accounting fields.

Private Storage buckets are expected for `form-assets` and `exports`, with
policies restricting paths to the authenticated owner.

### 5.3 `003_job_steps_timestamps.sql`

Adds `started_at` and `finished_at` to `job_steps`. This migration must be
applied in production if the worker is expected to write those columns.

### 5.4 Canonical ProductSpec storage

`product_versions.spec` is the actual canonical render/export contract. The
normalized product tables are metadata/audit/query structures, not a complete
copy of every generated section.

The build worker inserts product spec metadata, features, theme, pages, and
navigation, then stores the complete JSON in `product_versions.spec`. It does
not insert every generated section into `sections` and its section-specific
tables. A database consumer must therefore read the version JSON to reproduce
the rendered product.

### 5.5 Quota reality

The SQL quota function uses hardcoded daily limits of 30 user calls and 300
global calls. Application code checks quota before several operations, but no
visible code reliably reserves or increments `usage_counters`. The quota
interface exists; complete accounting is not demonstrated by this repository.

## 6. Project Creation

`POST /api/projects` accepts:

```json
{
  "name": "optional, maximum 80 chars",
  "url": "public http/https URL",
  "description": "30-2000 chars",
  "targetCustomer": "3-240 chars"
}
```

The URL goes through lexical validation in `src/lib/capture/firecrawl.ts` and
DNS/private-network validation in `src/lib/validation/url.ts`. It rejects
credentials, localhost/private addresses, metadata endpoints, blocked ports,
non-HTTP(S) protocols, and URLs longer than 2048 characters. In development,
DNS lookup failure is allowed to continue; in production it becomes an unsafe
URL error.

The route inserts the project with both `user_id` and `owner_id`, defaulting
the name to the URL hostname. The project count limit is currently hardcoded
to 10 in the route even though `.env.example` exposes
`APP_MAX_PROJECTS_PER_USER`.

## 7. End-to-End User Journey

### 7.1 Analyze request

The workspace calls `POST /api/projects/[id]/analyze` with:

```json
{
  "idempotencyKey": "client-generated key",
  "refresh": true,
  "pastedContent": "optional user supplied content"
}
```

The route:

1. Authenticates the user.
2. Validates the body.
3. Checks project ownership.
4. Recovers stale analyze/build/edit jobs.
5. Rejects another active mutating job with `409`.
6. Checks the AI quota.
7. Creates or reuses a queued job.
8. Sends `jobs/analyze.requested` to Inngest.
9. Returns `202` and a `jobId`.

The browser does not perform the capture or LLM work. It polls the project/job
APIs roughly every 2.5 seconds, with a one-minute polling timeout in
`project-workspace.tsx`.

### 7.2 Analyze worker sequence

`src/lib/jobs/inngest.ts` registers `analyzeJob` as `analyze-website` with two
Inngest retries for `jobs/analyze.requested`.

The actual sequence is:

```text
load project
  -> claim or reuse job
  -> cancellation check
  -> capture URL or pasted content
  -> persist source_captures
  -> upload screenshot when present
  -> mark capture step
  -> one Inngest step: analysis-pipeline
       -> research phase
       -> visual phase
       -> product analyst phase
  -> persist analysis and child records
  -> mark project analyzed
  -> mark job succeeded
  -> send jobs/build.requested
```

The research, visual, and analyst statuses are written to `job_steps`, but
they execute inside one `step.run('analysis-pipeline')`; they are not three
independent durable Inngest steps.

If the run is retried, intermediate attempts are marked as retrying/running;
the final attempt is marked failed with an analysis error. Cancellation is
cooperative and checked between meaningful stages.

## 8. Exactly What Is Captured

### 8.1 URL capture through Firecrawl

`src/lib/capture/firecrawl.ts` initializes Firecrawl using
`FIRECRAWL_API_KEY` and requests:

```text
formats: ['markdown', 'html', 'screenshot']
onlyMainContent: true
waitFor: 2000
timeout: 30000
```

The surrounding operation has a 35-second timeout. Firecrawl returns extracted
content plus its screenshot. The normalized text is capped at 24,000
characters. The cap prioritizes headings, pricing/plan/cost lines, the first
ten other lines, and the last ten lines. This is not a complete source text
archive.

### 8.2 Independent Playwright fidelity capture

After Firecrawl, the application dynamically imports Playwright and attempts a
second browser capture. This lazy import is important for serverless/build
environments because importing Playwright at module load previously caused a
production route failure.

The browser configuration is:

```text
browser: Chromium headless
viewport: 1440 x 900 CSS pixels
deviceScaleFactor: 1
waitUntil: domcontentloaded
wait for document.fonts.ready
additional wait: 1200 ms
screenshot: page.screenshot({ fullPage: true, type: 'png' })
```

Therefore, for a normal URL capture there is one Playwright PNG per capture,
captured at a 1440-by-900 initial viewport but with `fullPage: true`. The image
height is the entire rendered document height, not 900 pixels. The screenshot
width is normally 1440 CSS pixels at scale factor 1. The exact height depends
on the source page after navigation, font loading, and the extra 1200 ms.

The code also serializes fidelity metadata from the live page:

- viewport width and height;
- document height;
- serialized DOM;
- image URLs;
- stylesheet URLs/content references;
- script URLs;
- font resources;
- other loaded resources;
- loaded font descriptors;
- inferred section order from `header`, `main`, `nav`, `section`, and `footer`;
- screenshot width and height.

This metadata is evidence supplied to later analysis/build logic. It is not a
mechanism that copies the source DOM into the generated site.

### 8.3 Playwright failure fallback

If Playwright cannot launch Chromium, navigate, wait for fonts, inspect the
page, or take the screenshot, the code logs a warning and falls back to the
Firecrawl screenshot. The capture can therefore succeed without the independent
browser screenshot. The Firecrawl screenshot's exact dimensions are controlled
by Firecrawl rather than by this repository.

### 8.4 Screenshot storage

The analyze worker uploads the browser/Firecrawl PNG to private Supabase
Storage under:

```text
form-assets/captures/{projectId}/{captureId}.png
```

The database stores the storage path, not necessarily a permanently public
URL. When the build worker needs the image, it creates a signed URL. Project
detail responses create capture signed URLs valid for about 15 minutes.

### 8.5 Pasted-content path

If `pastedContent` is supplied, `captureFromPastedContent` normalizes that text,
stores a `user_pasted` capture, and creates no screenshot. It stores no
fidelity DOM, no image list, and no Playwright output. This path is text-only.

## 9. LLM Pipeline

### 9.1 Text model

`src/lib/ai/provider.ts` creates an OpenAI-compatible provider with defaults:

```text
base URL: https://api.deepseek.com/v1
model: deepseek-chat
max output setting: 8000 from APP_AI_MAX_OUTPUT_TOKENS
```

The provider can use another OpenAI-compatible endpoint through
`AI_BASE_URL`. The model response is extracted as JSON and validated with the
Zod schema passed to `generateValidated`.

The validation loop is:

```text
call model
  -> extract JSON
  -> parse with Zod
  -> if invalid, make exactly one repair attempt
  -> throw if the repaired output is still invalid
```

The `maxTokens` value is part of the provider interface, but the inspected
`generateText` call does not visibly pass it as an SDK output-token option.
The configured cap should not be assumed to be enforced until verified against
the installed AI SDK.

On HTTP 402 only, the text path attempts a hardcoded Gemini REST fallback using
the vision API key/model. This is a narrow billing/payment fallback, not a
general provider failover.

### 9.2 Vision model

Vision requires `AI_VISION_BASE_URL`, `AI_VISION_API_KEY`, and
`AI_VISION_MODEL` to be present. The implementation fetches the screenshot,
converts it to base64, detects its MIME type, and sends an inline image to a
Gemini `generateContent` endpoint. The request destination is hardcoded to
`generativelanguage.googleapis.com`; the configured vision base URL is checked
for presence but is not used as the request destination.

If vision configuration is absent, `AIVisionUnavailableError` is caught by the
analysis pipeline and visual findings become `null`. Text analysis still
continues. Vision is therefore optional in the actual system.

### 9.3 Prompt stages

`src/lib/ai/prompts.ts` defines:

1. Research Agent: extract observed source facts and evidence.
2. Visual Agent: analyze screenshot/fidelity visual information.
3. Product Analyst: derive target users, features, improvements, and MVP.
4. Product Agent: create a ProductSpec from analysis and source context.
5. UI Agent: decide layout/theme/section structure.
6. Revision Agent: modify an existing ProductSpec from a user instruction.
7. QA Agent: review supplied deterministic/rendered checks and spec quality.

The common prompt tells models that source content is untrusted data, forbids
inventing unsupported facts/prices/integrations/certifications, distinguishes
observed/inferred/unknown claims, requires structured output, and preserves IDs
during modifications.

### 9.4 Pipeline order

The implementation order is:

```text
analysis: Research -> Visual -> Product Analyst
build:    Product Agent -> UI Agent
edit:     Revision Agent
qa:       deterministic validation -> rendered checks -> QA Agent
```

The UI agent adds the first usable source image to a hero section that lacks
media. It does not automatically recreate all source images, CSS, interactions,
or source component hierarchy.

### 9.5 Important build-context caveat

The worker creates a `BuildSourceContext` containing source URL, screenshot URL,
screenshot path, source image URLs, section order, fidelity metadata, and
screenshot metadata. However, `runBuildPipeline` is declared around analysis
and goal inputs, while the worker passes extra source-context fields through an
`as any` cast. The build pipeline itself does not visibly consume all those
extra fields. Source evidence affects analysis and visual direction, but this
is not equivalent to feeding the entire original site to a code-generation
model.

## 10. ProductSpec: The Generated Website Contract

`src/lib/product/schema.ts` defines the JSON document that both the in-app
renderer and versioning system understand.

Top-level fields include:

- schema version;
- product name, description, audience, and positioning;
- product features;
- theme;
- navigation;
- one to five pages;
- optional visual direction;
- UI direction.

Schema constraints include exactly one landing page, unique page slugs, and one
to eight sections per page. The section union contains exactly these ten types:

```text
hero
feature-list
steps
pricing
faq
cta
metric-row
data-table
activity-list
rich-text
```

This finite union is the central limitation on generated detail. The model can
choose content and arrangement, but the rendered output must fit these known
components. It cannot produce arbitrary React components from the source.

### 10.1 Generic fallback

`runUIAgent` catches errors and creates a deterministic fallback ProductSpec.
The fallback uses generic content such as `Built for modern teams`, an
`editorial-light` theme, one home page, and hero/features/steps/rich-text/FAQ/
CTA sections. It can pad missing features with `Core capability N`.

The build worker detects known generic fallback signatures when source evidence
exists and rejects them. This prevents two recognized fallbacks from shipping,
but it is not a general semantic guarantee that the result is source-faithful.

## 11. How the Website Actually Renders

### 11.1 In-app dispatcher

`src/components/product-renderer/section.tsx` switches on `section.type` and
renders one dedicated React component:

```text
hero          -> Hero.tsx
feature-list  -> FeatureList.tsx
steps         -> Steps.tsx
pricing       -> Pricing.tsx
faq           -> Faq.tsx
cta           -> Cta.tsx
metric-row    -> MetricRow.tsx
data-table    -> DataTable.tsx
activity-list -> ActivityList.tsx
rich-text     -> RichText.tsx
```

`PreviewPanel` maps `spec.pages`, prints each page title, maps each page's
sections, and adds `data-preview-section-id` attributes. It does not execute
source HTML. It executes this component library against JSON.

### 11.2 Section behavior

- Hero supports `split` or `centered` composition, headline/body/actions, and
  one image. Split mode becomes one column below `lg`; media has a 280px
  minimum height and 500px minimum at large sizes.
- Feature list renders numbered feature cards, two columns at `md`.
- Steps renders numbered items, two columns at `md`.
- Pricing renders plan cards, one column by default, two at `md`, three at
  `xl`.
- FAQ renders an accessible expandable list.
- CTA renders heading/body/action.
- Metric row renders bordered metric cards, two columns at `sm`, four at `xl`.
- Data table filters technical-looking columns and uses horizontal overflow.
- Activity list renders event cards, two columns at `md`, three at `xl`.
- Rich text renders heading and paragraphs.

Buttons call the preview action callback. The preview currently handles
`demo-dialog` and `scroll`. `navigate` actions are not implemented by
`PreviewPanel`.

### 11.3 Theme system

`src/lib/theme/tokens.ts` and `product-provider.tsx` scope CSS variables for
background, foreground, secondary text, muted surface, border, accent, focus,
radii, and fonts.

Approved presets are:

- `editorial-light`
- `precision-dark`
- `warm-service`

The implementation currently uses the lime accent value for more than one
preset despite comments suggesting cobalt/terracotta variation. Theme choice is
therefore less differentiated than the names imply.

### 11.4 Preview frame dimensions

The app preview is an isolated, scrollable product canvas. Current maximum
frame dimensions are:

```text
desktop: 1120px wide
tablet:   768px wide
mobile:   390px wide
```

Frame height is constrained by:

```text
min(clamp(360px, calc(100dvh - 220px), 760px), calc(100% - 2.5rem))
```

Below 640px the height formula uses `100dvh - 190px`, caps at 680px, and uses
smaller stage padding/radius. The frame can be manually resized from 320px to
1400px by pointer drag, capped by CSS max-width.

The workspace uses a 320px chat column and preview column. It collapses the
sidebar under 1200px, stacks chat and preview under 1100px, and removes the
sidebar into a single-column layout under 768px.

The generated content scrolls inside the frame. CSS applies `min-width: 0`,
`max-width: 100%`, and `overflow-wrap: anywhere` to preview descendants. Tables
are fixed-layout and scrollable horizontally.

## 12. Build Job: How a Website Version Is Made

`buildJob` is an Inngest function named `build-product` with two retries.

The request requires `analysisId` and an idempotency key. The API verifies the
analysis belongs to the project, prevents conflicting build/edit jobs, checks
quota, creates/reuses a job, sends `jobs/build.requested`, and returns `202`.

The worker does this:

```text
load project owner
  -> claim build job
  -> cancellation check
  -> load analysis
  -> load source capture and create screenshot signed URL
  -> load analysis child records in parallel
  -> one Inngest step: build-pipeline
       -> Product Agent
       -> UI Agent
  -> validate ProductSpec
  -> reject recognized generic source fallback
  -> persist product metadata/features/theme/pages/navigation
  -> insert immutable product_versions row with full spec JSON
  -> update project current_version_id/status=built
  -> mark job succeeded
```

The relational theme write is hardcoded to editorial-light/lime/comfortable/
sharp and can disagree with the AI spec theme. The canonical `spec` JSON is
still the richer render contract.

## 13. Chat Edit Job and Versioning

`POST /api/projects/[id]/messages` accepts an instruction, base version ID, and
idempotency key. It inserts a pending user message and queues an edit job.

`editJob` runs the Revision Agent against the base version:

```text
load base immutable spec
  -> revision-pipeline
  -> reject byte-identical JSON
  -> insert child product_versions row
  -> point project current_version_id to child
  -> insert assistant receipt message
  -> mark user message completed
  -> mark job succeeded
```

Versions are immutable records with parent IDs. Restore creates another version
from a selected prior version using optimistic concurrency via
`expectedCurrentVersionId`. Restore validates an idempotency key but does not
use it for deduplication. Version numbering uses count-plus-one rather than a
strict max-based sequence, so concurrent restores require caution.

## 14. Job State, Idempotency, and Cancellation

Jobs have these statuses:

```text
queued, running, succeeded, failed, cancelled
```

`src/app/api/_lib/jobs.ts` recovers stale queued jobs after about two minutes
and stale running jobs after about fifteen minutes. `queueJob` reuses existing
jobs for the same owner/idempotency key and handles unique-constraint races.

The database uniqueness boundary is effectively owner plus idempotency key.
Workers claim existing queued/failed/cancelled jobs, return succeeded jobs as
duplicates, and clear prior error/cancellation fields when retrying.

Cancellation is cooperative:

1. API marks queued jobs cancelled immediately or sets
   `cancel_requested=true` for running jobs.
2. Worker checks the row at stage boundaries.
3. Worker marks the job cancelled when observed.
4. A provider call already in progress is not forcibly interrupted by this
   code.

There are still partial-write risks because multi-table worker persistence is
not one visible database transaction. A provider or process failure after some
writes can leave records for a later retry.

## 15. QA Reality

### 15.1 Deterministic QA

`src/lib/qa/validate.ts` checks:

- exactly one landing page;
- required landing hero;
- required dashboard metric/data/activity sections;
- required pricing-page pricing section;
- required about-page rich text;
- duplicate IDs;
- empty action labels;
- invalid navigation targets;
- invalid scroll targets;
- incomplete demo dialogs;
- unbreakable tokens over 48 characters;
- theme preset consistency.

### 15.2 Render QA

`src/lib/qa/render.ts` renders a synthetic self-contained fixture at:

```text
1440px, 768px, 390px
```

It checks horizontal overflow, section count, action count, and invisible
sections. The fixture is not the actual production renderer: it does not load
the complete app CSS, real external assets, or source-generated pages.

### 15.3 AI QA

If deterministic checks pass, the worker runs rendered QA and then the QA Agent.
The QA Agent receives the check results and is instructed not to claim tests
ran unless results are provided. `@axe-core/playwright` is installed, but the
worker does not visibly call axe.

### 15.4 QA job sequence

```text
load version
  -> Zod parse
  -> deterministic validation
  -> rendered fixture checks
  -> AI review
  -> combine findings
  -> persist qa_reports
  -> mark job succeeded
```

## 16. Export Reality

`src/lib/export/generator.ts` creates a Vite/React ZIP. It validates ZIP CRC,
rejects unsafe absolute/parent paths, requires expected files, parses package
JSON, and validates the exported ProductSpec JSON.

The archive includes package/config files, README, notices, React entrypoint,
ProductSpec JSON/types, styles, renderer files, theme files, and utilities.

However, the export is not the same renderer as the in-app preview. The
generator creates a simplified exported `ProductSection` that renders only the
first page and generic section/type/body information. A larger
`SECTION_COMPONENTS` source string exists but is discarded with `void
SECTION_COMPONENTS`. Exported theme providers are stubs. The README explicitly
states the archive is a frontend prototype without real authentication,
database/backend APIs, payments, integrations, or production deployment.

The export job:

```text
load version
  -> generate ZIP
  -> upload ZIP to private exports storage
  -> insert completed exports row
  -> mark job succeeded
```

Download authenticates, checks project ownership and completed status, requires
an `exports/{projectId}/` path prefix, creates a one-hour signed URL, verifies
its configured origin, and redirects with HTTP 302.

## 17. What Is Mocked or Static

- `/demo` uses `sampleSpec`; it performs no capture or AI work.
- `tests/full-flow.test.tsx` mocks the AI provider.
- Full-flow tests do not call real Supabase, Firecrawl, Inngest, Playwright,
  or deployed API endpoints.
- Rendered QA uses a synthetic fixture rather than the actual renderer.
- Missing vision is a supported null-result fallback.
- Playwright capture failure falls back to Firecrawl screenshot.
- UI Agent failure falls back to deterministic generic ProductSpec.
- Exported theme providers are stubs.

## 18. Production Requirements

The `.env.example` variables are:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
AI_BASE_URL
AI_API_KEY
AI_MODEL
AI_VISION_BASE_URL
AI_VISION_API_KEY
AI_VISION_MODEL
FIRECRAWL_API_KEY
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
APP_DAILY_AI_CALL_LIMIT
APP_DAILY_GLOBAL_AI_CALL_LIMIT
APP_MAX_PROJECTS_PER_USER
APP_MAX_ACTIVE_JOBS_PER_USER
APP_AI_MAX_OUTPUT_TOKENS
```

A functioning fresh run requires all of the following outside the code:

1. Supabase project with migrations 001, 002, and 003 applied.
2. Auth redirect/site URL configuration.
3. Private `form-assets` and `exports` buckets and policies.
4. Service-role key available only to server workers.
5. Firecrawl account/key and available capture quota.
6. Text AI provider account/key and available credits.
7. Optional Gemini-compatible vision credentials.
8. Inngest event/signing configuration and synced function endpoint.
9. A deployment runtime able to run Node integrations, Playwright Chromium,
   ZIP generation, and worker requests within hosting limits.
10. DNS/network access to validate and capture the submitted public URL.

The README contains stale names (`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` and
`INNGEST_SERVICE_KEY`) that do not match the implementation. The actual server
service-role variable is `SUPABASE_SERVICE_ROLE_KEY`, and no
`INNGEST_SERVICE_KEY` use was found.

## 19. Current Verification Boundary

The current repository checks that passed during this work:

- `npx tsc --noEmit`
- `npm run lint` with one existing `next/no-img-element` warning
- `npm test -- --run`: 15 tests passed
- `npm run build`

These prove local compilation and deterministic behavior. They do not prove a
fresh URL can be captured, a real screenshot can reach the vision model, an
Inngest production event is signed and delivered, or a real generated ZIP is
downloadable from production.

## 20. Bottom-Line Assessment

The strongest accurate description is: **FORM is a full-stack SaaS MVP
implementation with real auth, database, storage, queued worker, provider,
version, QA, preview, and export code, but its generated website is a
schema-driven frontend prototype and its live capture-to-production journey
still depends on external configuration and has important incomplete
subsystems.**

It captures one full-page source screenshot per normal URL attempt when
Playwright succeeds, at a 1440x900 viewport with document-height output; it
does not capture “everywhere” or multiple responsive screenshots. It builds a
validated JSON spec through finite section components; it does not reproduce
the source site's arbitrary DOM/CSS. It executes durable staged jobs through
Inngest, but some named stages share one durable step and multi-table writes
are not transactional. It exports a ZIP, but that ZIP is intentionally not a
complete production application.
