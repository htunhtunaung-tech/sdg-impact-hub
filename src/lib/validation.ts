import { z } from "zod";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .nullish()
    .transform((v) => (v ? v : undefined));

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .refine((v) => !v || /^https?:\/\//i.test(v) || v.startsWith("/api/files/"), "Enter a valid URL starting with https://")
  .transform((v) => (v ? v : undefined));

const goalId = z.coerce.number().int().min(1).max(17);
const stringList = (maxItems: number, maxLen = 80) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).default([]);
const latitude = z.coerce.number().min(-90).max(90).optional().nullable();
const longitude = z.coerce.number().min(-180).max(180).optional().nullable();
const optionalDate = z
  .union([z.string(), z.date()])
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Invalid date");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const SELF_SERVICE_ROLES = ["INDIVIDUAL", "STUDENT", "VOLUNTEER", "ORGANIZER", "ORGANIZATION", "YOUTH_ORGANIZATION"] as const;

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(254),
  password: z.string().min(1, "Enter your password").max(128),
});

export const registerSchema = z.object({
  name: trimmed(2, 80, "Name"),
  email: z.email("Enter a valid email address").max(254),
  password: passwordSchema,
  role: z.enum(SELF_SERVICE_ROLES),
  goals: z.array(goalId).max(17).default([]),
});

export const forgotPasswordSchema = z.object({ email: z.email("Enter a valid email address") });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });
export const changePasswordSchema = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: passwordSchema,
});

