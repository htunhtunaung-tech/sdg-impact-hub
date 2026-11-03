import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config shared by middleware and the full server config.
 * No database access here — middleware only checks that a session exists;
 * authorization is always re-checked server-side against the database.
 */
export const authConfig = {
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
