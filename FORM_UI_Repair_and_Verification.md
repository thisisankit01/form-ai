# FORM — UI repair and browser verification contract

Version 2 · 9 September 2026 · For the existing implementation

## 1. Read this before changing code

You are repairing an existing application that already has working signup and login. Reported defects include unreadable foreground/background combinations, an uncloseable sidebar, collapsing layouts, trapped scrolling, oversized text, and inconsistent styling. These reports are input from the owner, not independently reproduced findings.

Read `docs/PRD.md`, this file, and repository instructions. Inspect the actual application and implementation before editing. This file supersedes the original PRD only for conflicting UI geometry, typography, styling, responsive behavior and verification workflow. It does not remove product functionality, backend requirements, or bonus requirements.

Do not restart the repository, replace the framework, regenerate all pages, break auth, replace real integrations with fixtures, or make unrelated architecture changes. Correct shared causes before individually patching twenty screens. Do not claim pixel-perfect or logic-perfect results: demonstrate conformance at specified viewports and report remaining limitations.

### Required first actions

1. Identify framework and installed versions from the repository and lockfile. Read its scripts, global CSS, theme provider, layout components, sidebar, page containers, preview renderer and modal primitives.
2. Establish how the app runs. Start it and open the actual landing page and authenticated app using available browser tools. Use a test account or authenticated session legitimately provided for testing.
3. Capture baseline screenshots and reproduce each reported defect. Record viewport, route, action, expected/actual behavior and affected component. Record console/runtime errors separately.
4. Find root causes: conflicting CSS variables, automatic dark mode, inherited text colors, missing min-height:0, conflicting fixed/sticky positions, wrong scroll owner, overlay blocking clicks, and duplicate drawer state.
5. Create `docs/UI_REPAIR_PROGRESS.md` and `docs/UI_BUGS.md`. Preserve a checkpoint before edits. Mark unavailable live credentials/browser access as blockers, never as passes.
6. Repair foundation → shell → shared components → individual screens → generated preview → tests. Do not add new feature scope during this repair.

The agent may continue through all phases without routine confirmation. Ask only when access, missing credentials, or genuinely ambiguous requirements prevent progress.

## 2. Appearance contract

FORM should look like a carefully typeset product studio: dark marketing hero, warm ivory application, white work surfaces, charcoal navigation, disciplined typography, and a limited accent. The product content is the visual focus.

The earlier 88px hero was too permissive for this implementation. Replace it with the bounded sizes below. Large text must never determine the layout at the expense of controls or content.

### Single theme authority

The FORM host application has one deliberately composed theme. It does not automatically switch according to operating-system dark mode. Do not add a user theme toggle in this repair. Marketing dark areas and the dark sidebar are explicit surface regions, not a global `.dark` toggle.

Generated products have their own scoped themes. They must not modify the host's root CSS variables, color scheme, typography or button classes. Do not let a generated preview add `.dark` to the document element.

Use semantic foreground/background pairs. Define them once. Every surface establishes both background and text color; every control establishes both. Portaled content needs explicit surface tokens because it may render outside its triggering surface.

### Approved colors and exact use

| Semantic role | Background | Foreground | Supporting text | Border |
|---|---|---|---|---|
| App canvas | #F5F4F0 | #171717 | #60605B | #D9D8D1 |
| White panel, form, popover | #FFFFFF | #171717 | #60605B | #D9D8D1 |
| Muted region | #ECEBE6 | #171717 | #60605B | #D9D8D1 |
| Dark hero/sidebar | #111111 | #F8F7F3 | #B8B7B1 | #373733 |
| Raised dark region | #1B1B1B | #F8F7F3 | #B8B7B1 | #373733 |
| Primary button on light | #111111 | #FFFFFF | — | #111111 |
| Primary button on dark | #F8F7F3 | #111111 | — | #F8F7F3 |
| Accent chip | #DDF274 | #20250A | — | #DDF274 |
| Error message | #FFF1F0 | #9D2525 | #9D2525 | #E7BCB8 |
| Success message | #EDF6EF | #205437 | #205437 | #BDD4C3 |
| Warning message | #FFF5DE | #704608 | #704608 | #DAC493 |
| Disabled control | #ECEBE6 | #6A6A63 | — | #D9D8D1 |

These are prescribed combinations, not a substitute for measured contrast. Verify actual rendered text against WCAG AA. Normal text target 4.5:1, large text 3:1; relevant non-text controls/focus boundaries 3:1. Test actual states, including translucent overlays. Never use the lime accent as small text on white.

Host token naming must be consistent. If shadcn uses `background/foreground/card/card-foreground/popover/popover-foreground/primary/primary-foreground/muted/muted-foreground`, map all of them explicitly. Do not combine hex values with a utility expecting an HSL channel tuple. Inspect how the installed Tailwind version consumes variables rather than copying a different version's configuration.

No component may use `text-white` without an explicitly intended dark background. No component may inherit dark-region text inside a white card. Remove conflicting classes rather than adding an `!important` override cascade. Do not use universal color rules on `div`, `span`, `p`, `button` or `*` to fix inheritance.

### CSS foundation example

Adapt the selectors to the actual project; preserve these relationships.

```css
:root {
  color-scheme: light;
  --form-canvas: #F5F4F0;
  --form-panel: #FFFFFF;
  --form-muted: #ECEBE6;
  --form-text: #171717;
  --form-secondary: #60605B;
  --form-border: #D9D8D1;
  --form-ink: #111111;
  --form-inverse: #F8F7F3;
  --form-inverse-secondary: #B8B7B1;
  --form-focus: #3659D9;
}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body { background: var(--form-canvas); color: var(--form-text); }
button, input, select, textarea { font: inherit; }
.form-light-surface { background: var(--form-panel); color: var(--form-text); }
.form-dark-surface { background: var(--form-ink); color: var(--form-inverse); }
.form-dark-surface .form-supporting { color: var(--form-inverse-secondary); }
.form-light-surface .form-supporting { color: var(--form-secondary); }
```

