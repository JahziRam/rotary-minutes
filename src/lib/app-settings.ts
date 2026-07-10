import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_APP_NAME,
  type AppBranding,
} from "@/lib/app-branding-shared";

// Pure helpers (DEFAULT_APP_NAME, splitAppBrandName) live in app-branding-shared —
// import those from there in client components so Prisma/pg never enter the browser bundle.

const DEFAULT_SETTINGS = {
  appName: DEFAULT_APP_NAME,
  tagline: null as string | null,
  supportEmail: null as string | null,
  trialDays: 14,
  maintenanceMode: false,
};

export const getAppSettings = cache(async () => {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: "global" },
      select: {
        appName: true,
        tagline: true,
        supportEmail: true,
        trialDays: true,
        maintenanceMode: true,
      },
    });

    return {
      appName: settings?.appName?.trim() || DEFAULT_APP_NAME,
      tagline: settings?.tagline?.trim() || null,
      supportEmail: settings?.supportEmail?.trim() || null,
      trialDays: settings?.trialDays ?? 14,
      maintenanceMode: settings?.maintenanceMode ?? false,
    };
  } catch {
    // Build-time prerender / DB unavailable: fall back so `next build` does not fail
    return { ...DEFAULT_SETTINGS };
  }
});

export const getAppBranding = cache(async (): Promise<AppBranding> => {
  const settings = await getAppSettings();
  return {
    appName: settings.appName,
    tagline: settings.tagline,
  };
});

export async function getAppName(): Promise<string> {
  const { appName } = await getAppBranding();
  return appName;
}
