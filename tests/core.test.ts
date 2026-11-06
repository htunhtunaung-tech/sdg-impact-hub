import { describe, expect, it } from "vitest";
import { impactSubmissionSchema, onboardingSchema, passwordSchema, projectSchema, registerSchema } from "@/lib/validation";
import { levelForXp, levelProgress, periodKeyFor, xpForSubmission } from "@/lib/gamification";
import { SDGS, sdgForeground } from "@/lib/sdg";
import { sniffMime } from "@/lib/storage";
import { haversineKm, slugify } from "@/lib/utils";

describe("onboarding", () => {
  const base = { role: "STUDENT", goals: [4], skills: ["Teaching"], interests: [], city: " Khon Kaen ", country: "", emailNotifications: true };

  it("accepts a complete answer and normalises text", () => {
    const res = onboardingSchema.safeParse(base);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.city).toBe("Khon Kaen");
      expect(res.data.country).toBeUndefined();
    }
  });

  it("requires at least one goal and rejects invalid goal numbers", () => {
    expect(onboardingSchema.safeParse({ ...base, goals: [] }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...base, goals: [18] }).success).toBe(false);
  });

  it("never lets users pick the admin role", () => {
    expect(onboardingSchema.safeParse({ ...base, role: "ADMIN" }).success).toBe(false);
  });
});

describe("validation", () => {
  it("enforces password strength", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("longbutnodigits").success).toBe(false);
    expect(passwordSchema.safeParse("Password123").success).toBe(true);
  });

  it("never lets users self-register as admin", () => {
    const res = registerSchema.safeParse({ name: "Eve", email: "eve@example.org", password: "Password123", role: "ADMIN" });
    expect(res.success).toBe(false);
  });

  it("requires the primary goal to be among selected goals and valid dates", () => {
    const base = {
      title: "Clean river days", summary: "A monthly clean-up of the river bank in town.", description: "x".repeat(60),
      goals: [6, 14], primaryGoal: 6, status: "RECRUITING", volunteersNeeded: 10, city: "Khon Kaen",
    };
    expect(projectSchema.safeParse(base).success).toBe(true);
    expect(projectSchema.safeParse({ ...base, primaryGoal: 3 }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, startDate: "2026-12-10", endDate: "2026-12-01" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, city: undefined, locationName: undefined }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, city: undefined, isOnline: true }).success).toBe(true);
  });

  it("rejects future-dated or implausible impact", () => {
    const ok = { title: "Beach clean-up", date: new Date().toISOString(), hours: 3, goalId: 14 };
    expect(impactSubmissionSchema.safeParse(ok).success).toBe(true);
    expect(impactSubmissionSchema.safeParse({ ...ok, hours: 30 }).success).toBe(false);
    expect(impactSubmissionSchema.safeParse({ ...ok, date: new Date(Date.now() + 5 * 86400_000).toISOString() }).success).toBe(false);
    expect(impactSubmissionSchema.safeParse({ ...ok, evidenceUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("gamification", () => {
  it("caps XP per entry so volume can't be farmed", () => {
    expect(xpForSubmission(2, false)).toBe(30);
    expect(xpForSubmission(2, true)).toBe(40);
    expect(xpForSubmission(24, false)).toBe(xpForSubmission(8, false));
  });

  it("computes levels", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(399)).toBe(2);
    expect(levelForXp(400)).toBe(3);
    expect(levelProgress(250).pct).toBe(50);
  });

  it("builds period keys for recurring challenges", () => {
    const d = new Date("2026-11-03T10:00:00Z");
    expect(periodKeyFor("DAILY", d)).toBe("2026-11-03");
    expect(periodKeyFor("WEEKLY", d)).toBe("2026-W45");
    expect(periodKeyFor("ONE_TIME", d)).toBe("once");
  });
});

describe("SDG metadata", () => {
  it("has all 17 goals with official colours", () => {
    expect(SDGS).toHaveLength(17);
    expect(SDGS.find((g) => g.id === 6)?.color).toBe("#26BDE2");
  });
  it("picks accessible foreground colours", () => {
    expect(sdgForeground("#C5192D")).toBe("#FFFFFF");
    expect(sdgForeground("#FCC30B")).toBe("#0F172A");
  });

  it("gives every goal colour at least 4.5:1 text contrast", () => {
    const lum = (h: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const v = parseInt(h.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    for (const g of SDGS) {
      const [a, b] = [lum(g.color), lum(sdgForeground(g.color))].sort((x, y) => y - x);
      expect((a! + 0.05) / (b! + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("uploads", () => {
  it("detects real file types from magic bytes", () => {
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("image/png");
    expect(sniffMime(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe("application/pdf");
    expect(sniffMime(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});

describe("utils", () => {
  it("slugifies", () => expect(slugify("Clean Water for Rural Schools!")).toBe("clean-water-for-rural-schools"));
  it("computes distances", () => {
    const km = haversineKm({ lat: 16.4419, lng: 102.836 }, { lat: 17.4138, lng: 102.7872 });
    expect(km).toBeGreaterThan(100);
    expect(km).toBeLessThan(115);
  });
});
