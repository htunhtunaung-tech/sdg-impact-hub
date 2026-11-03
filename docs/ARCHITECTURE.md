# SDG Impact Hub — System Architecture

## 1. Overview

SDG Impact Hub is a single Next.js 15 (App Router) application that serves both the UI and the API. Server Components read
from PostgreSQL through Prisma; mutations go through **Server Actions** (with Next.js's built-in origin/CSRF checks) or a
small number of **Route Handlers** for streaming, file and download endpoints.

```
                   ┌──────────────────────────── Next.js app (Node runtime) ────────────────────────────┐
 Browser ──HTTPS──▶│ middleware.ts  (edge: session presence → redirect to /login for protected routes) │
                   │                                                                                    │
                   │ Server Components (pages)  ──▶ src/server/queries/*  ──┐                          │
                   │ Client Components ──▶ Server Actions src/server/actions/* ──┼─▶ Prisma ─▶ PostgreSQL │
                   │ Route Handlers  src/app/api/*  (assistant stream, upload,   │                          │
                   │                  files, search, calendar, CSV exports) ────┘                          │
                   │                                                                                    │
                   │ src/lib:  auth (Auth.js) · session/permissions (RBAC) · validation (zod)           │
                   │           rate-limit (Postgres) · storage · email · notify · gamification          │
                   │           recommendations · ai · impact-review                                     │
                   └───────┬─────────────┬───────────────┬───────────────┬──────────────────────────────┘
                           │             │               │               │
                    Google OAuth   SMTP (optional)  OpenAI API     Supabase Storage (optional)
                                                    (optional)     or local ./uploads
                    OpenStreetMap tiles + Nominatim geocoding (browser)
```

Every optional integration has a working fallback so the app is fully functional locally:

| Integration | Configured by | Fallback |
|---|---|---|
| Google sign-in | `AUTH_GOOGLE_ID/SECRET` | Button hidden; email + password only |
| Email | `SMTP_*` | Emails printed to the server console; dev UI shows verification/reset links |
| AI assistant | `OPENAI_API_KEY` | "Offline mode": deterministic answers built from platform data + seeded SDG knowledge |
| File storage | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Local `./uploads` directory |
| Maps | `NEXT_PUBLIC_MAP_TILE_URL` | OpenStreetMap public tiles |

## 2. Folder structure

```
prisma/
  schema.prisma            # normalized schema (31 models)
  migrations/              # SQL migrations
  seed.ts                  # 17 SDGs + realistic demo data
  data/sdgs.ts             # goal descriptions, targets, challenges, ways to contribute
src/
  auth.ts / auth.config.ts # Auth.js (credentials + Google), JWT sessions
  middleware.ts            # protects private routes
  app/
    page.tsx               # landing
    (auth)/                # login, register, verify-email, forgot/reset-password
    (app)/                 # authenticated shell (sidebar, top bar, mobile nav)
      dashboard/ sdgs/ projects/ volunteer/ impact/ challenges/ community/
      organizations/ u/[username]/ profile/ messages/ notifications/
      assistant/ settings/ help/ admin/
    certificate/[userId]/  # printable volunteer certificate
    api/                   # assistant, upload, files, search, calendar, exports, auth
  components/
    ui/                    # design-system primitives (button, card, field, dialog, tabs…)
    layout/ sdg/ projects/ volunteer/ impact/ community/ charts/ map/ forms/
  lib/                     # domain & infrastructure services (see diagram)
  server/
    actions/               # all mutations ("use server"), each validated + authorized
    queries/               # reusable read models
tests/                     # vitest unit tests
scripts/e2e-smoke.mjs      # Playwright end-to-end smoke test of the main flows
```

## 3. Database relationship design

```
User 1─1 UserProfile           User *─* SDGGoal          (UserSdgInterest — followed goals)
User 1─* Account (OAuth)       User 1─* EmailToken       (hashed verify/reset tokens)

Organization 1─* OrganizationMember *─1 User             (OWNER / ADMIN / MEMBER)
Organization 1─* Project
SDGGoal 1─* SDGTarget, EducationalResource, ImpactMetric

Project *─* SDGGoal            (ProjectGoal, one isPrimary)
Project 1─* ProjectMember *─1 User   (ORGANIZER / COORDINATOR / VOLUNTEER)
Project 1─* ProjectMilestone   (progress % derived from completed milestones)
Project 1─* ProjectImpactTarget *─1 ImpactMetric
Project 1─* VolunteerOpportunity 1─* VolunteerApplication *─1 User
Project *─* User               (SavedProject)

ImpactSubmission *─1 User, SDGGoal, Project?, VolunteerOpportunity?, reviewer User?
ImpactSubmission 1─* ImpactSubmissionValue *─1 ImpactMetric       (measured outcomes)

Achievement 1─* UserAchievement *─1 User
Challenge 1─* ChallengeParticipation *─1 User   (unique per period: day / ISO week / once)

DiscussionGroup 1─* GroupMember *─1 User
Post (POST | PROJECT_UPDATE | EVENT) *─1 User, Project?, Organization?, Group?, SDGGoal?
Post 1─* Comment, Reaction (one reaction per user per post)
Message (sender User → recipient User)    Notification *─1 User
Report (polymorphic target: POST, COMMENT, PROJECT, USER, ORGANIZATION, MESSAGE)
Activity (public/private activity log)    AssistantThread 1─* AssistantMessage
RateLimit (fixed-window counters shared by all server instances)
```

Conventions: cuid primary keys (SDGGoal uses the official goal number), `createdAt`/`updatedAt` on mutable tables,
`onDelete: Cascade` for owned children and `SetNull` for optional references, composite unique constraints for
membership-style tables, and indexes on every foreign key and filter/sort column (status, dates, city, xp…).

## 4. Roles and permissions

Global roles (`UserRole`): `INDIVIDUAL`, `STUDENT`, `VOLUNTEER`, `ORGANIZER`, `ORGANIZATION`, `ADMIN`. The first five are
self-selected identities; `ADMIN` can only be granted by another admin. Most authority is **resource-scoped**:

| Capability | Who |
|---|---|
| Browse goals, projects, opportunities, verified organizations | Everyone (incl. signed out) |
| Join projects, apply, record impact, post, message, react, report | Signed-in, verified, active users |
| Create a project | Any user — auto-published if created under a **verified** organization the user manages, or by an admin; otherwise `PENDING_REVIEW` |
| Edit project, milestones, team, progress reports, opportunities; review sign-ups; verify contributions to the project | Project organizer, project coordinators, owners/admins of the owning organization, platform admins |
| Verify own contributions | Nobody except admins |
| Manage organization team | Organization OWNER / ADMIN |
| Verify organizations, moderate projects & content, manage users & SDG content, platform reports | Admins |

Enforcement lives in `src/lib/permissions.ts` and is called from every server action and route handler; the middleware
only handles redirects. Suspended users are rejected at sign-in **and** on every request (`getCurrentUser`).

## 5. Impact integrity & gamification

* `ImpactSubmission.status`: `PENDING` (self-reported) → `VERIFIED` / `REJECTED` by a reviewer.
* Organizers can also confirm attendance after a session, which creates an organizer-verified record.
* Totals, project targets, badges, leaderboards, certificates and the landing-page figures use **verified data only**;
  self-reported hours are always shown separately and labelled.
* XP: verified entry = 10 + 10/hour (max 8 h counted) + 10 with evidence. Honour-system challenges are once per period and
  capped at 60 XP/day; evidence challenges earn XP only after verification. Plausibility checks: ≤ 24 h per day, no future
  dates, no duplicate submissions per session, only for projects/sessions the user actually belongs to.

## 6. Recommendation engine

`src/lib/recommendations.ts` is a transparent content-based scorer: followed goals (+3 each), skill overlap (+2 each),
distance from the user's pinned location (+3 within 25 km, decreasing), recruiting status, start date and spots left.
Each result carries human-readable `reasons`, which the UI displays. The AI assistant receives the top results as context.

## 7. Security

* Passwords hashed with bcrypt (cost 12); timing-equalised login; generic errors (no account enumeration on sign-up or reset).
* Email verification and password-reset tokens are random 256-bit values stored only as SHA-256 hashes, single-use, expiring.
* JWT sessions (HTTP-only cookies, 14 days) via Auth.js; DB re-check of user status on each request.
* Zod validation on every input; Prisma parameterised queries (raw SQL only via tagged templates).
* XSS: React escaping everywhere; assistant markdown rendered to React elements with an allow-list of link targets; strict CSP.
* CSRF: Server Actions' origin check; same-origin checks on mutating route handlers; SameSite cookies.
* Rate limiting in Postgres for login, registration, resets, posting, messaging, uploads, search, AI.
* Uploads: size limits, magic-byte sniffing (JPEG/PNG/WebP/PDF only — no SVG), random names, served with `nosniff`
  and a sandbox CSP; evidence files access-controlled to the submitter and reviewers.
* CSV exports neutralise spreadsheet-formula injection.
* Privacy: public/private profile, leaderboard opt-out, city-only location display, data export (JSON) and account deletion.
