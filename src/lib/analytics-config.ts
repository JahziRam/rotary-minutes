import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { PRODUCTION_APP_URL } from "@/lib/analytics-constants";
import { normalizeGaId } from "@/lib/analytics-env";

export { PRODUCTION_APP_URL };
export { normalizeGaId, getEnvAnalyticsConfig } from "@/lib/analytics-env";

type AppConfig = {
  analytics?: {
    gaMeasurementId?: string;
  };
};

async function readGaIdFromDb(): Promise<string | null> {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
    return normalizeGaId(
      (settings?.config as AppConfig | null)?.analytics?.gaMeasurementId
    );
  } catch {
    return null;
  }
}

export const getGaMeasurementId = cache(async (): Promise<string | null> => {
  const fromDb = await readGaIdFromDb();
  if (fromDb) return fromDb;
  return normalizeGaId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
});

export async function isAnalyticsConfigured(): Promise<boolean> {
  const id = await getGaMeasurementId();
  if (!id) return false;
  if (process.env.NEXT_PUBLIC_GA_ENABLED === "false") return false;
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_GA_ENABLED !== "true") {
    return false;
  }
  return true;
}

export async function getAnalyticsAdminView(): Promise<{
  gaMeasurementId: string;
  configured: boolean;
  productionUrl: string;
}> {
  let fromDb = "";
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
    fromDb =
      (settings?.config as AppConfig | null)?.analytics?.gaMeasurementId?.trim() ?? "";
  } catch {
    // DB unavailable at build time — fall back to env
  }

  const gaMeasurementId =
    fromDb || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

  return {
    gaMeasurementId,
    configured: normalizeGaId(gaMeasurementId) !== null,
    productionUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || PRODUCTION_APP_URL,
  };
}