The example does not authorize wiping existing reset/accessibility styles. Compose it with the installed system. Use scoped selectors or CSS modules. Global `.card`, `.title`, `header`, `nav` and `section` rules must not leak into generated products.

## 3. Type, spacing, and density

Keep existing properly loaded Manrope/Inter fonts. Do not introduce another font library. If fonts fail, use a readable system sans-serif fallback. Font loading must not leave blank text.

| Element | >=1200px | 768–1199px | <768px | Weight / line-height |
|---|---:|---:|---:|---|
| Marketing hero | 64px | 52px | 40px | 600 / 1.06 |
| Marketing section title | 40px | 34px | 28px | 600 / 1.15 |
| App page title | 28px | 28px | 24px | 600 / 1.2 |
| Workspace project title | 16px | 16px | 15px | 600 / 1.4 |
| Panel title | 18px | 18px | 18px | 600 / 1.35 |
| Body | 14px | 14px | 14px | 400 / 1.6 |
| Intro paragraph | 17px | 16px | 16px | 400 / 1.6 |
| Input | 16px | 16px | 16px | 400 / 1.5 |
| Button | 14px | 14px | 14px | 600 / 1.2 |
| Metadata | 12px | 12px | 12px | 500 / 1.45 |

Heading tracking -0.035em marketing, -0.02em app; body normal. No 10px essential text. No all-uppercase long passages. No display font for paragraphs or tables. Do not set a global `h1` size that affects generated pages and app panels alike.

Spacing scale: 4/8/12/16/20/24/32/40/48/64/80/96px. Landing sections 96px vertical desktop, 64px tablet, 48px mobile. App content padding 32px desktop, 24px tablet, 16px mobile. Panel padding 24px desktop, 20px mobile. Avoid margins introduced only to compensate for incorrect parent geometry.

Radii: controls 8px; panels 14px; hero stage 20px; status chips fully rounded. Borders 1px. Default panels have no shadow. Floating surfaces only: `0 12px 40px rgba(17,17,17,.10)`. Do not stack three bordered cards to display one paragraph.

Content wraps naturally. Marketing hero uses a controlled max-width, no forced `<br>` on every device. Project names and domains may truncate with accessible full text. User content, error messages and analysis paragraphs wrap; do not ellipsize the information users need to read. Use `overflow-wrap:anywhere` for unbroken URLs or generated strings in appropriate text regions, not every word everywhere.

## 4. Layout and scrolling: ownership rules

These rules fix the reported collapsing and trapped-scroll defects. Establish one deliberate scroll owner for each region.

### Marketing, auth, and ordinary content pages

Landing: document scrolls normally. No `height:100vh;overflow:hidden` wrapper. Header sticky at top only if it doesn't overlap anchor targets. Anchor sections use scroll margin matching header height.

Auth: document scrolls if form plus keyboard or zoom exceeds viewport. Do not vertically center a taller-than-screen form with unreachable top fields.

Dashboard/settings/new-project: app occupies viewport; main content is the scroll region. Sidebar navigation scrolls independently only if its content overflows. Do not render the ordinary page scroll wrapper around the special workspace scroll layout.

### Application shell geometry

At >=1200px sidebar expanded = 216px, collapsed = 64px. From 768–1199px use 64px rail by default. Below 768px no permanent sidebar column.

```css
.form-app-shell {
  height: 100dvh;
  display: grid;
  grid-template-columns: var(--form-sidebar-width, 216px) minmax(0, 1fr);
  overflow: hidden;
}
.form-app-main {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.form-page-scroll {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
}
@media (max-width: 767px) {
  .form-app-shell { grid-template-columns: minmax(0, 1fr); }
}
```

Use a fallback height before 100dvh if required by supported browsers. Avoid body overflow locking except the selected app shell layout and currently open modal behavior. Navigating back to marketing must restore normal document scroll.

### Workspace geometry

Workspace header is fixed-size within layout, not `position:fixed`. Height 64px desktop, mobile minimum 56px and content can adapt at text zoom. Toolbar is 48px default. Chat column 320px >=1280px, 288px at 1100–1279px when room allows; below 1100px chat becomes a drawer/tab, not a squeezed column. Existing sidebar width counts toward available room.

```css
.form-workspace {
  flex: 1; min-height: 0; min-width: 0;
  display: flex; flex-direction: column;
}
.form-workspace-header { flex: 0 0 auto; }
.form-workspace-body {
  flex: 1; min-height: 0; min-width: 0;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
}
.form-chat {
  display: flex; flex-direction: column;
  min-height: 0; min-width: 0;
}
.form-chat-messages {
  flex: 1; min-height: 0; overflow-y: auto;
  overscroll-behavior-y: contain;
}
.form-chat-composer { flex: 0 0 auto; }
.form-preview-pane {
  display: flex; flex-direction: column;
  min-width: 0; min-height: 0;
}
.form-preview-toolbar { flex: 0 0 auto; }
.form-preview-scroll {
  flex: 1; min-height: 0; min-width: 0;
  overflow: auto;
}
```

Apply min-height:0 to every flex/grid ancestor between a constrained viewport and its intended scroll region. Applying it only to the last child is insufficient. Remove duplicate `h-screen`, hardcoded `calc(100vh - ...)`, absolute footers, and nested independent full-height wrappers when they conflict with this ownership model.

Preview document uses natural content height inside the preview scroll region. Do not make a second nested vertical scroller inside the generated page unless the specific page needs an internal table or panel. Desktop preview fits available width. Tablet/mobile preview modes use controlled widths; when a requested width exceeds available space, either fit with a clearly indicated width or allow horizontal scrolling only inside the preview frame. Never hide overflow globally to conceal layout bugs.

