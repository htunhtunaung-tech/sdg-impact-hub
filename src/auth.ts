import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { loginSchema } from "@/lib/validation";
import { ensureProfile } from "@/lib/profile";

class InvalidLogin extends CredentialsSignin {
  code = "invalid_credentials";
}

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // The adapter is only used for Google sign-in (users + linked accounts); sessions are JWTs.
  adapter: PrismaAdapter(db) as never,
  providers: [
    ...(googleEnabled
      ? [
          Google({
            // Google verifies email ownership, so linking to an existing account with the same email is safe.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) throw new InvalidLogin();
        const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
        if (!user?.passwordHash) throw new InvalidLogin();
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok || !user.emailVerified || user.status !== "ACTIVE") throw new InvalidLogin();
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await db.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (existing?.status === "SUSPENDED") return false;
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // OAuth sign-ups: Google has verified the address; create the profile.
      if (!user.id) return;
      await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date(), role: "INDIVIDUAL" } });
      await ensureProfile(user.id, user.name ?? user.email ?? "member");
      await db.activity.create({
        data: { actorId: user.id, type: "JOINED_PLATFORM", message: "joined SDG Impact Hub", link: null },
      });
    },
  },
});

export const isGoogleEnabled = googleEnabled;
