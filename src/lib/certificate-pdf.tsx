import {
  Circle,
  Document,
  Ellipse,
  Image,
  Line,
  Page,
  Path,
  Polygon,
  Polyline,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import { sdgIconComponent } from "@/components/sdg/sdg-icon";
import { LOGO_PNG } from "@/lib/certificate-logo";
import { sdg, sdgForeground, SDGS } from "@/lib/sdg";

/**
 * The volunteer certificate as a real A4-landscape PDF, built on the server so it looks the same on every
 * phone and computer (mobile browsers ignore @page size when printing). Mirrors the on-screen design.
 */

export type CertificatePdfData = {
  name: string;
  hours: number;
  activities: number;
  projects: number;
  peopleReached: number;
  period: string | null;
  goals: { goalId: number; hours: number }[];
  issued: string;
  code: string;
  qrPng: string;
  /** Organizations whose projects the hours came from (logo is a PNG data URI or null). */
  partners?: { name: string; initials: string; logo: string | null }[];
};

const GREEN = "#166534";
const INK = "#0F172A";
const MUTED = "#475569";
const SUBTLE = "#64748B";
const BORDER = "#E2E8F0";

const s = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    color: INK,
    position: "relative",
  },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 7,
    flexDirection: "row",
  },
  frame1: {
    position: "absolute",
    top: 22,
    left: 22,
    right: 22,
    bottom: 22,
    borderWidth: 0.8,
    borderColor: "#CBD5D0",
    borderRadius: 10,
  },
  frame2: {
    position: "absolute",
    top: 27,
    left: 27,
    right: 27,
    bottom: 27,
    borderWidth: 0.6,
    borderColor: "#E2E8E5",
    borderRadius: 8,
  },
  body: {
    position: "absolute",
    top: 44,
    left: 64,
    right: 64,
    bottom: 40,
    alignItems: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: GREEN,
    marginLeft: 10,
  },
  tagline: { fontSize: 6.5, letterSpacing: 1.6, color: SUBTLE, marginTop: 6 },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 1.2,
    color: GREEN,
  },
  middle: {
    flexGrow: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  rule: { height: 0.8, backgroundColor: "#94A3B8", marginTop: 6 },
  presented: { fontSize: 9.5, color: MUTED, marginTop: 10 },
  name: { fontFamily: "Times-Roman", fontSize: 44, color: INK, marginTop: 4 },
  text: {
    fontSize: 10,
    color: MUTED,
    lineHeight: 1.55,
    textAlign: "center",
    maxWidth: 480,
    marginTop: 10,
  },
  bold: { fontFamily: "Helvetica-Bold", color: INK },
  goals: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  goalCard: {
    width: 74,
    alignItems: "center",
    backgroundColor: "#F5F7F6",
    borderWidth: 0.6,
    borderColor: BORDER,
    borderRadius: 8,
    paddingTop: 8,
    paddingBottom: 7,
    marginHorizontal: 5,
  },
  goalTile: {
    width: 32,
    height: 32,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  goalNum: {
    position: "absolute",
    top: 2.5,
    left: 3.5,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
  goalName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.8,
    color: INK,
    marginTop: 5,
    textAlign: "center",
    paddingHorizontal: 3,
  },
  goalHours: { fontSize: 6.8, color: MUTED, marginTop: 2 },
  footer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: 0.6,
    borderTopColor: BORDER,
    paddingTop: 10,
  },
  col: { flex: 1 },
  small: { fontSize: 7.5, color: MUTED },
  smallBold: { fontFamily: "Helvetica-Bold", fontSize: 8, color: INK },
  sigLine: {
    height: 0.6,
    backgroundColor: "#94A3B8",
    width: 120,
    marginVertical: 4,
  },
});

type IconNode = [string, Record<string, string | number>][];

/** Reads a lucide icon's shape list (lucide stores it on the element the component returns). */
function iconNode(goal: number): IconNode {
  const C = sdgIconComponent(goal) as unknown as {
    render?: (
      props: object,
      ref: null,
    ) => { props?: { icon?: { node?: IconNode }; iconNode?: IconNode } };
  };
  const el = C.render?.({}, null);
  return el?.props?.icon?.node ?? el?.props?.iconNode ?? [];
}

/** Turns a lucide icon into react-pdf vector shapes. */
function IconShapes({
  goal,
  color,
  size,
}: {
  goal: number;
  color: string;
  size: number;
}) {
  const shapes = iconNode(goal).map(([tag, raw], i) => {
    const a = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, String(v)]),
    );
    const common = {
      key: i,
      stroke: color,
      strokeWidth: 1.9,
      fill: "none",
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
    };
    const n = (k: string) => Number(a[k] ?? 0);
    switch (tag) {
      case "path":
        return <Path {...common} d={a.d ?? ""} />;
      case "circle":
        return <Circle {...common} cx={n("cx")} cy={n("cy")} r={n("r")} />;
      case "ellipse":
        return (
          <Ellipse
            {...common}
            cx={n("cx")}
            cy={n("cy")}
            rx={n("rx")}
            ry={n("ry")}
          />
        );
      case "rect":
        return (
          <Rect
            {...common}
            x={n("x")}
            y={n("y")}
            width={n("width")}
            height={n("height")}
            rx={n("rx")}
          />
        );
      case "line":
        return (
          <Line
            {...common}
            x1={n("x1")}
            y1={n("y1")}
            x2={n("x2")}
            y2={n("y2")}
          />
        );
      case "polyline":
        return <Polyline {...common} points={a.points ?? ""} />;
      default:
        return <Polygon {...common} points={a.points ?? ""} />;
    }
  });
  return (
    <Svg
      viewBox="0 0 24 24"
      style={{ width: size, height: size, marginTop: 4 }}
    >
      {shapes}
    </Svg>
  );
}