Chat auto-scroll only when user is near the bottom (within 80px) or has just sent a message. If user is reading older messages, show “New message” instead of forcing scroll. Composer stays in layout, has safe-area bottom padding, supports multiline input up to 160px then internally scrolls. Test with virtual keyboard/manual mobile testing where available. Do not claim desktop emulation proves mobile keyboard behavior.

## 5. Sidebar: explicit interaction contract

Maintain two separate states: desktop collapse and mobile drawer open. Never use one boolean for both. This section overrides any earlier ambiguous sidebar close behavior.

| Situation | Required behavior |
|---|---|
| Wide desktop default | 216px expanded sidebar |
| Desktop collapse button | Switch to 64px icon rail; main column gains space |
| Desktop expand button | Restore 216px; no content overlap |
| Tablet default | 64px rail; labeled tooltips, optional expanded overlay if implemented consistently |
| Mobile default | Drawer closed, no invisible overlay or reserved sidebar width |
| Mobile menu button | Open 272px drawer, width capped at calc(100vw - 48px) |
| Mobile X button | Close drawer and restore focus to menu trigger |
| Escape | Close drawer |
| Backdrop click | Close drawer |
| Navigation selection | Navigate and close drawer |
| Resize mobile → desktop | Remove drawer/backdrop and clear temporary scroll lock |
| Resize desktop → mobile | Start closed; retain desktop preference separately |

Use an accessible dialog/sheet primitive already installed when possible. Closed drawer content must not capture focus or pointer events. Prefer proper unmounting or the primitive's visibility behavior; translateX alone does not make a drawer inaccessible.

Mobile drawer focus is trapped while open. Background is inert through the dialog mechanism; do not manually leave `aria-hidden` on the app after close. Restore focus unless navigation has deliberately moved focus to the new page heading. Body scroll lock cleanup must run on close, unmount and breakpoint transition.

Inside sidebar: brand 64px-high top; nav with 8px padding, 44px link hit areas, 8px gaps; bottom account area with divider and minimum 64px. Nav region flexes and scrolls if necessary. Do not absolutely pin the account menu over navigation.

Z-index ladder, not arbitrary escalating numbers: normal 0, sticky header 20, dropdown 40, drawer backdrop 50, drawer 60, modal backdrop 70, modal 80, toast 90. Dialog primitives can encapsulate the values. Avoid transformed ancestors that create unexpected stacking contexts. Nested menus must remain above their containing dialog.

Each icon control has a real accessible name such as “Collapse sidebar,” “Expand sidebar,” “Open navigation,” or “Close navigation.” No ambiguous three different hamburger buttons.

## 6. Landing page: exact repaired composition

Retain the original content and real CTA routes. Improve geometry without inflating claims.

Header 72px desktop / 64px mobile. Container max-width 1200px; gutters 40px desktop / 24px tablet / 20px mobile. Left FORM; center Product / How it works / Pricing; right Log in / Start building. On mobile hide center navigation inside menu. Header items must never wrap onto two messy rows.

Hero uses dark surface. Desktop top/bottom padding 72px/80px. Two columns `minmax(0, .95fr) minmax(0, 1.05fr)`, gap 48px. At <1024px stack, gap 40px. Left heading max-width 520px; eyebrow 12px; 20px gap to heading; 24px gap to body; body max-width 440px; 28px gap to CTA row; 16px gap to small note.

Exact headline: “Good products start with a clear form.” Let typography and width determine wrapping; target three lines desktop, roughly three mobile. Heading 64/52/40px per type table. Primary CTA warm-white with black text. Secondary text/button visible on ink. No heading larger than 64px.

Product stage is a real shared sample, explicitly labeled. Width 100% of column; outer frame min-width:0, radius20. Header 40px; content display height approximately 360px desktop / 280px mobile. Simplify mobile mockup to a readable preview, not a miniature three-column app. No mockup text below 11px; essential explanatory content outside the mockup remains >=14px. Do not use CSS transforms to shrink the entire real application into a tiny card. Visual crop is allowed only for this marketing stage, with no hidden essential content or controls.

The stage does not float over the heading or CTA. No image required. Use the actual renderer or small explicit illustrative composition; no fake generated success story.

Below hero: ivory explanation strip with three ruled columns. On mobile stacked ruled rows. Section title max-width 680px. Feature rows alternate text and useful UI detail, gap48 desktop /24 mobile. Pricing uses equal-height aligned cards, each explicit light surface/foreground. Middle plan emphasis is a black top rule—not white text on a light selected card. All sample prices retain illustrative label.

Footer has full accessible links, readable contrast, mobile stacked groups. No empty link, dead CTA or fake subscription form. Anchor clicks must expose section heading below sticky header.

## 7. App screens: fixed composition

### Project library

Max content width 1200px. Header row title/subtitle left, New project right; stack on mobile. Title28/24px. Search under header with 24px gap, width min(320px,100%). Sort control adjacent, wraps naturally below 480px.

Grid: three cards only when each has >=280px available; two when >=280px each; otherwise one. Use CSS grid sizing based on available content width, not viewport alone. Gap24. Card image preview ratio16/10, border-bottom, body padding20. Project title16px, metadata12px. Card opens project; overflow action button is not nested inside a button/link that produces invalid interactive nesting. Rename/delete menu can be reached with keyboard.

No inflated app title or blank decorative statistics row. Empty state max-width480px, title24px, one paragraph, one main action.

### New project

Max-width1000px. Form/support columns `minmax(0, 640px) minmax(240px, 1fr)`, gap32; stack below1000px. Guidance panel can follow form mobile. Inputs have labels above them, help/error below, 8px gaps; field groups24px apart. URL 48px tall. Description textarea minimum140px, resize vertical where appropriate. Analyze button48px. Loading never changes button width.

