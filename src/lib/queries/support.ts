import { prisma } from "@/lib/prisma";
import type { SupportTicketStatus } from "@/generated/prisma/client";

export async function getUserSupportTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      club: { select: { name: true } },
      _count: { select: { messages: true } },
    },
  });
}

export async function getSupportTicketDetail(ticketId: string, userId: string, isStaff: boolean) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      user: { select: { firstName: true, lastName: true, email: true } },
      club: { select: { name: true } },
    },
  });

  if (!ticket) return null;
  if (!isStaff && ticket.userId !== userId) return null;
  return ticket;
}

export async function getAdminSupportTickets(status?: SupportTicketStatus) {
  return prisma.supportTicket.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      club: { select: { name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { messages: true } },
    },
  });
}