function Band({ top }: { top: boolean }) {
  return (
    <View style={[s.band, top ? { top: 0 } : { bottom: 0 }]} fixed>
      {SDGS.map((g) => (
        <View key={g.id} style={{ flex: 1, backgroundColor: g.color }} />
      ))}
    </View>
  );
}

const fmt = (n: number) =>
  Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { maximumFractionDigits: 1 });

export function CertificatePdf({ d }: { d: CertificatePdfData }) {
  return (
    <Document
      title={`Volunteer certificate — ${d.name}`}
      author="SDG Impact Hub"
      subject={`Certificate ${d.code}`}
      creator="SDG Impact Hub"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        <Band top />
        <Band top={false} />
        <View style={s.frame1} />
        <View style={s.frame2} />

        <View style={s.body}>
          <View style={s.brandRow}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
            <Image
              src={LOGO_PNG}
              style={{ width: 46, height: 46, borderRadius: 11 }}
            />
            <Text style={s.brand}>SDG Impact Hub</Text>
          </View>
          <Text style={s.tagline}>
            VOLUNTEERING • COMMUNITY IMPACT • SUSTAINABLE DEVELOPMENT
          </Text>

          <View style={s.middle}>
            <Text style={s.title}>CERTIFICATE OF VOLUNTEERING</Text>
            <View style={[s.rule, { width: 150 }]} />
            <Text style={s.presented}>
              This certificate is proudly presented to
            </Text>
            <Text style={s.name}>{d.name}</Text>
            <View style={[s.rule, { width: 230, marginTop: 2 }]} />

            <Text style={s.text}>
              in recognition of{" "}
              <Text style={s.bold}>
                {fmt(d.hours)} verified volunteer hours
              </Text>{" "}
              across {d.activities}{" "}
              {d.activities === 1 ? "activity" : "activities"}
              {d.projects > 0
                ? ` in ${d.projects} ${d.projects === 1 ? "project" : "projects"}`
                : ""}
              {d.period ? `, ${d.period}` : ""}, contributing to the United
              Nations Sustainable Development Goals.
            </Text>

            <View style={s.goals}>
              {d.goals.slice(0, 6).map((g) => {
                const meta = sdg(g.goalId);
                const fg = sdgForeground(meta.color);
                return (
                  <View key={g.goalId} style={s.goalCard}>
                    <View style={[s.goalTile, { backgroundColor: meta.color }]}>
                      <Text style={[s.goalNum, { color: fg }]}>{g.goalId}</Text>
                      <IconShapes goal={g.goalId} color={fg} size={16} />
                    </View>
                    <Text style={s.goalName}>{meta.shortTitle}</Text>
                    <Text style={s.goalHours}>{fmt(g.hours)} h</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {d.partners && d.partners.length > 0 && (
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 6.5, letterSpacing: 1.6, color: SUBTLE }}>IN PARTNERSHIP WITH</Text>
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-start", marginTop: 6 }}>
                {d.partners.map((p) => (
                  <View key={p.name} style={{ width: 92, alignItems: "center", marginHorizontal: 6 }}>
                    <View style={{ height: 34, width: 84, alignItems: "center", justifyContent: "center" }}>
                      {p.logo ? (
                        // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
                        <Image src={p.logo} style={{ maxHeight: 34, maxWidth: 84, objectFit: "contain" }} />
                      ) : (
                        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#E7F5EC", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, color: GREEN }}>{p.initials}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 6.3, color: MUTED, marginTop: 3, textAlign: "center" }}>{p.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={s.footer}>
            <View style={s.col}>
              <Text style={s.smallBold}>{d.issued}</Text>
              <View style={s.sigLine} />
              <Text style={s.small}>Date issued</Text>
            </View>
            <View style={[s.col, { alignItems: "center" }]}>
              {d.peopleReached > 0 && (
                <Text
                  style={{
                    fontFamily: "Helvetica-Bold",
                    fontSize: 13,
                    color: INK,
                  }}
                >
                  {d.peopleReached.toLocaleString("en-US")} people reached
                </Text>
              )}
              <Text
                style={[
                  s.small,
                  { textAlign: "center", marginTop: 3, maxWidth: 200 },
                ]}
              >
                Only hours confirmed by project organizers or administrators are
                counted.
              </Text>
            </View>
            <View
              style={[
                s.col,
                {
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  alignItems: "flex-end",
                },
              ]}
            >
              <View style={{ alignItems: "flex-end", marginRight: 8 }}>
                <Text style={s.smallBold}>Scan to verify</Text>
                <Text style={[s.small, { marginTop: 3 }]}>Certificate ID</Text>
                <Text
                  style={{
                    fontFamily: "Courier-Bold",
                    fontSize: 9.5,
                    color: INK,
                    marginTop: 1,
                  }}
                >
                  {d.code}
                </Text>
              </View>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
              <Image
                src={d.qrPng}
                style={{
                  width: 58,
                  height: 58,
                  padding: 3,
                  borderWidth: 0.6,
                  borderColor: BORDER,
                  borderRadius: 5,
                }}
              />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