Validation messages don't overlay inputs. Invalid form focuses first invalid field. Long provider errors wrap into an error panel. Typing, autofill and reload behavior must preserve the intended ownership/persistence rules.

### Analysis / Overview

Main reading width max860px; pad24 desktop /16 mobile. Source row includes domain, timestamp, capture status; wraps cleanly. Screenshot tile width180px desktop, full width capped360 mobile. Headline24px maximum inside this view. Use sections with thin dividing lines and 24px spacing; body14px with line-height1.65. Lists are rows, not dozens of unrelated cards.

Observed/Inferred/Unknown chips have explicit color pairs. Evidence opens a drawer/dialog with readable excerpts. Build button in a non-overlapping footer row; add sufficient bottom content padding if any footer is sticky. At 200% zoom prefer normal flow over a sticky obstruction.

### Preview and chat

Toolbar controls may wrap into two intentional rows on narrower layouts; don't overflow or hide controls under absolute positioning. Page selector min-width120px but max-width available. Version selector uses short “v3” in tight mode with accessible full label. Device controls can collapse to one select on narrow screens. Export belongs in project header, not duplicated in every toolbar.

Chat assistant text uses host panel foreground; user messages use muted surface. Markdown headings inside chat are capped at18px, not marketing h1. Code blocks have explicit dark background and light foreground with internal horizontal scroll. Long prose wraps. Errors appear inline with Retry and preserve the preceding transcript.

Below768px show Overview / Preview / Chat / Activity as clear tabs. Only the selected panel is active/focusable. Preserve each panel's state when appropriate; do not submit new jobs from remount effects. Code/export available from menu. Selected tab indication must survive light/dark region differences.

### Settings and auth

Preserve working auth logic. Shared styling fixes must be regression-tested there. Settings form width max640px; no unused billing/team sections. Popovers, reset forms, confirmation alerts and toast text need explicit surfaces too.

## 8. Component state contract

| Component | Default | Hover / focus | Busy / disabled | Error / expanded |
|---|---|---|---|---|
| Primary button light | Ink + white,48px | #292929 hover; visible focus ring | Same dimensions; spinner + label; disabled explicit pair | Failure outside button, retry possible |
| Inverse primary | Ivory + ink | Slightly darker ivory; visible focus | Explicit disabled pair | No foreground inheritance |
| Secondary button | White + ink + border | Muted fill; focus ring | Muted + readable gray | — |
| Ghost icon | Transparent with region foreground | Region-appropriate subtle fill | aria-disabled/disabled correctly | Accessible label,44px hit region |
| Input/textarea | White + ink, border | Border darker;2px focus outline with offset | Remains readable; not merely opacity .3 | Error border plus linked error text |
| Select/popover | White + ink regardless of trigger region | Highlight with muted fill | Disabled items labeled | Escape closes, selection closes |
| Tabs | Secondary text | Darker text / focus | No content mutation | Selected foreground + bottom rule |
| Dialog | White + ink | Focus contained | Actions show progress | Body scrolls, close always reachable |
| Toast | Explicit panel/status pair | — | Duration suitable for message | Error not communicated only by color |
| Skeleton | Muted shapes | — | Reduced-motion aware | Never disguises permanent failure |

Use `type="button"` for non-submit buttons inside forms. Enter submits only intended forms; Shift+Enter inserts newline in chat. Ignore Enter submission during IME composition. Prevent duplicate requests at both UI and server levels. Use native disabled semantics where applicable. Links navigate; buttons act.

Focus style: visible 2px outline with2px offset, palette-appropriate contrast. Do not remove outline without an equivalent. Test actual ring against dark and light regions. Motion140–200ms, reduced-motion support. No `transition:all` on layout-heavy containers.

Dialog max-width560px, width calc(100vw - 32px), maximum height calc(100dvh - 32px). Header/footer flex-shrink:0, body min-height:0 overflow:auto. Mobile full-height sheets may be used, with safe-area padding and reachable close control. Long validation content must never push all action controls outside reachable scroll area.

## 9. Generated product theme isolation

The host UI and generated page are different visual systems. Each renderer root declares scoped foreground, background, secondary text, border, action foreground/background, and input pairs. Namespace variables `--product-*`, not host `--background` overrides.

Every generated hero/panel/button/field chooses matching theme pairs. Nested light cards in a dark generated page explicitly reset their foreground. Each approved preset must render all section types; test the full registry, not just one hero.

Generated page heading is sized relative to its container: approximately48px on wide preview,36px tablet,30px mobile. Container queries control stacking and heading sizes; viewport media queries alone will fail when preview is390px inside a1440px browser. Do not style arbitrary AI strings as CSS class names. The spec uses enums mapped to reviewed classes.

Switching generated themes must not change sidebar, chat, menus, dialogs or FORM landing page on subsequent navigation. Export styles must remain equivalent to the preview for the same version. Don't fix preview-only rendering by breaking code export parity.

## 10. Functional correctness repair boundaries

Verify these behaviors while correcting UI:

- One click creates at most one project/job; retry does not duplicate completed work.
- Sidebar interaction never submits a nearby form.
- Changing tabs/device mode/version selector never triggers a new paid generation.
- Saved indicator reflects actual acknowledgement, not a timeout animation.
- Failed edit leaves last good preview visible.
- Browser refresh rehydrates persisted state and resumes active job observation.
- Error and loading states recover; no spinner remains forever after terminal failure.
- Selecting an older version doesn't silently overwrite the current one.
- Switching projects doesn't display late responses from the previous project.
- Deleting a project prevents stale jobs from repopulating the visible page.
- Chat scrolling does not alter messages or lose unsent text when changing view.
- Popover/drawer teardown removes focus traps, overlays and scroll locks.
- Authentication/authorization remain intact; never bypass protected routes for screenshot convenience.

