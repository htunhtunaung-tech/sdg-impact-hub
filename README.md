# SDG Impact Hub

A full-stack platform that connects volunteers, students, universities, NGOs and organizations to work on the
**17 UN Sustainable Development Goals** — and measures the real-world impact honestly, separating **verified**
contributions from **self-reported** ones.

Built with Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Radix/shadcn-style components · Framer Motion ·
Recharts · Lucide · PostgreSQL · Prisma · Auth.js (credentials + Google) · Leaflet/OpenStreetMap · OpenAI (optional).

- Architecture, database relationships, permissions and security model: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Design source: the Figma file `SDG Impact Hub` (design tokens mirrored in `src/app/globals.css`)
- Live design system: every token and component with its states at [`/design-system`](http://localhost:3000/design-system)

## Features

| Area | What works |
|---|---|
| **Onboarding** | Four-step first-run flow (role → goals → skills → location) with progress stepper, validation and "skip for now"; answers feed recommendations immediately |
| **Auth & profiles** | Sign up, email verification, login, Google sign-in, password reset, profile photo, skills/interests, followed goals, roles, contribution history, public/private profiles |
| **Dashboard** | Verified hours, projects, people reached, goals contributed, SDG contribution bars, "what to do next", active projects with progress, upcoming sessions, personalised recommendations, level/XP/streak, community activity, achievements |
| **Explore SDGs** | All 17 goals with official colours, category filters, follow goals; per-goal pages with description, key targets, global challenges, ways to contribute, related projects, opportunities, resources, discussions and live verified stats |
| **Projects** | Browse with search/goal/location/status/sort filters and pagination, save for later, create/edit (goals, objectives, tasks, budget & funding, map location, dates, skills, impact targets, cover image), statuses Planning → Recruiting → Active → Completed, milestones, progress reports, team management, moderation |
| **Volunteer marketplace** | Filters (when / where incl. "near me" / skills / time needed / goal), list or map view, instant sign-up or approval-based applications, waitlists with auto-promotion, cancel spot, `.ics` calendar download with reminder, my sign-ups, schedule, organizer approval/rejection and attendance confirmation |
| **Impact analytics** | Time ranges, trends vs previous period, monthly chart (with table view), hours by goal, measured outcomes, recent contributions with Verified/Self-reported/Not verified labels, CSV export, leaderboard, printable certificate |
| **AI assistant** | Streaming chat with history; explains goals, recommends opportunities from live data, drafts project proposals, suggests solutions to local problems, builds action plans, explains how actions count. Works offline (no API key) with a data-grounded engine |
| **Gamification** | XP & levels from verified impact only, badges, daily/weekly/one-time challenges (evidence challenges verified before XP), streaks, leaderboards, certificates — with caps so quantity can't be farmed |
| **Community** | Feed (all/following/updates/events), posts & event announcements, reactions, comments, discussion groups, organization profiles, direct messages, notifications, content reporting |
| **Admin** | Platform analytics, moderation queue, project review, impact verification, organization verification, user roles & suspension, report handling (hide/suspend/dismiss), SDG content editor, CSV reports |

## Quick start (local)

**Requirements:** Node.js 20+ and PostgreSQL 14+.

```bash
cp .env.example .env
```

Edit `.env`: set `DATABASE_URL` to your database and `AUTH_SECRET` to a random string (`openssl rand -base64 32`).
If you need a local database:

```bash
createuser -s sdg -P   # password: sdg
```

```bash
createdb -O sdg sdg_impact_hub
```

Then install, migrate, seed and run:

```bash
npm install
```

```bash
npx prisma migrate deploy
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Open http://localhost:3000.

### Demo accounts

All seeded accounts use the password **`Password123`**.

| Role | Email |
|---|---|
| Volunteer (rich history) | `mya@example.org` |
| Project organizer (Water Aid Isan Network) | `somchai@example.org` |
| Organizer (Zero Waste Khon Kaen) | `dao@example.org` |
| Organization representative | `nok@example.org` |
| New student (empty state) | `ploy@example.org` |
| Administrator | `admin@sdgimpacthub.org` |
| Unverified (to test email verification) | `unverified@example.org` |

Without SMTP configured, verification and reset emails are printed in the server console, and in development the
sign-up / forgot-password screens also show the link directly.

## Environment variables

See [`.env.example`](.env.example). Only `DATABASE_URL` and `AUTH_SECRET` are required; everything else is optional
and has a working fallback:

| Variable | Purpose | If unset |
|---|---|---|
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google sign-in (redirect URI `{APP_URL}/api/auth/callback/google`) | Google button hidden |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Transactional email | Logged to console |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | Language-model assistant (OpenAI, or any OpenAI-compatible API such as Google Gemini's free tier) | Offline, data-grounded assistant (also used automatically if the AI provider is rate-limited) |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Supabase Storage for uploads (create a **private** bucket) | Local `./uploads` folder |
| `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION` | Map tiles | OpenStreetMap |
| `NEXT_PUBLIC_APP_TIMEZONE` | Timezone for event times | `Asia/Bangkok` |
| `APP_URL` | Absolute URL used in emails | `http://localhost:3000` |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `node scripts/e2e-smoke.mjs` | End-to-end smoke test of the main flows against a running, freshly seeded dev server (needs Playwright) |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` / `npm run db:reset` | Seed (wipes data!) / reset database |

## Deployment

1. Provision PostgreSQL (e.g. Supabase, Neon, RDS) and set `DATABASE_URL`.
2. Set `AUTH_SECRET`, `APP_URL`, `AUTH_TRUST_HOST=true` and any optional integrations.
3. Configure persistent file storage — **use Supabase Storage in serverless environments** (local disk is ephemeral there).
4. Build and migrate: `npm ci && npx prisma migrate deploy && npm run build`, then `npm start`
   (on Vercel: add `prisma migrate deploy` to the build command).
5. Use your own map tile provider for production traffic (OpenStreetMap's public tiles have a usage policy).

Do **not** run the seed script against production — it truncates all tables.

## Project notes

* **Honest impact.** Self-reported entries never contribute to totals, badges, leaderboards, targets, certificates or the
  public figures. Organizers verify contributions to their own projects (or confirm attendance); admins verify the rest.
* **Accessibility.** WCAG 2.2 AA: colour contrast follows the Figma notes (emerald-700 for small text; text on SDG colours
  always picks the higher-contrast of white or ink, ≥ 4.5:1 for all 17 goals), every field has a visible label and error text, status is never colour-only, keyboard-accessible dialogs,
  skip link, 44 px touch targets on mobile, and charts offer a table view.
* **Performance.** Dashboard charts are server-rendered SVG (no client JS); interactive Recharts charts are code-split with
  fixed-height placeholders (no layout shift). Animations respect `prefers-reduced-motion`.
* **Times** are stored in UTC and displayed in `NEXT_PUBLIC_APP_TIMEZONE`.
