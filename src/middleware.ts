import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from "./i18n/config";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

const LOCALE_PATTERN = new RegExp(`^/(${locales.join("|")})`);

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/pending-approval",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/privacy",
  "/terms",
  "/status",
  "/demo",
  "/case-studies",
  "/clubs",
  "/check-in",
  "/help",
];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameWithoutLocale = pathname.replace(LOCALE_PATTERN, "") || "/";

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
      const locale = pathname.match(LOCALE_PATTERN)?.[1] || defaultLocale;
      return NextResponse.redirect(
        new URL(`/${locale}/login`, request.url)
      );
    }
  }

  const response = intlMiddleware(request);
  const res = response instanceof NextResponse ? response : NextResponse.next();
  const uiLocale = pathname.match(LOCALE_PATTERN)?.[1] || defaultLocale;
  res.headers.set("x-pathname", pathnameWithoutLocale);
  res.headers.set("x-locale", uiLocale);
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};