Run unit/integration tests for the relevant state transitions and real browser tests for behavior. Do not add brittle tests that assert arbitrary CSS class strings.

## 11. Required repair sequence and gates

### Gate A — Reproduce and inventory

Produce baseline route/state screenshots. Fill bug table. Identify CSS/theme authority and actual scroll ancestors. Gate passes when each reported defect is reproduced or specifically marked not reproduced with attempted steps.

### Gate B — Foundations

Fix semantic color pairs, global style leakage and type scale. Render buttons/inputs/popovers/status panels on both light/dark regions in a development-only component gallery or test harness. Check computed colors and contrast. Ensure the harness is not an unrelated public feature.

### Gate C — Shell and overlays

Fix grid/flex constraints, scroll ownership, sidebar close/collapse/responsive states, focus/overlay cleanup. Test expanded/collapsed/closed/open with real interactions and viewport resizing. No content page can lose scrolling after using a drawer.

### Gate D — Screens

Repair landing, library, new project, analysis, preview, chat, code, activity and settings. Preserve working signup/login. Use real data or clearly labeled deterministic test fixtures for reproducibility; verify live data separately.

### Gate E — Generated themes

Render each allowed section type in each theme at desktop and mobile container widths. Verify action contrast, long copy, navigation and export parity.

### Gate F — Regression and evidence

Run typecheck/build plus relevant unit/integration/E2E tests. Inspect final screenshots against the baseline. Fix observed failures and repeat affected checks. Finish only with an honest completed/failed/blocked matrix.

## 12. Browser test matrix

Use the project's installed Playwright/browser tools and documentation matching their versions. Prefer semantic roles and accessible names; stable test IDs only where semantics cannot distinguish a region. Keep fixtures deterministic. Use polling assertions, not arbitrary long sleeps. Preserve traces/screenshots on failure.

| Viewport | Mandatory coverage |
|---|---|
| 1440×1000 | Landing, expanded/collapsed sidebar, full workspace, modals |
| 1280×800 | Dense workspace, toolbar/composer/scroll constraints |
| 1024×768 | Rail layout, stacked or drawer chat, no squeezed three-column UI |
| 768×1024 | Tablet boundary, navigation and preview behavior |
| 390×844 | Full mobile journey, drawer, tabs, dialog, forms |
| 360×740 | Narrow mobile, long labels, CTA wrapping |
| 1440×700 | Short-height desktop, bottom content and composer reachable |

Additionally test actual browser zoom200% on representative desktop views. A reduced viewport alone is not proof of text-zoom compatibility. Test keyboard-only paths and prefers-reduced-motion. If a browser engine/platform isn't tested, say so; Chromium success is not Safari proof.

### Required behavior cases

1. Open landing; click every header/hero/footer CTA and anchor. No missing route or hidden anchor heading.
2. Sign up/login/logout/reset where a test environment permits. Validate error text remains readable.
3. Open mobile nav; close by X, backdrop and Escape separately. Reopen after each. Navigate to a page and verify drawer closed. No invisible overlay remains.
4. Collapse desktop sidebar; use rail links/tooltips; expand again. Resize across768/1200px while nav is open. Main content width updates.
5. Fill project form; trigger validation; submit once; trigger provider failure through controlled test interception; recover without losing input.
6. Load long analysis; scroll to final section and Build button; open evidence and close it; confirm scrolling still works.
7. Populate chat with at least30 varied messages; reach top/bottom; type multiline text; receive message while scrolled up; verify no forced jump.
8. Scroll generated long page to footer while chat remains independent. Scroll chat while preview remains independent.
9. Switch desktop/tablet/mobile preview; verify actual layout changes based on container. Click navigation and generated actions.
10. Run required chat edits in live integration smoke or controlled fixtures; verify UI updates and reload persistence; separate mock/live evidence.
11. Open long modal and select menu; tab through; Escape; ensure focus restoration and no trapped background afterward.
12. Export current/older version as supported; verify button progress, error and download states; no unintended new generation.
13. Navigate workspace→landing after drawer/modal use; document scroll works.
14. Display long project names, unbroken URLs, empty projects, empty search, no screenshot, long errors, pending/cancelled/failed jobs.
15. Navigate away during request then back; no stale result overwrites a different project's screen.

## 13. Geometry, contrast and screenshot checks

### Do not confuse different verification types

- A screenshot saved is not a screenshot inspected.
- An image diff detects change, not beauty or correctness.
- Axe catches many accessibility issues, not every visual defect.
- Build passing does not prove UI interactions work.
- A self-assigned score is not an independent review.

### Geometry assertions

At each key viewport assert document scrollWidth <= clientWidth +2px unless a deliberately documented layout requires otherwise. If this fails, identify the offending element; do not solve by global overflow-x:hidden.

For named scroll regions, verify long content produces scrollHeight > clientHeight, scrollTop can change, and bottom content becomes reachable. Note that short content need not overflow; tests must load enough content.

Check bounding boxes: composer stays within workspace; mobile drawer within viewport; close button visible/clickable; dialogs' action row reachable; toolbar doesn't overlap preview; sidebar/account rows don't overlap. Use small1–2px tolerances for rendering differences. Do not require exact text line breaks across platforms when font rasterization differs.

### Contrast assertions

Run axe on every representative route/state. Inspect computed foreground and effective background for headings, body, secondary text, inputs, placeholders, buttons, selected tabs, menus, toast, error and generated preview. Account for inheritance, opacity, ancestor backgrounds and gradients; comparing two raw CSS values alone may miss actual compositing.

Explicitly verify light panel in dark hero/sidebar context and portaled menus. Test theme defaults under both OS light/dark preferences to confirm host color pairs remain stable.

### Visual review checklist

