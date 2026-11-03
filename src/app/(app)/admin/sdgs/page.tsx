import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { SdgNumber } from "@/components/sdg/sdg-badge";
import { SdgEditor } from "../admin-actions";

export default async function AdminSdgs() {
  const goals = await db.sDGGoal.findMany({ orderBy: { id: "asc" } });
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">Edit the content shown on each goal page. Official targets are seeded from the UN framework.</p>
      {goals.map((g) => (
        <details key={g.id} className="group rounded-[var(--radius-lg)] border border-border bg-surface shadow-card">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
            <SdgNumber goal={g.id} size={32} />
            <span className="flex-1 font-semibold">{g.title}</span>
            {!g.isActive && <span className="text-xs font-semibold text-warning">hidden</span>}
            <span className="text-sm text-link group-open:hidden">Edit</span>
          </summary>
          <Card className="border-0 shadow-none"><CardContent className="pt-0"><SdgEditor goal={{ id: g.id, tagline: g.tagline, description: g.description, challenges: g.challenges, waysToContribute: g.waysToContribute, isActive: g.isActive }} /></CardContent></Card>
        </details>
      ))}
    </div>
  );
}
