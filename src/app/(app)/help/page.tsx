import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Help Center" };

const FAQ: { id?: string; q: string; a: React.ReactNode }[] = [
  { q: "What's the difference between “verified” and “self-reported” impact?", a: <>When you record an activity it is <strong>self-reported</strong>: your own record. A project organizer or administrator then checks it — attendance, a photo or a measurement — and marks it <strong>verified</strong>. Only verified impact counts towards totals, badges, leaderboards, project targets and certificates.</> },
  { q: "How do I get my hours verified faster?", a: <>Link the entry to the project or session you attended, and attach evidence such as a photo or an attendance sheet. Organizers can also confirm attendance directly from their sign-up list after a session.</> },
  { q: "How does XP work?", a: <>You earn XP only from verified contributions (10 XP plus 10 XP per hour, capped at 8 hours per entry, plus a bonus for evidence) and from challenges. Honour-system challenges are capped at 60 XP per day; evidence challenges earn XP once verified. This keeps rewards tied to quality, not volume.</> },
  { q: "How are recommendations made?", a: <>We score projects and opportunities using the goals you follow, the skills on your profile, the distance from your pinned location and how soon they start. Each suggestion lists its reasons. Update these in <Link href="/settings" className="text-link underline">Settings</Link>.</> },
  { q: "How do I start a project?", a: <>Go to <Link href="/projects/new" className="text-link underline">Start a project</Link>. Independent projects are reviewed by an administrator before they become public. Projects published by a verified organization go live immediately.</> },
  { q: "How does my organization get verified?", a: <><Link href="/organizations/new" className="text-link underline">Register it</Link> with a description and website. An administrator reviews the details and you'll be notified by email.</> },
  { q: "What does the AI assistant know about me?", a: <>Only what's on your profile (name, city, skills, interests, followed goals), your verified and pending hour totals, and public platform data such as open opportunities. Conversations are stored so you can return to them; you can delete them at any time.</> },
  { id: "privacy", q: "Privacy and your data", a: <>We store the information you give us to run the platform. Your exact coordinates are never shown publicly — only your city. You can make your profile private, hide yourself from leaderboards, <a href="/api/me/export" className="text-link underline">download all your data</a>, or permanently delete your account from Settings. Evidence files are visible only to you and the people who review them.</> },
  { q: "How do I report a problem?", a: <>Use the “Report” option on any post or profile. Reports are confidential and reviewed by moderators.</> },
];

export default function HelpPage() {
  return (
    <div className="container-page max-w-3xl py-6 sm:py-8">
      <PageHeader title="Help Center" description="Answers to common questions about volunteering, verification and your data." />
      <div className="space-y-3">
        {FAQ.map((f) => (
          <details key={f.q} id={f.id} className="group rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-card open:shadow-raised">
            <summary className="cursor-pointer list-none text-[17px] font-semibold marker:hidden">
              <span className="flex items-start justify-between gap-4">{f.q}<span className="text-link transition-transform group-open:rotate-45" aria-hidden>+</span></span>
            </summary>
            <div className="mt-3 leading-relaxed text-slate-700">{f.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
