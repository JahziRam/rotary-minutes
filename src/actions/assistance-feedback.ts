"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import { ASSISTANCE_EVENT_TYPES } from "@/lib/assistance/analytics";
import { trackAssistanceEvent } from "@/actions/assistance-analytics";

export async function submitAssistanceFeedback(input: {
  rating: number;
  comment?: string;
  context?: string;
}) {
  const ctx = await getClubContext();
  if (!ctx || ctx.isSuperAdmin) return { error: "UNAUTHORIZED" as const };

  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const comment = input.comment?.trim().slice(0, 2000) || null;

  await prisma.assistanceFeedback.create({
    data: {
      clubId: ctx.clubId,
      userId: ctx.userId,
      rating,
      comment,
      context: input.context?.trim().slice(0, 64) || null,
    },
  });

  await trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.FEEDBACK_SUBMITTED, {
    rating,
    context: input.context,
  });

  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/admin`);
  }

  return { success: true as const };
}