export const profileSchema = z.object({
  name: trimmed(2, 80, "Name"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores"),
  role: z.enum(SELF_SERVICE_ROLES),
  headline: optionalText(120),
  bio: optionalText(800),
  city: optionalText(80),
  country: optionalText(80),
  latitude,
  longitude,
  website: optionalUrl,
  image: optionalUrl,
  coverImage: optionalUrl,
  skills: stringList(25, 40),
  interests: stringList(25, 40),
  goals: z.array(goalId).max(17).default([]),
});

export const onboardingSchema = z.object({
  role: z.enum(SELF_SERVICE_ROLES),
  goals: z.array(goalId).min(1, "Pick at least one goal").max(17),
  skills: stringList(25, 40),
  interests: stringList(25, 40),
  city: optionalText(80),
  country: optionalText(80),
  emailNotifications: z.boolean().default(true),
});

export const privacySchema = z.object({
  isPublic: z.boolean(),
  showOnLeaderboard: z.boolean(),
  emailNotifications: z.boolean(),
});

export const PROJECT_STATUSES = ["PLANNING", "RECRUITING", "ACTIVE", "COMPLETED"] as const;

export const projectSchema = z
  .object({
    title: trimmed(5, 120, "Title"),
    summary: trimmed(20, 280, "Summary"),
    description: trimmed(50, 6000, "Description"),
    objectives: stringList(10, 200),
    tasks: stringList(10, 200),
    goals: z.array(goalId).min(1, "Choose at least one goal").max(5, "Choose up to 5 goals").transform((g) => [...new Set(g)]),
    primaryGoal: goalId,
    status: z.enum(PROJECT_STATUSES),
    imageUrl: optionalUrl,
    organizationId: z.string().max(40).optional().nullable().transform((v) => v || null),
    budget: z.coerce.number().min(0).max(9_999_999_999).optional().nullable(),
    fundingGoal: z.coerce.number().min(0).max(9_999_999_999).optional().nullable(),
    currency: z.string().trim().length(3).toUpperCase().default("USD"),
    isOnline: z.boolean().default(false),
    locationName: optionalText(160),
    city: optionalText(80),
    country: optionalText(80),
    latitude,
    longitude,
    startDate: optionalDate,
    endDate: optionalDate,
    scheduleText: optionalText(120),
    commitment: optionalText(120),
    skillsNeeded: stringList(15, 40),
    volunteersNeeded: z.coerce.number().int().min(0).max(100000),
    impactTargets: z
      .array(z.object({ metricId: z.string().min(1).max(40), targetValue: z.coerce.number().positive().max(1e9) }))
      .max(8)
      .default([]),
  })
  .refine((p) => new Set(p.impactTargets.map((t) => t.metricId)).size === p.impactTargets.length, {
    path: ["impactTargets"],
    message: "Each impact metric can only be added once. Remove the duplicate target",
  })
  .refine((p) => p.goals.includes(p.primaryGoal), { path: ["primaryGoal"], message: "Primary goal must be one of the selected goals" })
  .refine((p) => !p.startDate || !p.endDate || p.endDate >= p.startDate, { path: ["endDate"], message: "End date must be after the start date" })
  .refine((p) => p.isOnline || p.locationName || p.city, { path: ["city"], message: "Add a location or mark the project as online" });

export const milestoneSchema = z.object({
  title: trimmed(3, 120, "Title"),
  description: optionalText(500),
  dueDate: optionalDate,
});

export const projectUpdateSchema = z.object({
  title: trimmed(3, 120, "Title"),
  body: trimmed(10, 5000, "Update"),
});

export const opportunitySchema = z
  .object({
    title: trimmed(5, 120, "Title"),
    description: trimmed(20, 3000, "Description"),
    goalId,
    projectId: z.string().max(40).optional().nullable().transform((v) => v || null),
    skills: stringList(10, 40),
    isOnline: z.boolean().default(false),
    locationName: trimmed(2, 160, "Location"),
    city: optionalText(80),
    latitude,
    longitude,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    spots: z.coerce.number().int().min(1, "At least one spot").max(10000),
    requiresApproval: z.boolean().default(true),
  })
  .refine((o) => o.endsAt > o.startsAt, { path: ["endsAt"], message: "End time must be after the start time" });

export const applicationSchema = z.object({
  opportunityId: z.string().min(1).max(40),
  motivation: optionalText(1000),
  availability: optionalText(300),
  wantsReminder: z.boolean().default(true),
});

export const impactSubmissionSchema = z.object({
  title: trimmed(3, 120, "Activity"),
  description: optionalText(1500),
  date: z.coerce
    .date()
    .refine((d) => d.getTime() <= Date.now() + 24 * 3600 * 1000, "Date can't be in the future")
    .refine((d) => d.getTime() >= Date.now() - 366 * 24 * 3600 * 1000, "Date must be within the last year"),
  hours: z.coerce.number().min(0).max(24, "Log at most 24 hours per entry"),
  goalId,
  projectId: z.string().max(40).optional().nullable().transform((v) => v || null),
  opportunityId: z.string().max(40).optional().nullable().transform((v) => v || null),
  evidenceUrl: optionalUrl,
  values: z
    .array(z.object({ metricId: z.string().min(1).max(40), value: z.coerce.number().min(0).max(1e7) }))
    .max(8)
    .default([]),
});

export const reviewSchema = z.object({
  id: z.string().min(1).max(40),
  decision: z.enum(["VERIFIED", "REJECTED"]),
  note: optionalText(500),
});

export const postSchema = z
  .object({
    type: z.enum(["POST", "EVENT"]).default("POST"),
    title: optionalText(120),
    body: trimmed(1, 3000, "Post"),
    goalId: goalId.optional().nullable(),
    groupId: z.string().max(40).optional().nullable().transform((v) => v || null),
    eventStartsAt: optionalDate,
    eventLocation: optionalText(160),
  })
  .refine((p) => p.type !== "EVENT" || (p.title && p.eventStartsAt), {
    path: ["eventStartsAt"],
    message: "Events need a title and a start time",
  });

export const commentSchema = z.object({ postId: z.string().min(1).max(40), body: trimmed(1, 1500, "Comment") });
export const messageSchema = z.object({ recipientId: z.string().min(1).max(40), body: trimmed(1, 2000, "Message") });
export const reportSchema = z.object({
  targetType: z.enum(["POST", "COMMENT", "PROJECT", "USER", "ORGANIZATION", "MESSAGE"]),
  targetId: z.string().min(1).max(40),
  reason: z.enum(["Spam", "Harassment", "Misinformation", "Inappropriate content", "Fake impact claim", "Other"]),
  details: optionalText(1000),
});

export const ORG_TYPES = ["NGO", "UNIVERSITY", "SCHOOL", "COMPANY", "COMMUNITY_GROUP", "YOUTH_ORGANIZATION", "GOVERNMENT"] as const;
export const organizationSchema = z.object({
  name: trimmed(3, 120, "Name"),
  type: z.enum(ORG_TYPES),
  description: trimmed(20, 2000, "Description"),
  mission: optionalText(500),
  website: optionalUrl,
  email: z.email("Enter a valid email").optional().or(z.literal("")).transform((v) => v || undefined),
  logoUrl: optionalUrl,
  city: optionalText(80),
  country: optionalText(80),
});

export const groupSchema = z.object({
  name: trimmed(3, 80, "Name"),
  description: trimmed(10, 500, "Description"),
  goalId: goalId.optional().nullable(),
});

export const assistantSchema = z.object({
  threadId: z.string().max(40).optional().nullable(),
  message: trimmed(1, 4000, "Message"),
});

export const sdgEditSchema = z.object({
  id: goalId,
  tagline: trimmed(5, 200, "Tagline"),
  description: trimmed(20, 3000, "Description"),
  challenges: stringList(12, 300),
  waysToContribute: stringList(12, 300),
  isActive: z.boolean(),
});

export type ProjectInput = z.input<typeof projectSchema>;
export type OpportunityInput = z.input<typeof opportunitySchema>;
export type ImpactSubmissionInput = z.input<typeof impactSubmissionSchema>;
