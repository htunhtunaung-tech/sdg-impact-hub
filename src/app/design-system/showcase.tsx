"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Bell, Check, ChevronRight, CircleAlert, Clock, Copy, Download, FolderOpen, Globe, Heart, House, Info, Mic, MoveRight, Pencil, Plus, Search, Settings, Trash2, TrendingUp, Trophy, User, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Field } from "@/components/ui/field";
import { Checkbox, Input, Radio, Select, Textarea } from "@/components/ui/input";
import { Avatar, EmptyState, InsightRow, Progress, Skeleton, Stat } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { Tooltip } from "@/components/ui/tooltip";
import { Slider, Switch } from "@/components/ui/controls";
import { MiniCalendar } from "@/components/ui/calendar";
import { DonutChart } from "@/components/charts/donut-chart";
import { SdgLabel, SdgNumber } from "@/components/sdg/sdg-badge";
import { SDGS, sdgForeground } from "@/lib/sdg";
import { cn } from "@/lib/utils";

function Section({ id, title, children, className }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={cn("mt-12", className)}>
      <h2 id={`${id}-h`} className="mb-4 text-xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
const Panel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-[var(--radius-lg)] border border-border/80 bg-surface p-5 shadow-card sm:p-6", className)}>{children}</div>
);

const COLORS = [
  ["Forest 900 · primary", "#14532D", "text-white"], ["Forest 800 · hover", "#166534", "text-white"], ["Emerald 700 · links", "#047857", "text-white"],
  ["Emerald 600 · accent", "#059669", "text-white"], ["Mint", "#ECF8F0", ""], ["Canvas", "#F4F7F5", ""], ["Surface", "#FFFFFF", ""], ["Ink", "#0F172A", "text-white"],
  ["Ink muted", "#475569", "text-white"], ["Border", "#E4E9E6", ""],
];
const TONES = [["Mint", "bg-tone-mint"], ["Sky", "bg-tone-sky"], ["Sun", "bg-tone-sun"], ["Rose", "bg-tone-rose"], ["Lilac", "bg-tone-lilac"]];

