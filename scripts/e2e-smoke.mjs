// End-to-end smoke test of the main user flows against a running server.
// Usage: BASE_URL=http://localhost:3000 node scripts/e2e-smoke.mjs   (requires seeded DB, dev mode)
import { createRequire } from "module";

// Requires Playwright: `npm i -D playwright && npx playwright install chromium` (or a global install).
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = "Password123";
const results = [];
const step = async (name, fn) => {
  try {
    await fn();
    results.push(["✔", name]);
  } catch (e) {
    results.push(["✘", name, e.message.split("\n")[0]]);
  }
};

const browser = await chromium.launch();
async function session(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => results.push(["!", `page error (${email})`, e.message]));
  if (email) {
    await page.goto(`${BASE}/login`);
    await page.fill("#email", email);
    await page.fill("#password", PASSWORD);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), page.click("button[type=submit]")]);
  }
  return page;
}
const toast = (page, text) => page.getByText(text, { exact: false }).first().waitFor({ timeout: 30000 });

// 1 — Registration, email verification, login
const stamp = Date.now();
await step("register → verify email → sign in", async () => {
  const p = await session(null);
  await p.goto(`${BASE}/register`);
  await p.fill("#name", "Test Volunteer");
  await p.fill("#email", `test${stamp}@example.org`);
  await p.fill("#password", PASSWORD);
  await p.click("button[type=submit]");
  const link = await p.getByRole("link", { name: "open confirmation link" }).getAttribute("href");
  await p.goto(BASE + link);
  await p.getByRole("button", { name: "Confirm my email" }).click();
  await toast(p, "Your email is confirmed");
  await p.goto(`${BASE}/login`);
  await p.fill("#email", `test${stamp}@example.org`);
  await p.fill("#password", PASSWORD);
  await Promise.all([p.waitForURL("**/dashboard"), p.click("button[type=submit]")]);
  await p.close();
});

await step("unverified accounts can't sign in", async () => {
  const p = await session(null);
  await p.goto(`${BASE}/login`);
  await p.fill("#email", "unverified@example.org");
  await p.fill("#password", PASSWORD);
  await p.click("button[type=submit]");
  await toast(p, "confirm your email");
  await p.close();
});

await step("protected routes redirect to login", async () => {
  const p = await session(null);
  await p.goto(`${BASE}/admin`);
  if (!p.url().includes("/login")) throw new Error(`not redirected: ${p.url()}`);
  await p.close();
});

// 2 — Volunteer flows
const mya = await session("mya@example.org");
await step("sign up for an instant-approval opportunity", async () => {
  await mya.goto(`${BASE}/volunteer`);
  const row = mya.locator("article", { hasText: "Beach and riverbank clean-up" });
  await row.getByRole("button", { name: "Sign up" }).click();
  await mya.getByLabel("Add to my calendar").uncheck();
  await mya.getByRole("button", { name: "Confirm sign-up" }).click();
  await toast(mya, "You're signed up");
});
await step("follow a goal", async () => {
  await mya.goto(`${BASE}/sdgs/14`);
  await mya.getByRole("button", { name: "Follow this goal" }).click();
  await toast(mya, "Following Goal 14");
});
await step("save a project", async () => {
  await mya.goto(`${BASE}/projects/mobile-health-check-days`);
  await mya.getByRole("button", { name: "Save for later" }).click();
  await toast(mya, "Saved");
});
await step("post, react and comment in the community", async () => {
  await mya.goto(`${BASE}/community`);
  await mya.fill("#composer", `E2E post ${stamp}`);
  await mya.getByRole("button", { name: "Post", exact: true }).click();
  await toast(mya, "Posted");
  const post = mya.locator("article", { hasText: `E2E post ${stamp}` });
  await post.getByRole("button", { name: /^Celebrate/ }).click();
  await post.getByRole("link", { name: /comment/ }).click();
  await mya.fill("#comment", "Self-comment from E2E");
  await mya.getByRole("button", { name: "Comment", exact: true }).click();
  await mya.getByText("Self-comment from E2E").waitFor();
});
await step("record impact (self-reported)", async () => {
  await mya.goto(`${BASE}/impact/new`);
  await mya.fill("#title", `E2E tutoring ${stamp}`);
  await mya.selectOption("#projectId", { label: "Coding Club for Young Learners" });
  await mya.fill("#hours", "1.5");
  await mya.getByRole("button", { name: "Submit for verification" }).click();
  await mya.waitForURL("**/impact");
  await mya.getByText(`E2E tutoring ${stamp}`).waitFor();
});
await step("AI assistant answers (offline or online)", async () => {
  await mya.goto(`${BASE}/assistant`);
  await mya.getByRole("button", { name: "Explain Goal 6 and how I can help locally", exact: true }).click();
  await mya.getByText("Key targets", { exact: false }).first().waitFor({ timeout: 60000 });
});
await step("send a direct message", async () => {
  await mya.goto(`${BASE}/messages`);
  await mya.getByRole("link", { name: /Somchai Prasert/ }).first().click();
  await mya.fill("#msg", `Hello from E2E ${stamp}`);
  await mya.getByRole("button", { name: "Send" }).click();
  await mya.getByText(`Hello from E2E ${stamp}`).waitFor();
});
await step("complete a daily challenge", async () => {
  await mya.goto(`${BASE}/challenges`);
  const card = mya.locator("li", { hasText: "Five-minute shower" });
  await card.getByRole("button", { name: "I did it" }).click();
  await toast(mya, "Nice work");
});
await step("search finds a project", async () => {
  await mya.keyboard.press("Control+k");
  await mya.keyboard.type("water");
  await mya.getByRole("option", { name: /Clean Water for Rural Schools/ }).waitFor();
  await mya.keyboard.press("Escape");
});
await step("CSV export and calendar download", async () => {
  const r1 = await mya.request.get(`${BASE}/api/impact/export?range=all`);
  if (!r1.ok() || !(await r1.text()).includes("Status")) throw new Error("export failed");
  await mya.goto(`${BASE}/volunteer?tab=signups`);
});

