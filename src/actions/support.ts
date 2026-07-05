"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClubContext } from "@/lib/club-context";
import type { SupportTicketStatus } from "@/generated/prisma/client";

function revalidateSupport(locale: string) {
  revalidatePath(`/${locale}/support`);
  revalidatePath(`/${locale}/admin/support`);
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

async function requireSuperAdmin() {
  const user = await requireUser();
  if (!user?.isSuperAdmin) return null;
  return user;
}

export async function createSupportTicket(
  subject: string,
  body: string,
  locale: string
) {
  const user = await requireUser();
  if (!user) return { error: "UNAUTHORIZED" as const };

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject || !trimmedBody) return { error: "VALIDATION" as const };

  const ctx = await getClubContext();

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      clubId: ctx?.clubId ?? null,
      subject: trimmedSubject,
      messages: {
        create: {
          authorId: user.id,
          body: trimmedBody,
          isStaff: false,
        },
      },
    },
  });

  revalidateSupport(locale);
  return { success: true as const, ticketId: ticket.id };
}

export async function addSupportMessage(
  ticketId: string,
  body: string,
  locale: string
) {
  const user = await requireUser();
  if (!user) return { error: "UNAUTHORIZED" as const };

  const trimmedBody = body.trim();
  if (!trimmedBody) return { error: "VALIDATION" as const };

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { error: "NOT_FOUND" as const };
  if (!user.isSuperAdmin && ticket.userId !== user.id) {
    return { error: "UNAUTHORIZED" as const };
  }

  const isStaff = user.isSuperAdmin;

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId,
        authorId: user.id,
        body: trimmedBody,
        isStaff,
      },
    }),
    prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: isStaff
          ? ticket.status === "OPEN"
            ? "IN_PROGRESS"
            : ticket.status
          : "OPEN",
        updatedAt: new Date(),
      },
    }),
  ]);

  revalidateSupport(locale);
  return { success: true as const };
}

export async function updateSupportTicketStatus(
  ticketId: string,
  status: SupportTicketStatus,
  locale: string
) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "UNAUTHORIZED" as const };

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { error: "NOT_FOUND" as const };

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status },
  });

  revalidateSupport(locale);
  return { success: true as const };
}

export async function closeSupportTicket(ticketId: string, locale: string) {
  return updateSupportTicketStatus(ticketId, "CLOSED", locale);
}