- Header/hero/content share alignment lines.
- Heading doesn't overwhelm form or workspace.
- Clear distinction between page title, panel title and body.
- No accidental white-on-white/black-on-black content.
- Panels have intentional padding and consistent rules.
- Main action is identifiable without bright decorative clutter.
- Preview is readable, not a tiny desktop screenshot.
- Errors fit naturally and don't cover controls.
- Mobile layouts reorder deliberately rather than shrink indiscriminately.
- No visible clipping, stale overlay or content collision.

After human/agent visual inspection approves a screenshot, it may become a regression baseline. Never automatically accept new snapshots just to turn tests green. Freeze fixtures, fonts and animations for meaningful comparisons. Keep visual diffs separate from live-provider smoke tests.

## 14. Evidence deliverables and completion gate

Save evidence in repository paths such as:

```
docs/UI_REPAIR_PROGRESS.md
docs/UI_BUGS.md
docs/UI_QA_REPORT.md
artifacts/ui/before/
artifacts/ui/after/
artifacts/ui/traces/
```

Avoid committing secrets, session state or identifiable user content in traces. Use test data. Heavy artifacts may be CI uploads rather than repository commits; record actual locations.

Bug log columns: ID / route / viewport / reproduction / root cause / changed files / verification / status. Distinguish reported, reproduced, fixed, verified and blocked.

Final report must include:
1. The original reported failures and the evidence for their resolution.
2. Screens/routes/viewports actually inspected.
3. Exact test commands and results, including failures.
4. Before/after screenshot paths.
5. Live integration checks separately from mocked browser tests.
6. Remaining defects, browser gaps and account/credential blockers.
7. Tested commit identifier if available.

Do not conclude until no observed blocking UI defects remain: unreadable content, inaccessible essential controls, stuck navigation, trapped essential content, broken auth, or broken core project flow. If blocked externally, state exactly what remains unverified. Do not describe untested behavior as perfect.

## 15. Master repair prompt — paste into the coding agent

Read `docs/PRD.md` and `docs/UI_REPAIR.md` completely. You are repairing the existing FORM application. Signup/login already work. Reported failures include foreground/background collisions, oversized typography, sidebar failing to close, collapsing panels, and trapped scrolling.

Do not rebuild the repository. Inspect the actual code, launch the app, reproduce the failures, and capture baseline screenshots. Follow UI_REPAIR.md over the original PRD when their UI sizes/layouts conflict. Preserve backend contracts, auth and working features.

Work through its gates in order: audit → semantic surface pairs/type scale → shell/scroll/overlay state → screens → generated theme isolation → regression evidence. Fix shared root causes, not isolated symptoms. Do not use global overflow hiding, blanket text colors, !important chains or removed tests to conceal defects.

Use the exact specified palette pairings, bounded typography, spacing, responsive rules, desktop collapse/mobile drawer state machine, and scroll-owner relationships. Review actual screenshots after rendering; merely saving them is insufficient. Every button, menu, dialog and scroll region must behave correctly.

Run the browser test matrix, keyboard checks, contrast checks, geometry assertions and core functional regressions. Keep live-provider tests separate from mocks. Never claim success for inaccessible browser tools or missing credentials.

Maintain the bug log and progress file. Continue through all unblocked phases autonomously. Do not stop after a plan or a landing-page cleanup. At completion provide concrete defects fixed, affected files, before/after evidence, tests actually run and remaining limitations. Begin by reading the files and auditing the existing app now.

## 16. Follow-up prompt if the agent stops after cosmetic changes

The task is not complete. Reopen `docs/UI_REPAIR.md` and audit the actual implementation against every gate. Do not add decoration. Reproduce the remaining sidebar, scroll, color, typography and interaction defects with the browser. Identify the responsible state/CSS ancestors, make targeted fixes, and verify the changed behavior. Show actual evidence for every item marked passed. Preserve working auth and backend. Continue until the complete repair and verification matrix is resolved or explicitly blocked by a real external dependency.

## 17. UX architecture: make the product understandable before making it decorative

This section is mandatory. The owner explicitly reports that the implementation lacks coherent UX and meaningful visual separation. Do not treat the task as recoloring existing boxes. Repair the information hierarchy and user journey while preserving functional contracts.

### Five questions every screen must answer

1. Where am I? A clear page title/breadcrumb and selected navigation state.
2. What am I looking at? Plain labels distinguishing source analysis, proposed product, generated preview and saved version.
3. What can I do next? One dominant next action appropriate to the current state.
4. What happened after my action? Visible progress followed by a concrete result, not only a toast.
5. Can I recover? Retry, cancel, return, version restore or clear validation as appropriate.

A screen that fails these questions is not done even if all CSS matches the tokens.

### Three layers with different visual roles

**Layer A — FORM navigation:** dark outer sidebar and small project identity/header. Its job is orientation. It must stay visually stable while projects/themes change. Navigation has low visual noise and no project analysis inside it.

**Layer B — Authoring controls:** light/ivory panels for brief, chat, page/version selection and export. Their job is user control. Compact type, visible labels, quiet separators and stable control placement.

**Layer C — Generated product:** distinct preview canvas containing the actual generated UI. Its job is inspection. Separate it from authoring controls with a frame, background gutter and page toolbar. Generated navigation must not be mistaken for FORM navigation.

Do not give these three layers identical dark backgrounds, identical card styling, or equal visual weight. The user should immediately recognize which menu changes FORM and which menu changes the generated product.

### Proximity and grouping rules

Related things are8px apart; items within a functional group12–16px; separate groups24px; major sections32–40px. A24px gap must indicate a stronger boundary than8px. Do not use random spacing that makes unrelated labels appear connected.

Keep field label, input, helper and error as one group. Keep page selector/device mode/version as one preview-control group. Keep export separate from destructive actions. Keep status next to the object it describes. Never put a global success toast where a persistent project-specific result is needed.