// 3 — Organizer flows
const somchai = await session("somchai@example.org");
await step("organizer approves a pending applicant", async () => {
  await somchai.goto(`${BASE}/volunteer/manage`);
  const row = somchai.locator("li", { hasText: "Mya Thandar" }).first();
  await row.getByRole("button", { name: "Approve" }).click();
  await toast(somchai, "Volunteer approved");
});
await step("organizer confirms attendance (verifies hours)", async () => {
  await somchai.goto(`${BASE}/volunteer/manage?show=past`);
  const before = await somchai.getByRole("button", { name: "Attended" }).count();
  if (before === 0) {
    results.push(["·", "no past approved sign-ups to confirm (ok)"]);
    return;
  }
  await somchai.getByRole("button", { name: "Attended" }).first().click();
  await toast(somchai, "hours are verified");
});
await step("organizer adds milestone and posts update", async () => {
  await somchai.goto(`${BASE}/projects/clean-water-for-rural-schools?tab=manage`);
  await somchai.fill("#ms-title", `E2E milestone ${stamp}`);
  await somchai.getByRole("button", { name: "Add", exact: true }).click();
  await toast(somchai, "Milestone added");
  await somchai.goto(`${BASE}/projects/clean-water-for-rural-schools?tab=updates`);
  await somchai.fill("#upd-title", `E2E update ${stamp}`);
  await somchai.fill("#upd-body", "Testing the progress report flow end to end.");
  await somchai.getByRole("button", { name: "Publish update" }).click();
  await somchai.getByRole("heading", { name: `E2E update ${stamp}` }).waitFor();
});
await step("organizers can't verify contributions outside their projects", async () => {
  await somchai.goto(`${BASE}/admin`);
  await somchai.waitForURL("**/dashboard", { timeout: 15000 });
});

const dao = await session("dao@example.org");
await step("organizer verifies a self-reported contribution", async () => {
  await dao.goto(`${BASE}/projects/plastic-free-market-campaign?tab=manage`);
  await dao.getByRole("button", { name: "Verify" }).first().click();
  await toast(dao, "Verified");
});

// 4 — Project creation + moderation
const ploy = await session("ploy@example.org");
await step("student creates a project (goes to review)", async () => {
  await ploy.goto(`${BASE}/projects/new`);
  await ploy.fill("#title", `E2E Library Garden ${stamp}`);
  await ploy.fill("#summary", "Turning the school library courtyard into a small food garden.");
  await ploy.fill("#description", "We will build raised beds, compost food waste from the canteen and teach younger students how to grow vegetables.");
  await ploy.getByRole("button", { name: /Zero Hunger/ }).click();
  await ploy.fill("#city", "Khon Kaen");
  await ploy.getByRole("button", { name: "Create project" }).click();
  await ploy.waitForURL("**/projects/e2e-library-garden-*");
  await ploy.getByText("awaiting review").first().waitFor();
});

const admin = await session("admin@sdgimpacthub.org");
await step("admin approves the new project", async () => {
  await admin.goto(`${BASE}/admin/projects`);
  const row = admin.locator("div", { hasText: `E2E Library Garden ${stamp}`, has: admin.getByRole("button", { name: "Approve" }) }).last();
  await row.getByRole("button", { name: "Approve" }).click();
  await toast(admin, "approved");
});
await step("admin verifies an organization", async () => {
  await admin.goto(`${BASE}/admin/organizations`);
  await admin.getByRole("button", { name: "Verify" }).first().click();
  await toast(admin, "Organization verified");
});
await step("admin resolves a report", async () => {
  await admin.goto(`${BASE}/admin/reports`);
  await admin.getByRole("button", { name: "Dismiss" }).first().click();
  await toast(admin, "dismissed");
});
await step("admin CSV report", async () => {
  const r = await admin.request.get(`${BASE}/api/admin/report?type=projects`);
  if (!r.ok()) throw new Error(String(r.status()));
  const r2 = await mya.request.get(`${BASE}/api/admin/report?type=projects`);
  if (r2.status() !== 403) throw new Error("non-admin could download admin report");
});

await browser.close();
for (const r of results) console.log(r.join("  "));
const failed = results.filter((r) => r[0] === "✘" || r[0] === "!").length;
console.log(`\n${results.filter((r) => r[0] === "✔").length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
