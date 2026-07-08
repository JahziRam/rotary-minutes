import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type AppConfig = {
  analytics?: {
    gaMeasurementId?: string | null;
  };
  integrations?: Record<string, unknown>;
};

export async function saveGaMeasurementId(gaMeasurementId: string | null): Promise<void> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  const config = (settings?.config as AppConfig | null) ?? {};

  const next: AppConfig = {
    ...config,
    analytics: {
      ...config.analytics,
      gaMeasurementId: gaMeasurementId?.trim() || null,
    },
  };

  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { config: next as unknown as Prisma.InputJsonValue },
    create: {
      id: "global",
      appName: "Rotary Minutes",
      config: next as unknown as Prisma.InputJsonValue,
    },
  });
}