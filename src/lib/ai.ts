import "server-only";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { recommendOpportunities, recommendProjects } from "@/lib/recommendations";
import { SDGS } from "@/lib/sdg";
import { formatDate, toNumber } from "@/lib/utils";
import type { CurrentUser } from "@/lib/session";

/** Env values pasted from Windows editors can carry stray quotes, spaces or CR characters. */
const env = (k: string) => process.env[k]?.trim().replace(/^["']|["']$/g, "").trim() || undefined;
const AI_KEY = env("OPENAI_API_KEY");
const AI_BASE_URL = env("OPENAI_BASE_URL");
const AI_MODEL = env("OPENAI_MODEL") || "gpt-4o-mini";
const IS_GEMINI = Boolean(AI_BASE_URL?.includes("generativelanguage.googleapis.com"));

export const aiEnabled = () => Boolean(AI_KEY);

/**
 * Any OpenAI-compatible provider works: set OPENAI_BASE_URL to use e.g. Google Gemini's free tier
 * (https://generativelanguage.googleapis.com/v1beta/openai/) instead of OpenAI.
 */
const openai = AI_KEY
  ? new OpenAI({ apiKey: AI_KEY, baseURL: AI_BASE_URL, maxRetries: 1, timeout: 60_000 })
  : null;

type ChatTurn = { role: "user" | "assistant"; content: string };

/** Collects the user-specific, platform-grounded context the assistant reasons over. */
export async function buildAssistantContext(user: CurrentUser) {
  const [interests, opps, projects, hours, pending] = await Promise.all([
    db.userSdgInterest.findMany({ where: { userId: user.id }, include: { goal: { select: { id: true, title: true } } } }),
    recommendOpportunities(user, 5),
    recommendProjects(user, 5),
    db.impactSubmission.aggregate({ where: { userId: user.id, status: "VERIFIED" }, _sum: { hours: true } }),
    db.impactSubmission.aggregate({ where: { userId: user.id, status: "PENDING" }, _sum: { hours: true } }),
  ]);
  return {
    name: user.name.split(" ")[0] ?? user.name,
    role: user.role,
    city: user.profile?.city ?? null,
    country: user.profile?.country ?? null,
    skills: user.profile?.skills ?? [],
    interests: user.profile?.interests ?? [],
    goals: interests.map((i) => i.goal),
    verifiedHours: toNumber(hours._sum.hours),
    pendingHours: toNumber(pending._sum.hours),
    opportunities: opps.map((o) => ({
      title: o.title,
      link: `/volunteer/${o.id}`,
      goal: o.goalId,
      org: o.organization?.name ?? null,
      when: formatDate(o.startsAt, { weekday: "short", day: "numeric", month: "short" }),
      where: o.isOnline ? "Online" : o.locationName,
      reasons: o.reasons,
    })),
    projects: projects.map((p) => ({
      title: p.title,
      link: `/projects/${p.slug}`,
      goals: p.goals.map((g) => g.goalId),
      where: p.isOnline ? "Online" : [p.city, p.country].filter(Boolean).join(", "),
      status: p.status,
      reasons: p.reasons,
    })),
  };
}

type Ctx = Awaited<ReturnType<typeof buildAssistantContext>>;

function systemPrompt(ctx: Ctx) {
  return `You are the SDG Impact Hub sustainability assistant. You help people understand the 17 UN Sustainable Development Goals, find ways to contribute, draft project proposals and action plans, and understand how individual actions connect to SDG targets.

Rules:
- Be practical, warm and concise. Use short paragraphs, "##" headings and "-" bullet lists. Use **bold** sparingly.
- Ground recommendations in the platform data below. Link to platform pages with markdown links exactly as given, e.g. [Title](/projects/slug). Never invent platform links.
- Be honest about impact: never describe self-reported or estimated contributions as verified. Say "estimated" when estimating.
- Cite SDG targets by code (e.g. "Target 6.1") only when you are confident of them.
- If asked about something unrelated to sustainability or the platform, answer briefly and steer back.
- Do not request or reveal personal data beyond what is listed here.

User context:
- Name: ${ctx.name}; role: ${ctx.role}; location: ${[ctx.city, ctx.country].filter(Boolean).join(", ") || "not set"}
- Skills: ${ctx.skills.join(", ") || "not set"}; interests: ${ctx.interests.join(", ") || "not set"}
- Followed goals: ${ctx.goals.map((g) => `Goal ${g.id} ${g.title}`).join("; ") || "none yet"}
- Verified volunteer hours: ${ctx.verifiedHours}; hours awaiting verification: ${ctx.pendingHours}

Recommended volunteer opportunities (best match first):
${ctx.opportunities.map((o) => `- [${o.title}](${o.link}) — Goal ${o.goal}, ${o.when}, ${o.where}${o.org ? `, ${o.org}` : ""}. Why: ${o.reasons.join("; ") || "upcoming"}`).join("\n") || "- none available right now"}

Recommended projects:
${ctx.projects.map((p) => `- [${p.title}](${p.link}) — Goals ${p.goals.join(", ")}, ${p.where || "location n/a"}, ${p.status.toLowerCase()}. Why: ${p.reasons.join("; ") || "active project"}`).join("\n") || "- none available right now"}`;
}

/** Streams the assistant reply as plain text chunks. */
export async function streamAssistantReply(user: CurrentUser, history: ChatTurn[]): Promise<AsyncIterable<string>> {
  const ctx = await buildAssistantContext(user);
  let providerNote = "";
  if (openai) {
    try {
      const stream = await openai.chat.completions.create({
        model: AI_MODEL,
        stream: true,
        temperature: 0.5,
        max_tokens: 1200,
        // Gemini "thinking" models can spend a long time reasoning before the first token;
        // a low effort keeps chat replies fast. (Only sent to Gemini — OpenAI chat models reject it.)
        ...(IS_GEMINI ? { reasoning_effort: "low" as const } : {}),
        messages: [{ role: "system", content: systemPrompt(ctx) }, ...history.slice(-8)],
      });
      return (async function* () {
        try {
          for await (const part of stream) {
            const delta = part.choices[0]?.delta?.content;
            if (delta) yield delta;
          }
        } catch (err) {
          console.error("[assistant] stream interrupted", err);
          yield "\n\n_The AI service stopped responding. Please try again in a moment._";
        }
      })();
    } catch (err) {
      // Free tiers have rate limits — fall back to the offline, data-grounded assistant instead of failing.
      console.error("[assistant] AI provider unavailable, using offline mode", err);
      providerNote = describeProviderError(err);
    }
  }
  const text = (await offlineReply(ctx, history[history.length - 1]?.content ?? "")) + providerNote;
  return (async function* () {
    // Chunk the response so the UI streams identically in offline mode.
    const parts = text.match(/[\s\S]{1,24}/g) ?? [];
    for (const p of parts) {
      yield p;
      await new Promise((r) => setTimeout(r, 8));
    }
  })();
}

/** Names the kind of connection failure (timeout, DNS, bad URL) without exposing secrets. */
function connectionDetail(err: unknown) {
  const e = err as { name?: string; message?: string; cause?: { name?: string; code?: string | number; cause?: { code?: string } } };
  const code = e.cause?.code ?? e.cause?.cause?.code;
  // DOMException code 20 / AbortError = the request was cut off by the timeout.
  if (e.name?.includes("Timeout") || code === 20 || e.cause?.name === "AbortError" || /abort|timed? ?out/i.test(e.message ?? ""))
    return "the AI service took too long to answer — please try again";
  if (code === "ERR_INVALID_URL") return "OPENAI_BASE_URL is not a valid URL";
  if (code === "ENOTFOUND") return "the address in OPENAI_BASE_URL was not found — check for typos";
  return `the AI service could not be reached${e.name ? ` (${e.name}${code ? `, ${code}` : ""})` : ""}`;
}

/** A short, secret-free explanation shown under offline answers when the AI provider failed. */
function describeProviderError(err: unknown) {
  const e = err as { status?: number; message?: string };
  const reason =
    e.status === 401 || e.status === 403 ? "the API key was rejected — check OPENAI_API_KEY"
    : e.status === 404 ? `model or URL not found — check OPENAI_MODEL ("${AI_MODEL}") and OPENAI_BASE_URL`
    : e.status === 429 ? "the free usage limit was reached — try again later"
    : e.status === 400 ? "the AI service rejected the request"
    : connectionDetail(err);
  return `\n\n---\n_Answered in offline mode: ${reason}${e.status ? ` (HTTP ${e.status})` : ""}._`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline mode: a deterministic assistant grounded in platform data, used when
// no OPENAI_API_KEY is configured. It is clearly labelled in the UI.
// ─────────────────────────────────────────────────────────────────────────────

const GOAL_KEYWORDS: Record<number, string[]> = {
  1: ["poverty", "poor", "income", "cash"],
  2: ["hunger", "food", "nutrition", "farm", "agricultur", "meal"],
  3: ["health", "disease", "mental", "clinic", "well-being", "wellbeing", "hygiene"],
  4: ["education", "school", "teach", "learn", "literacy", "student", "coding", "tutor"],
  5: ["gender", "women", "girls", "equality"],
  6: ["water", "sanitation", "toilet", "drinking", "filtration"],
  7: ["energy", "solar", "electricity", "renewable"],
  8: ["jobs", "employment", "work", "economic", "livelihood"],
  9: ["infrastructure", "innovation", "internet", "industry", "digital"],
  10: ["inequality", "inclusion", "disability", "migrant", "refugee"],
  11: ["city", "cities", "urban", "transport", "housing", "community space"],
  12: ["waste", "plastic", "recycl", "consumption", "compost", "reuse"],
  13: ["climate", "carbon", "emission", "flood", "heat"],
  14: ["ocean", "sea", "marine", "beach", "river", "fish", "coral"],
  15: ["tree", "forest", "biodiversity", "land", "wildlife", "plant"],
  16: ["peace", "justice", "corruption", "institution", "rights"],
  17: ["partnership", "collaborat", "funding", "cooperation"],
};

function detectGoals(text: string): number[] {
  const t = text.toLowerCase();
  const found = new Set<number>();
  for (const m of t.matchAll(/\b(?:sdg|goal)\s*#?\s*(\d{1,2})\b/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 17) found.add(n);
  }
  for (const g of SDGS) if (t.includes(g.title.toLowerCase()) || t.includes(g.shortTitle.toLowerCase())) found.add(g.id);
  if (found.size === 0) {
    for (const [id, words] of Object.entries(GOAL_KEYWORDS)) if (words.some((w) => t.includes(w))) found.add(Number(id));
  }
  return [...found].slice(0, 3);
}

async function goalDetails(ids: number[]) {
  return db.sDGGoal.findMany({
    where: { id: { in: ids } },
    include: {
      targets: { orderBy: { code: "asc" }, take: 3 },
      projects: {
        where: { project: { moderationStatus: "APPROVED", status: { not: "COMPLETED" } } },
        include: { project: { select: { title: true, slug: true } } },
        take: 3,
      },
    },
  });
}

async function offlineReply(ctx: Ctx, message: string): Promise<string> {
  const t = message.toLowerCase();
  const mentioned = detectGoals(message);
  const fallbackGoal = mentioned[0] ?? ctx.goals[0]?.id ?? 13;

  const header = "";
  if (/proposal|pitch|grant|write (a|my) project/.test(t)) {
    const [g] = await goalDetails([fallbackGoal]);
    const place = ctx.city ?? "your community";
    return `${header}## Draft project proposal — ${g?.title ?? "SDG project"}

**Working title:** Community ${g?.shortTitle ?? "Action"} Initiative in ${place}

## 1. Problem statement
Describe the specific local problem in 2–3 sentences, with one number that shows its scale (for example, how many households, schools or kilometres of riverbank are affected). Name your source.

## 2. Objectives
- Objective 1 — a measurable outcome within 3 months
- Objective 2 — a capacity outcome (people trained, groups formed)
- Objective 3 — a sustainability outcome (who keeps this going after the project)

## 3. SDG alignment
- Primary: **Goal ${g?.id} — ${g?.title}**${g?.targets[0] ? `\n- Most relevant target: Target ${g.targets[0].code} — ${g.targets[0].description}` : ""}

## 4. Activities and timeline
- Weeks 1–2: community consultation and baseline measurement
- Weeks 3–8: core activities with volunteers
- Weeks 9–12: handover, final measurement and report

## 5. Impact measurement
Track a baseline and an end value for each metric. Record contributions in SDG Impact Hub so the project organizer can **verify** them — only verified entries count towards the project's reported impact.

## 6. Budget outline
List materials, transport, training and contingency (10%). Keep each line tied to an activity.

## 7. Partners and volunteers
Identify one local authority or school partner and estimate volunteer roles and hours.

When you're ready, you can turn this into a real project with [Start a project](/projects/new).`;
  }

  if (/action plan|plan for|roadmap|30.day|weekly plan|habit/.test(t)) {
    const opp = ctx.opportunities[0];
    const goal = SDGS.find((g) => g.id === fallbackGoal)!;
    return `${header}## Your 4-week action plan — Goal ${goal.id}: ${goal.title}

## Week 1 — Learn and measure
- Read the goal page: [Goal ${goal.id}](/sdgs/${goal.id})
- Write down one baseline you can measure at home, school or work.

## Week 2 — Act locally
${opp ? `- Sign up for [${opp.title}](${opp.link}) (${opp.when}, ${opp.where}).` : "- Pick one volunteer opportunity from [Volunteer](/volunteer)."}
- Join this week's challenge on the [Challenges](/challenges) page.

## Week 3 — Bring others in
- Share what you learned in the [Community](/community) feed.
- Invite one friend or classmate to join you.

## Week 4 — Record and reflect
- Log your hours and outcomes with **Record your impact** and attach evidence (a photo or attendance sheet) so it can be verified.
- Compare against your Week 1 baseline.

Small, consistent actions you can evidence are worth more than big estimates.`;
  }

  if (/recommend|suggest|near me|volunteer|opportunit|what (can|should) i do|find (a )?project|get involved/.test(t) || (mentioned.length === 0 && /project/.test(t))) {
    const opps = ctx.opportunities.slice(0, 4);
    const projs = ctx.projects.slice(0, 3);
    return `${header}## Recommended for you, ${ctx.name}
${ctx.goals.length ? `Based on the goals you follow (${ctx.goals.map((g) => `Goal ${g.id}`).join(", ")})${ctx.skills.length ? `, your skills (${ctx.skills.slice(0, 3).join(", ")})` : ""}${ctx.city ? ` and your location (${ctx.city})` : ""}.` : "Follow a few goals in [Explore SDGs](/sdgs) to get sharper matches."}

## Volunteer opportunities
${opps.map((o) => `- [${o.title}](${o.link}) — ${o.when} · ${o.where}${o.reasons.length ? `. *${o.reasons.join(" · ")}*` : ""}`).join("\n") || "- No open opportunities match right now — check [Volunteer](/volunteer) later."}

## Projects to join
${projs.map((p) => `- [${p.title}](${p.link}) — ${p.where || "Online"}${p.reasons.length ? `. *${p.reasons.join(" · ")}*` : ""}`).join("\n") || "- No matching projects right now."}

Tip: adding skills in [Settings](/settings) improves these matches.`;
  }

  if (mentioned.length > 0 && /(problem|issue|solve|solution|fix|help with|our (village|town|school|community))/.test(t)) {
    const goals = await goalDetails(mentioned);
    return `${header}## Ideas for tackling this locally
This sounds connected to ${goals.map((g) => `**Goal ${g.id} — ${g.title}**`).join(" and ")}.

${goals
  .map(
    (g) => `## Goal ${g.id}: practical approaches
${g.waysToContribute.slice(0, 4).map((w) => `- ${w}`).join("\n")}
${g.projects.length ? `\nProjects already working on this: ${g.projects.map((p) => `[${p.project.title}](/projects/${p.project.slug})`).join(", ")}.` : ""}`,
  )
  .join("\n\n")}

## How to start
- Talk to the people affected first and agree on one measurable problem.
- Pilot a small solution for 4–6 weeks and measure before and after.
- If it works, [start a project](/projects/new) to recruit volunteers and track verified impact.`;
  }

  if (mentioned.length > 0) {
    const goals = await goalDetails(mentioned);
    return goals
      .map(
        (g) => `## Goal ${g.id}: ${g.title}
${g.description}

## Key targets
${g.targets.map((tg) => `- **Target ${tg.code}** — ${tg.description}`).join("\n")}

## How you can contribute
${g.waysToContribute.slice(0, 4).map((w) => `- ${w}`).join("\n")}
${g.projects.length ? `\n## Projects on the platform\n${g.projects.map((p) => `- [${p.project.title}](/projects/${p.project.slug})`).join("\n")}` : ""}

Explore more on the [Goal ${g.id} page](/sdgs/${g.id}).`,
      )
      .join("\n\n");
  }

  if (/impact|contribut|count|matter|difference|verified/.test(t)) {
    return `${header}## How your actions add up
Every SDG has measurable **targets** (169 in total). Local actions contribute when they move a measurable outcome — for example, a water-filter installation contributes to **Target 6.1** (safe drinking water), and a coding club to **Target 4.4** (skills for employment).

## How SDG Impact Hub counts your impact
- When you record an activity it starts as **self-reported**.
- A project organizer or admin reviews it. Once **verified**, it counts towards leaderboards, badges and project impact.
- Attaching evidence (photos, attendance sheets, measurements) speeds up verification.

You currently have **${ctx.verifiedHours} verified hours**${ctx.pendingHours ? ` and ${ctx.pendingHours} hours awaiting verification` : ""}. See the breakdown in [Impact Analytics](/impact).`;
  }

  return `${header}Hi ${ctx.name}! I can help you with:

- **Understanding the goals** — try "Explain Goal 6" or "What is climate action?"
- **Finding opportunities** — "Recommend volunteer opportunities near me"
- **Project proposals** — "Draft a proposal for a plastic-free market"
- **Solving local problems** — "Our school has no clean drinking water, what can we do?"
- **Action plans** — "Make me a 4-week action plan for Goal 13"
- **Impact** — "How do my volunteer hours count?"`;
}
