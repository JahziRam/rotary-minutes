"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ContactSubmissionStatus } from "@/generated/prisma/client";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) return null;
  return session.user;
}

export async function listContactSubmissions(status?: ContactSubmissionStatus) {
  const user = await requireSuperAdmin();
  if (!user) return { error: "UNAUTHORIZED" as const };

  const items = await prisma.contactSubmission.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return { items };
}

export async function updateContactSubmissionStatus(
  id: string,
  status: ContactSubmissionStatus,
  locale: string
) {
  const user = await requireSuperAdmin();
  if (!user) return { error: "UNAUTHORIZED" as const };

  await prisma.contactSubmission.update({
    where: { id },
    data: {
      status,
      readAt: status === "READ" ? new Date() : undefined,
    },
  });

  revalidatePath(`/${locale}/admin/contacts`);
  return { success: true as const };
}