Use a divider only when separating different tasks or contexts. A border around every sentence destroys hierarchy. Use surface contrast for major regions, spacing for groups, typography for hierarchy, and borders sparingly for boundaries.

### Hierarchy rules

One main page heading. One primary action per active task region. At most two visually prominent actions in the initial viewport. Do not make Analyze, Build, Export, Upgrade and New project equally strong at once.

Project header and preview toolbar are utility, so they stay smaller than actual content. Chat should feel like an editing tool, not a competing full-screen chatbot. Preview gets the most area after a successful build. Analysis gets the most area before the first build.

Maintain familiar placement: global navigation left/top; project identity top-left; save/export top-right; preview controls directly over preview; chat composer at bottom of chat; destructive actions in an explicit menu/confirmation. Do not move the main action between random corners on state changes.

## 18. End-to-end UX state map

| Product state | Main content | Dominant next action | Secondary action | What must be hidden or disabled |
|---|---|---|---|---|
| No projects | Clear empty state with outcome explanation | New project | Explore example | Empty analytics and meaningless filters |
| New project form | URL, goal, audience | Analyze website | Back to projects | Build/export/version controls |
| Analysis queued/running | User brief + actual stage progress | Cancel request if supported | Return to projects | Duplicate Analyze submission |
| Analysis failed | Brief retained + actionable error | Retry analysis | Change URL/paste source | Fake completed results |
| Analysis ready, no version | Findings, source evidence, MVP recommendation | Build my product | Edit brief | Export enabled without a version |
| Build running | Analysis retained + generation progress | Cancel request if supported | Read analysis | Empty white preview presented as completed |
| First version ready | Working preview + compact completion receipt | Refine with chat | Export starter | Obsolete initial build CTA |
| Edit running | Last good version + pending request | Cancel request if supported | Inspect existing preview | Duplicate conflicting edit |
| Edit ready | Updated preview + specific change receipt | Continue refining | View changes/Undo | Generic success-only feedback |
| Viewing old version | That version + visible historical label | Restore as new version | Return to latest | Ambiguous 'Saved' implying this is current |
| Export ready | Current preview + artifact state/version | Download starter | Continue editing | Unrelated upgrade modal |

Disable rather than hide a temporarily unavailable control when its stable location helps orientation; hide features that have no relevance yet. Explain disabled Build when source analysis is not ready. Do not fill initial empty screens with disabled controls for future tasks.

Browser Back must have sensible meaning. Put selected workspace tab/page/version in URL where specified. Return to project list should preserve search/sort where practical. Do not hijack Back with modal history tricks. Use local draft state for unsent chat and in-progress forms, without changing durable ownership rules.

## 19. Screen compositions with explicit attention order

### A. Landing: convince through product clarity

Attention order: value proposition → working-product illustration → main CTA → explanation → deeper proof of capability → sample pricing.

The visitor must understand within the first viewport that the input is a website URL plus a goal, and the output is a product direction and editable interface. If the artistic headline does not make this clear by itself, the supporting sentence must. Do not bury the explanation below the fold.

Hero text and stage should occupy similar visual mass, with text slightly dominant. Dark hero is one continuous surface. CTA warm-white; secondary link understated. Do not make a tiny neon badge the brightest object. Avoid adding a second floating form over the mockup.

Use informative sample labels: 'Source website', 'Product brief', 'Preview'. Mockup content should demonstrate the actual task, not display random SaaS metrics. No repeated 'AI-powered' labels needed.

### B. Project library: help recognize and resume

Attention order: project title → latest preview thumbnail → status/domain → updated time → overflow actions. New project is the main page-level action. Thumbnails must be visually distinct if projects differ, but labels remain readable without them.

Use meaningful status copy: 'Not analyzed', 'Analysis ready', 'Building', 'Preview ready', 'Needs attention'. Avoid exposing raw backend states like `pending_generation_v2`.

Show error state on the affected project card, not a global red banner for every project. Rename is an inline-sized dialog; Delete is secondary/destructive and requires confirmation. Do not use red for normal remove-filter actions.

### C. New project: reduce uncertainty

Heading 'What are we building from?' then one sentence 'Add a public website and tell us who your version should serve.'

Field order URL → goal → audience → optional name. Avoid requiring users to understand models, tokens, pipelines or framework choices. Helpers give examples, not paragraphs. Right panel explains outputs in three lines. The actual form gets most width and attention.

Analyze button at end of form, aligned left on desktop and full width mobile. Never put it far away in a top-right toolbar disconnected from inputs. Explain errors at field or form level. Do not use a modal for every validation failure.

### D. Analysis: support a decision

Above-the-fold order: source identity → one-paragraph existing-product summary → who/problem → next recommended direction. Detailed evidence is accessible through progressive disclosure.

Display an optional 'Recommended direction' summary derived from existing analysis, not another expensive model call. It should connect the user's audience to the proposed MVP in2–3 sentences. Do not invent new facts to populate it.

Use compact evidence links on relevant claims; expand excerpts on demand. Keep the main reading view free of raw JSON and verbose model rationale. Facts and recommendations have clear headings. The Build CTA follows the proposed MVP so the user understands what will be built.

Do not force the user to approve every feature with checkboxes unless that interaction already has a supported product requirement. This assessment needs a clear path to generation; avoid adding a requirements-management application.

### E. Workspace: prioritize inspection and intentional editing

After build, preview occupies roughly65–75% of authoring body width where space permits; chat/brief gets the rest. Avoid a third permanent inspector pane.

Project header: left breadcrumb/name; right save state and Export. Preview toolbar: left page selector; right device mode and version. QA status can be a compact labeled button opening the report, not a permanent large panel reducing preview area.