export function Showcase() {
  const [seg, setSeg] = useState<"week" | "month" | "year">("month");
  const [range, setRange] = useState([30, 100]);
  const [single, setSingle] = useState([69]);
  const [sw, setSw] = useState(true);
  const [step, setStep] = useState(1);
  const [chips, setChips] = useState<string[]>(["Teaching"]);
  const [singleChip, setSingleChip] = useState("Near me");
  const [day, setDay] = useState<Date | null>(new Date());
  const [card, setCard] = useState("multi-1");
  const [qty, setQty] = useState(12);
  const today = new Date();

  return (
    <div>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
        {["colours", "type", "buttons", "forms", "selection", "feedback", "overlays", "data", "navigation"].map((s) => (
          <a key={s} href={`#${s}`} className="rounded-full bg-surface px-4 py-2 text-sm font-medium capitalize text-ink-muted shadow-card hover:text-ink">{s}</a>
        ))}
      </nav>

      <Section id="colours" title="Colour">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {COLORS.map(([n, hex]) => (
            <div key={n} className="overflow-hidden rounded-[18px] border border-border/80 bg-surface">
              <div className="flex h-20 items-end p-3 text-xs font-semibold" style={{ background: hex, color: sdgForeground(hex!) }}>{hex}</div>
              <p className="px-3 py-2 text-[13px] font-medium">{n}</p>
            </div>
          ))}
        </div>
        <h3 className="mb-2 mt-6 text-sm font-semibold">Pastel tones (metric tiles)</h3>
        <div className="flex flex-wrap gap-3">
          {TONES.map(([n, c]) => <div key={n} className={cn("rounded-[16px] px-5 py-4 text-sm font-semibold", c)}>{n}</div>)}
        </div>
        <h3 className="mb-2 mt-6 text-sm font-semibold">UN SDG accents (goal colours only)</h3>
        <div className="flex flex-wrap gap-2">{SDGS.map((g) => <SdgNumber key={g.id} goal={g.id} size={36} />)}</div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="h-28 rounded-[20px] bg-[image:var(--gradient-brand)] p-4 text-sm font-semibold text-white">Brand gradient · hero cards</div>
          <div className="h-28 rounded-[20px] border border-border bg-[image:var(--gradient-eco)] p-4 text-sm font-semibold">Eco wash · onboarding & auth</div>
        </div>
      </Section>

      <Section id="type" title="Typography — Inter">
        <Panel className="space-y-3">
          <p className="text-[34px] font-bold leading-tight tracking-tight">Display 34 / Bold</p>
          <p className="text-[26px] font-bold tracking-tight">Heading 26 / Bold</p>
          <p className="text-lg font-bold">Card title 18 / Bold</p>
          <p className="text-base">Body 16 / Regular — readable line length, 1.6 line height for long text.</p>
          <p className="text-sm text-ink-muted">Small 14 / Muted — supporting text at 7.6:1 contrast.</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">Overline 11 / Semibold</p>
        </Panel>
      </Section>

      <Section id="buttons" title="Buttons">
        <Panel className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Destructive</Button>
            <Button variant="link">Link button</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md"><Plus /> Medium</Button>
            <Button size="lg">Large <MoveRight /></Button>
            <Button size="icon" variant="secondary" aria-label="Settings"><Settings /></Button>
            <Button loading>Saving…</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="rounded-[18px] bg-[image:var(--gradient-brand)] p-4"><Button variant="white"><Plus /> On brand surface</Button></div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Stepper</span>
            <div className="inline-flex items-center gap-1 rounded-full bg-track p-1">
              <button type="button" className="flex size-9 items-center justify-center rounded-full bg-surface text-lg shadow-card" onClick={() => setQty((q) => Math.max(0, q - 1))} aria-label="Decrease">−</button>
              <span className="w-10 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
              <button type="button" className="flex size-9 items-center justify-center rounded-full bg-surface text-lg shadow-card" onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
            </div>
          </div>
        </Panel>
      </Section>

      <Section id="forms" title="Form fields">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="space-y-4">
            <Field label="Text field label" htmlFor="ds-a" hint="Helper text explains what to enter."><Input placeholder="Input text" /></Field>
            <Field label="Text field label" htmlFor="ds-b" error="Write your error message here"><Input defaultValue="Input text" /></Field>
            <div className="space-y-1.5">
              <label htmlFor="ds-c" className="block text-sm font-medium">Text field label</label>
              <Input id="ds-c" defaultValue="Input text" className="border-accent" aria-describedby="ds-c-ok" />
              <p id="ds-c-ok" className="flex items-center gap-1.5 text-xs font-medium text-link"><Check className="size-3.5" /> Write your completion message here</p>
            </div>
            <Field label="Disabled" htmlFor="ds-d"><Input disabled defaultValue="Not editable" /></Field>
          </Panel>
          <Panel className="space-y-4">
            <Field label="Text area label" htmlFor="ds-e"><Textarea placeholder="Input for text area" /></Field>
            <Field label="Single-select field" htmlFor="ds-f"><Select defaultValue="b"><option value="a">Item</option><option value="b">Item selected</option><option value="c">Item</option></Select></Field>
            <div className="relative">
              <label htmlFor="ds-g" className="sr-only">Search</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <Input id="ds-g" placeholder="Search" className="rounded-full pl-10 pr-10" />
              <Mic className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            </div>
          </Panel>
        </div>
      </Section>

      <Section id="selection" title="Selection controls">
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel className="space-y-4">
            <label className="flex items-center gap-3 text-sm"><Checkbox defaultChecked /> Checkbox (checked)</label>
            <label className="flex items-center gap-3 text-sm"><Checkbox /> Checkbox</label>
            <label className="flex items-center gap-3 text-sm"><Radio name="r" defaultChecked /> Radio (selected)</label>
            <label className="flex items-center gap-3 text-sm"><Radio name="r" /> Radio</label>
            <Switch label="Toggle" description="Email me about new matches" checked={sw} onCheckedChange={setSw} />
          </Panel>
          <Panel className="space-y-6">
            <Slider label="Label" value={single} onValueChange={setSingle} format={(v) => `${v}%`} />
            <Slider label="Price range" value={range} onValueChange={setRange} min={0} max={150} format={(v) => `$${v}`} />
            <Segmented label="Period" value={seg} onChange={setSeg} items={[{ value: "week", label: "Week" }, { value: "month", label: "Month" }, { value: "year", label: "Year" }]} />
          </Panel>
          <Panel className="space-y-4">
            <p className="text-sm font-semibold">Chips</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Single-select chips">
              {["Near me", "Online"].map((c) => (
                <button key={c} type="button" role="radio" aria-checked={singleChip === c} onClick={() => setSingleChip(c)} className={cn("h-10 rounded-full border px-4 text-sm font-medium", singleChip === c ? "border-2 border-primary text-forest-900" : "border-border-strong")}>{c}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Multi-select chips">
              {["Teaching", "Design", "Coding"].map((c) => {
                const on = chips.includes(c);
                return (
                  <button key={c} type="button" aria-pressed={on} onClick={() => setChips(on ? chips.filter((x) => x !== c) : [...chips, c])} className={cn("inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium", on ? "border-primary bg-primary text-white" : "border-border-strong")}>
                    {on && <Check className="size-4" />} {c}
                  </button>
                );
              })}
            </div>
            <p className="pt-2 text-sm font-semibold">Selectable cards</p>
            {[["single", "Single-select card"], ["multi-1", "Multi-select card"]].map(([k, t]) => (
              <button key={k} type="button" aria-pressed={card === k} onClick={() => setCard(k!)} className={cn("flex w-full items-center gap-3 rounded-[16px] border-2 p-3 text-left", card === k ? "border-primary bg-mint" : "border-border")}>
                <span className={cn("flex size-5 items-center justify-center rounded-full border-2", card === k ? "border-primary bg-primary text-white" : "border-border-strong")}>{card === k && <Check className="size-3" strokeWidth={3} />}</span>
                <span><span className="block text-sm font-semibold">{t}</span><span className="block text-xs text-ink-muted">Item description text</span></span>
              </button>
            ))}
          </Panel>
        </div>
      </Section>

      <Section id="feedback" title="Feedback & status">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success"><Check /> Verified</Badge>
              <Badge variant="warning"><Clock /> Self-reported</Badge>
              <Badge variant="danger"><CircleAlert /> Not verified</Badge>
              <Badge variant="info"><Info /> Info</Badge>
              <Badge variant="brand">New</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => toast("Write your toast message here.")}>Info toast</Button>
              <Button variant="secondary" size="sm" onClick={() => toast.success("Your spot is confirmed.")}>Success toast</Button>
              <Button variant="secondary" size="sm" onClick={() => toast.error("We couldn't save that. Try again.", { action: { label: "Retry", onClick: () => {} } })}>Error toast</Button>
            </div>
            <Stepper steps={["Account", "Goals", "Skills", "Done"]} current={step} />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setStep(Math.max(0, step - 1))}>Back</Button>
              <Button size="sm" onClick={() => setStep(Math.min(4, step + 1))}>Next step</Button>
            </div>
            <div className="space-y-2">
              <Progress value={68} label="Example progress" />
              <div className="flex gap-3"><Skeleton className="size-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/3" /></div></div>
            </div>
          </Panel>
          <EmptyState icon={<FolderOpen />} title="You haven't recorded any activities yet" description="Explore a project and start making an impact." action={<Button>Browse projects</Button>} />
        </div>
      </Section>

      <Section id="overlays" title="Overlays">
        <Panel className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild><Button variant="secondary">Open modal</Button></DialogTrigger>
            <DialogContent title="Modal window title" description="Dialogs trap focus, close with Escape and return focus to the trigger.">
              <div className="h-24 rounded-[16px] bg-canvas" />
              <div className="mt-6 flex justify-end gap-2">
                <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                <DialogClose asChild><Button>Primary</Button></DialogClose>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild><Button variant="danger"><Trash2 /> Delete entry</Button></DialogTrigger>
            <DialogContent title="Delete this entry?" description="This can't be undone. Verified hours stay on your record.">
              <div className="flex justify-end gap-2">
                <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                <DialogClose asChild><Button variant="danger">Delete</Button></DialogClose>
              </div>
            </DialogContent>
          </Dialog>
          <Dropdown>
            <DropdownTrigger asChild><Button variant="secondary">Menu <ChevronRight className="rotate-90" /></Button></DropdownTrigger>
            <DropdownContent align="start">
              <DropdownItem><Pencil /> Edit</DropdownItem>
              <DropdownItem><Copy /> Duplicate</DropdownItem>
              <DropdownItem><Download /> Export</DropdownItem>
              <DropdownSeparator />
              <DropdownItem className="text-danger"><Trash2 className="!text-danger" /> Delete</DropdownItem>
            </DropdownContent>
          </Dropdown>
          <Tooltip content="Write your tooltip message here."><Button variant="secondary" size="icon" aria-label="More information"><Info /></Button></Tooltip>
        </Panel>
      </Section>

      <Section id="data" title="Data display">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Stat tone="mint" icon={<Clock />} label="Volunteer hours" value="128" trend="up" sub={<span className="inline-flex items-center gap-1"><TrendingUp className="size-3.5" />+18% vs last month</span>} />
          <Stat tone="sky" icon={<FolderOpen />} label="Projects joined" value="6" sub="2 active now" />
          <Stat tone="sun" icon={<Users />} label="People reached" value="1,240" sub="From verified activities" />
          <Stat tone="lilac" icon={<Globe />} label="Goals contributed" value="5 of 17" sub="Most active: Education" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card>
            <div className="flex aspect-video items-center justify-center rounded-t-[var(--radius-lg)] bg-track text-2xl font-bold text-ink-subtle">16:9</div>
            <CardContent className="pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">Eyebrow caption</p>
              <h3 className="mt-1 text-lg font-bold">Content card title</h3>
              <p className="mt-1 text-sm text-ink-muted">This is where your body text goes. Pay close attention to the text alignment and line-height for readability.</p>
              <a href="#data" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-link">View card <ChevronRight className="size-4" /></a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div><CardTitle>Quick insights</CardTitle><CardDescription>Icon, title and one line of context</CardDescription></div></CardHeader>
            <CardContent className="space-y-4">
              <InsightRow icon={<Trophy />} title="Best day: Wednesday (95%)" sub="Highest verification rate this month" />
              <InsightRow icon={<CircleAlert />} title="3 entries need evidence" sub="Add a photo so organizers can verify" />
              <InsightRow icon={<TrendingUp />} title="Hours up 12% this week" sub="More sessions completed" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Donut chart</CardTitle></CardHeader>
            <CardContent>
              <DonutChart legend="below" size={160} centerLabel="verified" data={[4, 13, 6, 3].map((g, i) => ({ key: String(g), label: SDGS[g - 1]!.shortTitle, value: [34, 32, 22, 18][i]!, color: SDGS[g - 1]!.color }))} />
            </CardContent>
          </Card>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Panel>
            <MiniCalendar selected={day} onSelect={setDay} events={[new Date(today.getFullYear(), today.getMonth(), 10), new Date(today.getFullYear(), today.getMonth(), 17), new Date(today.getFullYear(), today.getMonth(), 24)]} />
          </Panel>
          <Panel className="space-y-4">
            <p className="text-sm font-semibold">Avatars & presence</p>
            <div className="flex items-end gap-3">
              {[32, 40, 52, 64].map((s, i) => (
                <span key={s} className="relative">
                  <Avatar name={["Mya Thandar", "Somchai Prasert", "Dao Wong", "Nok Chai"][i]!} size={s} />
                  <span className={cn("absolute bottom-0 right-0 rounded-full ring-2 ring-surface", i % 2 ? "bg-accent" : "bg-orange-500")} style={{ width: s / 4, height: s / 4 }} aria-hidden />
                </span>
              ))}
            </div>
            <p className="text-sm font-semibold">Goal labels</p>
            <div className="flex flex-col gap-2"><SdgLabel goal={6} /><SdgLabel goal={13} short={false} /></div>
          </Panel>
          <Panel className="space-y-3">
            <p className="text-sm font-semibold">Progress steps</p>
            {[["1", "Sign up", true], ["2", "Attend", true], ["3", "Log hours", false]].map(([n, t, d]) => (
              <div key={String(n)} className="flex items-center gap-3">
                <span className={cn("flex size-9 items-center justify-center rounded-full text-sm font-bold", d ? "bg-primary text-white" : "ring-[3px] ring-accent")}>{d ? <Check className="size-4" /> : n}</span>
                <span className="text-sm font-medium">{String(t)}</span>
              </div>
            ))}
          </Panel>
        </div>
      </Section>

      <Section id="navigation" title="Navigation">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <p className="mb-3 text-sm font-semibold">Mobile bottom bar</p>
            <div className="grid grid-cols-5 items-center rounded-[24px] border border-border/80 bg-surface py-1 shadow-raised">
              {[[House, "Home", true], [FolderOpen, "Projects"], null, [Heart, "Volunteer"], [User, "Profile"]].map((t, i) =>
                t ? (
                  <span key={i} className="flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium">
                    {(() => { const I = t[0] as typeof House; return <span className={cn("flex h-8 w-12 items-center justify-center rounded-full", t[2] ? "bg-tone-mint text-forest-900" : "text-slate-500")}><I className="size-5" /></span>; })()}
                    <span className={t[2] ? "font-semibold text-forest-900" : "text-slate-600"}>{String(t[1])}</span>
                  </span>
                ) : (
                  <span key={i} className="flex justify-center"><span className="flex h-12 w-16 items-center justify-center rounded-full bg-primary text-white shadow-brand"><Plus className="size-6" /></span></span>
                ),
              )}
            </div>
          </Panel>
          <Panel className="space-y-4">
            <p className="text-sm font-semibold">Tabs</p>
            <div className="flex gap-1 border-b border-border">
              {["Overview", "Impact", "Updates"].map((t, i) => (
                <span key={t} className={cn("relative px-4 pb-3 text-[15px]", i === 0 ? "font-semibold text-forest-900" : "text-ink-muted")}>{t}{i === 0 && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-forest-900" />}</span>
              ))}
            </div>
            <p className="text-sm font-semibold">Icon buttons</p>
            <div className="flex gap-2">
              {[Bell, Search, Settings].map((I, i) => <span key={i} className="flex size-10 items-center justify-center rounded-full bg-track text-ink-muted"><I className="size-[18px]" /></span>)}
            </div>
          </Panel>
        </div>
      </Section>
    </div>
  );
}
