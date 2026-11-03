import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

/** Routes that require a signed-in user. Public browsing (SDGs, projects, volunteer, orgs) stays open. */
const PROTECTED = [
  "/dashboard",
  "/impact",
  "/assistant",
  "/community",
  "/messages",
  "/notifications",
  "/settings",
  "/admin",
  "/challenges",
  "/projects/new",
  "/volunteer/new",
  "/volunteer/manage",
  "/organizations/new",
];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const needsAuth =
    PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    /^\/projects\/[^/]+\/(edit|manage)/.test(pathname) ||
    /^\/volunteer\/[^/]+\/apply/.test(pathname);
  if (needsAuth && !req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
