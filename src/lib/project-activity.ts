import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function logProjectActivity(opts: {
  projectId: string;
  clubId: string;
  userId?: string | null;
  action: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.projectActivityLog.create({
      data: {
        projectId: opts.projectId,
        clubId: opts.clubId,
        userId: opts.userId ?? null,
        action: opts.action,
        summary: opts.summary,
        metadata: opts.metadata,
      },
    });
  } catch (error) {
    console.error("[project-activity]", error);
  }
}