Chat welcome text refers to the actual generated project: 'Your first version is ready. Tell me what you want to change.' Three suggestions maximum. No ten-item suggestion grid. Once conversation starts, remove the large welcome block.

Prompt 'Add a dashboard' must visibly lead to a new page available in the page selector. After completion, offer 'Open dashboard' in the change receipt. Do not force-scroll/change the user's inspected page if they are actively reading another page; make the transition discoverable and intentional.

After removing the currently selected page, select a valid remaining page and explain the change. Never leave a broken preview because the URL references a removed page.

### F. Export: set accurate expectations

Export action opens a concise panel/dialog if needed: selected version, framework, what is included, prototype limitation, Download. Do not ask for irrelevant configuration. Successful export identifies file/version. Download failures retain export availability and offer Retry.

Label 'Frontend starter' where necessary so users understand that FORM's own auth/database are not included as a magically generated production backend. Accurate expectations are part of usable UX.

## 20. Feedback, trust, and recovery language

Use direct, specific microcopy. No apology paragraphs, unexplained codes, or overly cheerful failure messages.

| Situation | Preferred copy |
|---|---|
| Reading source | Reading website content… |
| Source complete | Website content captured |
| Visual partial failure | Text analysis is ready. We couldn't analyze the screenshot. |
| LLM stage running | Preparing your product direction… |
| Build complete | Your first version is ready. |
| Edit complete | Updated navigation and added a dashboard. |
| Edit failed | This change couldn't be completed. Your previous version is safe. |
| Save failure | Changes weren't saved. Retry saving. |
| Source blocked | We couldn't read this page. Try another public URL or paste its content. |
| Quota reached | Today's generation limit has been reached. You can still view and export saved work. |
| Empty version history | Your first saved version will appear here. |
| Old version selected | Viewing version2. Latest is version4. |
| Cancel pending | Cancellation requested. This may take a moment. |

Use 'Saved' only on actual persistence. Do not show a spinner for completed background work because of a stale effect. Progress uses actual stages, not fake thought streams or percentages. If duration is unknown, don't display an invented countdown.

Successful edits produce a small persistent receipt in chat. Toasts are supplementary. Failed inline actions show recovery beside the failure. Focus does not jump to every toast. Completion announcements use polite live regions.

For reversible actions offer Undo when supported. For irreversible deletion, make the exact consequence explicit and require confirmation. Do not require confirmation for every navigation or ordinary edit.

## 21. Usability validation beyond screenshots

Run these task-based checks after visual repairs. Record observed behavior, not a made-up usability score.

### Task1 — Orientation

Open a saved project. Can a reviewer identify the project name, source website, selected generated page and current version without opening menus? If any are missing, add a quiet explicit label. Do not make all labels equally prominent.

### Task2 — Discoverability

Starting from project library, can the reviewer find New project, enter a URL and reach Analyze without hunting through menus? Are goal/audience examples useful? Is the next action apparent after analysis?

### Task3 — Change confidence

Send a supported edit. Is it obvious which version is being changed, whether it is running, what changed, and how to inspect/undo it? Can the reviewer keep using the existing preview while waiting?

### Task4 — Layer clarity

Can the reviewer distinguish FORM navigation from generated navigation? Click both and observe whether results match their labels. Fix identical treatment or confusing placement.

### Task5 — Failure recovery

Trigger a source/AI/save failure in controlled testing. Can the reviewer recover without retyping all inputs or losing the last good product? Do not mask the error by navigating away.

### Task6 — Mobile completion

Complete the essential flow at390px. The user must not need desktop-style simultaneous panels. Open chat, send edit, return to preview, inspect new page, export. Verify state preserved between tabs.

### Task7 — Long-content resilience

Use a180-character project title, long URL,1500-character error, multiline message and long generated page. Does layout preserve reading and actions? Is truncation used only for compact identity/meta, never essential result content?

### Task8 — Keyboard and focus

Complete a representative flow without a mouse. Focus order follows visual task order. Closed panels disappear from tab order. Validation links errors to inputs. Dialog close restores a meaningful focus target. Menu selection doesn't strand focus on a removed DOM element.

These checks are practical engineering/usability inspection. They are not a substitute for independent user research; do not claim users tested it unless actual people did.

## 22. Stronger master command incorporating UX

Use this command instead of section15 when starting the repair:

Read `docs/PRD.md` and the complete `docs/UI_REPAIR.md`. You are responsible for repairing both the visual system and the usability of the existing FORM application. The current app has working authentication but reported foreground/background collisions, oversized text, broken sidebar behavior, collapsing panels, trapped scrolling and weak information hierarchy.

Do not merely recolor components. Audit the user journey and implement the explicit UX architecture in sections17–21: separate FORM navigation, authoring controls and generated content; give every product state a clear next action; group related information; disclose details progressively; make edits and failures understandable and recoverable.

Inspect the repository and actual app before editing. Preserve working auth, data and integrations. Capture baseline screenshots and reproduce reported issues. Do not rebuild from scratch or replace real functionality with mocks.

Treat UI_REPAIR.md as authoritative for conflicting presentation rules. Follow its exact color pairings, bounded type scale, geometry, sidebar state machine, scroll ownership, responsive composition and component states. Correct root causes before screen-level fixes. No global overflow hiding, blanket colors, !important escalation, disabled verification or fake success labels.

Execute every repair gate in order. Inspect actual desktop/mobile screenshots and operate the app with browser tools. Run the behavior matrix, contrast/geometry checks, keyboard checks, long-content cases and task-based usability review. Distinguish live integration results from fixtures. Keep the bug log and evidence updated.

Do not stop after cosmetic changes or a passing build. Continue until the defined UI/UX and regression criteria are met, or a real external dependency is clearly identified. Report concrete fixes, actual evidence, tested viewports, remaining limitations and the tested commit. Never promise unverified perfection. Begin the repository and browser audit now.
