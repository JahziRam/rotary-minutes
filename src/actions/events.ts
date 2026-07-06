"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import type { ClubEventStatus, EventRegistrationStatus, PaymentMethod } from "@/generated/prisma/client";

function revalidateEvents(eventId?: string) {
  for (const loc of ["fr", "en"]) {
    revalidatePath(`/${loc}/events`);
    if (eventId) revalidatePath(`/${loc}/events/${eventId}`);
    revalidatePath(`/${loc}/my-account`);
    revalidatePath(`/${loc}/calendar`);
  }
}

async function requireEventsView() {
  const feature = await requireFeature("eventsEnabled");
  if (feature.error) return feature;
  const ctx = feature.ctx;
  if (ctx.isSuperAdmin) return { ctx };
  const allowed = await hasRolePermission(ctx.role, "events.view", false);
  if (!allowed) return { error: "FORBIDDEN" as const };
  return { ctx };
}

async function requireEventsManage() {
  const feature = await requireFeature("eventsEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("events.manage");
  if (auth.error) return auth;
  return auth;
}

export async function listEvents(filters?: { status?: ClubEventStatus; upcoming?: boolean }) {
  const auth = await requireEventsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const now = new Date();
  const events = await prisma.clubEvent.findMany({
    where: {
      clubId: ctx.clubId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.upcoming ? { startAt: { gte: now }, status: "PUBLISHED" } : {}),
    },
    include: {
      _count: { select: { registrations: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const canManage = await hasRolePermission(ctx.role, "events.manage", ctx.isSuperAdmin);
  const myMember = await prisma.member.findFirst({
    where: { clubId: ctx.clubId, userId: ctx.userId },
    select: { id: true },
  });

  return {
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt?.toISOString() ?? null,
      status: e.status,
      maxAttendees: e.maxAttendees,
      price: e.price ? Number(e.price) : null,
      currency: e.currency,
      requiresPayment: e.requiresPayment,
      registrationCount: e._count.registrations,
    })),
    canManage,
    myMemberId: myMember?.id ?? null,
  };
}

export async function getEventDetail(eventId: string) {
  const auth = await requireEventsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const event = await prisma.clubEvent.findFirst({
    where: { id: eventId, clubId: ctx.clubId },
    include: {
      registrations: {
        include: { member: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { registrations: true } },
    },
  });
  if (!event) return { error: "NOT_FOUND" as const };

  const canManage = await hasRolePermission(ctx.role, "events.manage", ctx.isSuperAdmin);
  const myMember = await prisma.member.findFirst({
    where: { clubId: ctx.clubId, userId: ctx.userId },
    select: { id: true },
  });
  const myRegistration = myMember
    ? event.registrations.find((r) => r.memberId === myMember.id)
    : null;

  return {
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt?.toISOString() ?? null,
      status: event.status,
      maxAttendees: event.maxAttendees,
      price: event.price ? Number(event.price) : null,
      currency: event.currency,
      requiresPayment: event.requiresPayment,
      registrationCount: event._count.registrations,
    },
    registrations: event.registrations.map((r) => ({
      id: r.id,
      memberId: r.memberId,
      guestName: r.guestName,
      email: r.email,
      status: r.status,
      paidAt: r.paidAt?.toISOString() ?? null,
      paymentMethod: r.paymentMethod,
      amount: r.amount ? Number(r.amount) : null,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      member: r.member,
    })),
    canManage,
    myMemberId: myMember?.id ?? null,
    myRegistration: myRegistration
      ? {
          id: myRegistration.id,
          status: myRegistration.status,
        }
      : null,
  };
}

export async function createEvent(data: {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt?: string;
  maxAttendees?: number;
  price?: number;
  currency?: string;
  requiresPayment?: boolean;
}) {
  const auth = await requireEventsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const event = await prisma.clubEvent.create({
    data: {
      clubId: ctx.clubId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      location: data.location?.trim() || null,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
      maxAttendees: data.maxAttendees ?? null,
      price: data.price ?? null,
      currency: data.currency ?? ctx.club.currency,
      requiresPayment: data.requiresPayment ?? false,
      status: "DRAFT",
    },
  });

  const { dispatchClubWebhook } = await import("@/lib/club-webhooks");
  void dispatchClubWebhook(ctx.clubId, "EVENT_CREATED", {
    eventId: event.id,
    title: event.title,
    startAt: event.startAt.toISOString(),
  });

  revalidateEvents(event.id);
  return { success: true as const, eventId: event.id };
}

export async function updateEvent(
  eventId: string,
  data: {
    title?: string;
    description?: string;
    location?: string;
    startAt?: string;
    endAt?: string | null;
    maxAttendees?: number | null;
    price?: number | null;
    currency?: string;
    requiresPayment?: boolean;
    status?: ClubEventStatus;
  }
) {
  const auth = await requireEventsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const existing = await prisma.clubEvent.findFirst({
    where: { id: eventId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };

  await prisma.clubEvent.update({
    where: { id: eventId },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
      ...(data.location !== undefined && { location: data.location?.trim() || null }),
      ...(data.startAt !== undefined && { startAt: new Date(data.startAt) }),
      ...(data.endAt !== undefined && { endAt: data.endAt ? new Date(data.endAt) : null }),
      ...(data.maxAttendees !== undefined && { maxAttendees: data.maxAttendees }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.requiresPayment !== undefined && { requiresPayment: data.requiresPayment }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  revalidateEvents(eventId);
  return { success: true as const };
}

export async function publishEvent(eventId: string) {
  return updateEvent(eventId, { status: "PUBLISHED" });
}

export async function registerForEvent(
  eventId: string,
  data: {
    memberId?: string;
    guestName?: string;
    email?: string;
    paymentMethod?: PaymentMethod;
    amount?: number;
    notes?: string;
  }
) {
  const auth = await requireEventsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const event = await prisma.clubEvent.findFirst({
    where: { id: eventId, clubId: ctx.clubId, status: "PUBLISHED" },
    include: { _count: { select: { registrations: { where: { status: { in: ["PENDING", "CONFIRMED"] } } } } } },
  });
  if (!event) return { error: "NOT_FOUND" as const };

  let memberId = data.memberId ?? null;
  if (!memberId) {
    const myMember = await prisma.member.findFirst({
      where: { clubId: ctx.clubId, userId: ctx.userId },
      select: { id: true },
    });
    memberId = myMember?.id ?? null;
  }

  if (!memberId && !data.guestName?.trim()) {
    return { error: "NO_PARTICIPANT" as const };
  }

  if (memberId) {
    const existing = await prisma.eventRegistration.findFirst({
      where: { eventId, memberId, status: { not: "CANCELLED" } },
    });
    if (existing) return { error: "ALREADY_REGISTERED" as const };
  }

  if (event.maxAttendees && event._count.registrations >= event.maxAttendees) {
    const status: EventRegistrationStatus = "WAITLIST";
    const reg = await prisma.eventRegistration.create({
      data: {
        eventId,
        memberId,
        guestName: data.guestName?.trim() || null,
        email: data.email?.trim() || null,
        status,
        notes: data.notes?.trim() || null,
      },
    });
    revalidateEvents(eventId);
    return { success: true as const, registrationId: reg.id, waitlisted: true as const };
  }

  const requiresPayment = event.requiresPayment && event.price;
  const reg = await prisma.eventRegistration.create({
    data: {
      eventId,
      memberId,
      guestName: data.guestName?.trim() || null,
      email: data.email?.trim() || null,
      status: requiresPayment && !data.paymentMethod ? "PENDING" : "CONFIRMED",
      paymentMethod: data.paymentMethod ?? null,
      amount: data.amount ?? (event.price ? Number(event.price) : null),
      paidAt: data.paymentMethod ? new Date() : null,
      notes: data.notes?.trim() || null,
    },
  });

  revalidateEvents(eventId);
  return { success: true as const, registrationId: reg.id };
}

export async function cancelRegistration(registrationId: string) {
  const auth = await requireEventsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const reg = await prisma.eventRegistration.findFirst({
    where: { id: registrationId },
    include: { event: { select: { id: true, clubId: true } } },
  });
  if (!reg || reg.event.clubId !== ctx.clubId) return { error: "NOT_FOUND" as const };

  const canManage = await hasRolePermission(ctx.role, "events.manage", ctx.isSuperAdmin);
  if (!canManage) {
    const myMember = await prisma.member.findFirst({
      where: { clubId: ctx.clubId, userId: ctx.userId },
      select: { id: true },
    });
    if (!myMember || reg.memberId !== myMember.id) {
      return { error: "FORBIDDEN" as const };
    }
  }

  await prisma.eventRegistration.update({
    where: { id: registrationId },
    data: { status: "CANCELLED" },
  });

  revalidateEvents(reg.event.id);
  return { success: true as const };
}

export async function listRegistrations(eventId: string) {
  const detail = await getEventDetail(eventId);
  if ("error" in detail && detail.error) return detail;
  return {
    registrations: detail.registrations,
    canManage: detail.canManage,
  };
}

export async function exportParticipants(eventId: string) {
  const auth = await requireEventsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const event = await prisma.clubEvent.findFirst({
    where: { id: eventId, clubId: ctx.clubId },
    include: {
      registrations: {
        where: { status: { not: "CANCELLED" } },
        include: { member: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!event) return { error: "NOT_FOUND" as const };

  const header = "Name,Email,Status,Payment,PaidAt,Amount,Notes\n";
  const rows = event.registrations.map((r) => {
    const name = r.member
      ? `${r.member.firstName} ${r.member.lastName}`
      : r.guestName ?? "";
    const email = r.email ?? r.member?.email ?? "";
    return [
      `"${name.replace(/"/g, '""')}"`,
      `"${email.replace(/"/g, '""')}"`,
      r.status,
      r.paymentMethod ?? "",
      r.paidAt?.toISOString() ?? "",
      r.amount ? Number(r.amount) : "",
      `"${(r.notes ?? "").replace(/"/g, '""')}"`,
    ].join(",");
  });

  const csv = header + rows.join("\n");
  const filename = `event-${event.title.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 30)}-participants.csv`;

  return {
    success: true as const,
    csv,
    filename,
  };
}