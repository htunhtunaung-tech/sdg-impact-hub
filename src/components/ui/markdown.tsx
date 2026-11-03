import Link from "next/link";
import { Fragment } from "react";

/**
 * Minimal, XSS-safe markdown renderer for assistant output: builds React elements
 * (never HTML strings). Supports ##/### headings, -/1. lists, **bold**, *italic*,
 * `code` and [links](...). Links must be internal (/...) or https.
 */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${keyBase}-${i++}`;
    if (t.startsWith("**")) out.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k} className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em]">{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? [];
      if (href && href.startsWith("/") && !href.startsWith("//")) out.push(<Link key={k} href={href} className="font-semibold text-link underline underline-offset-2">{label}</Link>);
      else if (href && /^https:\/\//.test(href)) out.push(<a key={k} href={href} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-link underline underline-offset-2">{label}</a>);
      else out.push(label ?? t);
    } else out.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push(<p key={`p${blocks.length}`}>{inline(para.join(" "), `p${blocks.length}`)}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    const k = `l${blocks.length}`;
    blocks.push(
      <Tag key={k} className={list.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5 marker:text-ink-subtle"}>
        {list.items.map((it, i) => <li key={i}>{inline(it, `${k}-${i}`)}</li>)}
      </Tag>,
    );
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (h) {
      flushPara(); flushList();
      blocks.push(<h3 key={`h${blocks.length}`} className="pt-1 text-[15px] font-semibold text-ink">{inline(h[2]!, `h${blocks.length}`)}</h3>);
    } else if (ul || ol) {
      flushPara();
      const ordered = Boolean(ol);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((ul ?? ol)![1]!);
    } else if (!line.trim()) {
      flushPara(); flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara(); flushList();
  return <div className="space-y-2.5 text-[15px] leading-relaxed text-slate-700">{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
