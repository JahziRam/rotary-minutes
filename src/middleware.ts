import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from "./i18n/config";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/verify",
  "/privacy",
  "/terms",
  "/status",
  "/demo",
  "/case-studies",
];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameWithoutLocale = pathname.replace(/^\/(fr|en)/, "") || "/";

  const isPublic = publicPaths.some(
    (p) =>
      pathnameWithoutLocale === p ||
      pathnameWithoutLocale.startsWith(`${p}/`) ||
      pathnameWithoutLocale.startsWith("/verify/")
  );

  if (!isPublic && !pathnameWithoutLocale.startsWith("/api")) {
    const token =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value;

    if (!token) {
      const locale = pathname.match(/^\/(fr|en)/)?.[1] || defaultLocale;
      return NextResponse.redirect(
        new URL(`/${locale}/login`, request.url)
      );
    }
  }

  const response = intlMiddleware(request);
  const res = response instanceof NextResponse ? response : NextResponse.next();
  res.headers.set("x-pathname", pathnameWithoutLocale);
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};