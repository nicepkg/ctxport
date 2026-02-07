import { defaultLocale, locales } from "@ctxport/shared-ui/i18n/core";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_FILE = /\.(?:\w+)$/;
const localeSet = new Set<string>(locales);
const fallbackLocale = localeSet.has(defaultLocale)
  ? defaultLocale
  : locales[0];

function isLocaleLike(segment: string) {
  return /^[a-z]{2}(-[a-z0-9]+)?$/i.test(segment);
}

function isPublicPath(pathname: string) {
  const prefixes = ["/_next", "/favicon", "/robots.txt", "/sitemap"];
  return (
    prefixes.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_FILE.test(pathname)
  );
}

function getSegments(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

function buildRedirectPath(pathname: string) {
  const [first = "", ...rest] = getSegments(pathname);
  if (isLocaleLike(first)) {
    return `/${fallbackLocale}/${rest.join("/")}`;
  }
  return `/${fallbackLocale}${pathname}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const segments = getSegments(pathname);
  if (segments.length === 0) {
    const url = request.nextUrl.clone();
    url.pathname = `/${fallbackLocale}`;
    return NextResponse.redirect(url);
  }

  if (localeSet.has(segments[0] ?? "")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = buildRedirectPath(pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
