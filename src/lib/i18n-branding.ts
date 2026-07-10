import { DEFAULT_APP_NAME, type AppBranding } from "@/lib/app-branding-shared";

function replaceInMessages<T>(value: T, from: string, to: string): T {
  if (typeof value === "string") return value.replaceAll(from, to) as T;
  if (Array.isArray(value)) return value.map((item) => replaceInMessages(item, from, to)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceInMessages(item, from, to)])
    ) as T;
  }
  return value;
}

/** Injects SaaS branding into next-intl messages (app.name + global product name). */
export function patchMessagesWithBranding<T extends Record<string, unknown>>(
  messages: T,
  branding: AppBranding
): T {
  const base = {
    ...messages,
    app: {
      ...(typeof messages.app === "object" && messages.app !== null
        ? (messages.app as Record<string, unknown>)
        : {}),
      name: branding.appName,
      ...(branding.tagline ? { tagline: branding.tagline } : {}),
    },
  } as T;

  if (branding.appName === DEFAULT_APP_NAME) return base;
  return replaceInMessages(base, DEFAULT_APP_NAME, branding.appName);
}