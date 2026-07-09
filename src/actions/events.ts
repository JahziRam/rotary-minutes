"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/require-feature";
import { requirePermission } from "@/lib/require-permission";
import { hasRolePermission } from "@/lib/roles";
import { randomUUID } from "node:crypto";
import { getClubFeatures } from "@/lib/features";
import { syncEventRegistrationTreasury } from "@/lib/event-treasury";
import type {
  ClubEventStatus,
  EventRegistrationStatus,
  PaymentMethod,
  TreasuryCollectionStatus,
} from "@/generated/prisma/client";

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

  const features = await getClubFeatures(ctx.clubId);
  const event = await prisma.clubEvent.findFirst({
    where: { id: eventId, clubId: ctx.clubId },
    include: {
      priceTiers: { orderBy: { sortOrder: "asc" } },
      ticketSlots: { orderBy: { ticketNumber: "asc" } },
      registrations: {
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          priceTier: true,
          ticketSlot: true,
        },
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
      priceTiers: event.priceTiers.map((t) => ({
        id: t.id,
        label: t.label,
        price: Number(t.price),
        sortOrder: t.sortOrder,
        maxQty: t.maxQty,
      })),
      ticketSlots: event.ticketSlots.map((s) => ({
        id: s.id,
        ticketNumber: s.ticketNumber,
        label: s.label,
        isReserved: s.isReserved,
        registrationId: s.registrationId,
      })),
    },
    registrations: event.registrations.map((r) => ({
      id: r.id,
      memberId: r.memberId,
      guestName: r.guestName,
      email: r.email,
      phone: r.phone,
      quantity: r.quantity,
      priceTierId: r.priceTierId,
      orderGroupId: r.orderGroupId,
      status: r.status,
      paidAt: r.paidAt?.toISOString() ?? null,
      paymentMethod: r.paymentMethod,
      amount: r.amount ? Number(r.amount) : null,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      member: r.member,
      priceTierLabel: r.priceTier?.label ?? null,
      ticketNumber: r.ticketSlot?.ticketNumber ?? null,
    })),
    canManage,
    eventsAdvanced: features.eventsAdvancedEnabled,
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

  if (existing.status === "CANCELLED" && data.status !== "CANCELLED") {
    return { error: "EVENT_CANCELLED" as const };
  }

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

export async function reactivateEvent(eventId: string) {
  const auth = await requireEventsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const existing = await prisma.clubEvent.findFirst({
    where: { id: eventId, clubId: ctx.clubId },
  });
  if (!existing) return { error: "NOT_FOUND" as const };
  if (existing.status !== "COMPLETED") return { error: "NOT_COMPLETED" as const };

  await prisma.clubEvent.update({
    where: { id: eventId },
    data: { status: "PUBLISHED" },
  });
  revalidateEvents(eventId);
  return { success: true as const };
}

export async function saveEventPriceTiers(
  eventId: string,
  tiers: Array<{ id?: string; label: string; price: number; sortOrder?: number; maxQty?: number | null }>
) {
  const auth = await requireEventsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const features = await getClubFeatures(ctx.clubId);
  if (!features.eventsAdvancedEnabled) return { error: "FEATURE_DISABLED" as const };

  const event = await prisma.clubEvent.findFirst({
    where: { id: eventId, clubId: ctx.clubId },
  });
  if (!event) return { error: "NOT_FOUND" as const };

  await prisma.eventPriceTier.deleteMany({ where: { eventId } });
  if (tiers.length > 0) {
    await prisma.eventPriceTier.createMany({
      data: tiers.map((t, i) => ({
        eventId,
        label: t.label.trim(),
        price: t.price,
        sortOrder: t.sortOrder ?? i,
        maxQty: t.maxQty ?? null,
      })),
    });
  }

  revalidateEvents(eventId);
  return { success: true as const };
}

export async function saveEventTicketSlots(
  eventId: string,
  slots: Array<{ ticketNumber: string; label?: string }>
) {
  const auth = await requireEventsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const features = await getClubFeatures(ctx.clubId);
  if (!features.eventsAdvancedEnabled) return { error: "FEATURE_DISABLED" as const };

  const event = await prisma.clubEvent.findFirst({
    where: { id: eventId, clubId: ctx.clubId },
  });
  if (!event) return { error: "NOT_FOUND" as const };

  const reserved = await prisma.eventTicketSlot.findMany({
    where: { eventId, isReserved: true },
    select: { ticketNumber: true },
  });
  const reservedNums = new Set(reserved.map((r) => r.ticketNumber));

  await prisma.eventTicketSlot.deleteMany({
    where: { eventId, isReserved: false },
  });

  const toCreate = slots
    .map((s) => ({
      ticketNumber: s.ticketNumber.trim(),
      label: s.label?.trim() || null,
    }))
    .filter((s) => s.ticketNumber && !reservedNums.has(s.ticketNumber));

  if (toCreate.length > 0) {
    await prisma.eventTicketSlot.createMany({
      data: toCreate.map((s) => ({ eventId, ...s })),
      skipDuplicates: true,
    });
  }

  revalidateEvents(eventId);
  return { success: true as const };
}

export async function registerForEvent(
  eventId: string,
  data: {
    memberId?: string;
    guestName?: string;
    email?: string;
    phone?: string;
    quantity?: number;
    priceTierId?: string;
    ticketSlotIds?: string[];
    paymentMethod?: PaymentMethod;
    amount?: number;
    notes?: string;
    collectionStatus?: TreasuryCollectionStatus;
  }
) {
  const auth = await requireEventsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const features = await getClubFeatures(ctx.clubId);
  const quantity = Math.max(1, Math.min(features.eventsAdvancedEnabled ? data.quantity ?? 1 : 1, 20));

  const event = await prisma.clubEvent.findFirst({
    where: { id: eventId, clubId: ctx.clubId, status: "PUBLISHED" },
    include: {
      priceTiers: true,
      _count: { select: { registrations: { where: { status: { in: ["PENDING", "CONFIRMED"] } } } } },
    },
  });
  if (!event) return { error: "NOT_FOUND" as const };

  let memberId = data.memberId ?? null;
  if (!memberId) {
    const myMember = await prisma.member.findFirst({
      where: { clubId: ctx.clubId, userId: ctx.userId },
      select: { id: true, firstName: true, lastName: true },
    });
    memberId = myMember?.id ?? null;
  }

  if (!memberId && !data.guestName?.trim()) {
    return { error: "NO_PARTICIPANT" as const };
  }

  if (memberId && quantity === 1) {
    const existing = await prisma.eventRegistration.findFirst({
      where: { eventId, memberId, status: { not: "CANCELLED" } },
    });
    if (existing) return { error: "ALREADY_REGISTERED" as const };
  }

  let unitPrice = event.price ? Number(event.price) : 0;
  if (data.priceTierId) {
    const tier = event.priceTiers.find((t) => t.id === data.priceTierId);
    if (!tier) return { error: "INVALID_TIER" as const };
    unitPrice = Number(tier.price);
  }

  const ticketSlotIds = features.eventsAdvancedEnabled ? data.ticketSlotIds ?? [] : [];
  if (ticketSlotIds.length > 0 && ticketSlotIds.length !== quantity) {
    return { error: "TICKET_COUNT_MISMATCH" as const };
  }

  const activeCount = event._count.registrations;
  if (event.maxAttendees && activeCount + quantity > event.maxAttendees) {
    if (activeCount >= event.maxAttendees) {
      const reg = await prisma.eventRegistration.create({
        data: {
          eventId,
          memberId,
          guestName: data.guestName?.trim() || null,
          email: data.email?.trim() || null,
          phone: data.phone?.trim() || null,
          quantity,
          priceTierId: data.priceTierId ?? null,
          status: "WAITLIST",
          notes: data.notes?.trim() || null,
        },
      });
      revalidateEvents(eventId);
      return { success: true as const, registrationId: reg.id, waitlisted: true as const };
    }
    return { error: "CAPACITY_EXCEEDED" as const };
  }

  const requiresPayment = event.requiresPayment && (unitPrice > 0 || event.price);
  const orderGroupId = quantity > 1 ? randomUUID() : null;
  const registrationIds: string[] = [];
  const member = memberId
    ? await prisma.member.findUnique({
        where: { id: memberId },
        select: { firstName: true, lastName: true },
      })
    : null;
  const participantLabel = member
    ? `${member.firstName} ${member.lastName}`
    : data.guestName?.trim() ?? "Invité";

  for (let i = 0; i < quantity; i++) {
    const ticketSlotId = ticketSlotIds[i];
    if (ticketSlotId) {
      const slot = await prisma.eventTicketSlot.findFirst({
        where: { id: ticketSlotId, eventId, isReserved: false },
      });
      if (!slot) return { error: "TICKET_UNAVAILABLE" as const };
    }

    const paid = Boolean(data.paymentMethod);
    const status: EventRegistrationStatus =
      requiresPayment && !paid ? "PENDING" : "CONFIRMED";
    const lineAmount = data.amount ?? unitPrice;

    const reg = await prisma.eventRegistration.create({
      data: {
        eventId,
        memberId: i === 0 ? memberId : null,
        guestName: i === 0 ? data.guestName?.trim() || null : null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        quantity: 1,
        orderGroupId,
        priceTierId: data.priceTierId ?? null,
        status,
        paymentMethod: data.paymentMethod ?? null,
        amount: lineAmount > 0 ? lineAmount : null,
        paidAt: paid ? new Date() : null,
        notes: data.notes?.trim() || null,
      },
    });

    if (ticketSlotId) {
      await prisma.eventTicketSlot.update({
        where: { id: ticketSlotId },
        data: { isReserved: true, registrationId: reg.id },
      });
    }

    if (paid && lineAmount > 0) {
      const collectionStatus: TreasuryCollectionStatus =
        data.collectionStatus ??
        (data.paymentMethod === "CHECK" || data.paymentMethod === "CASH"
          ? "COLLECTED"
          : "COLLECTED");
      await syncEventRegistrationTreasury({
        clubId: ctx.clubId,
        userId: ctx.userId,
        eventId,
        eventTitle: event.title,
        registrationId: reg.id,
        amount: lineAmount,
        currency: event.currency,
        paymentMethod: data.paymentMethod ?? null,
        collectionStatus,
        participantLabel:
          quantity > 1 ? `${participantLabel} (bil. ${i + 1}/${quantity})` : participantLabel,
      });
    }

    registrationIds.push(reg.id);
  }

  revalidateEvents(eventId);
  for (const loc of ["fr", "en"]) revalidatePath(`/${loc}/treasury`);
  return {
    success: true as const,
    registrationId: registrationIds[0],
    registrationIds,
    orderGroupId,
  };
}

export async function cancelRegistration(registrationId: string) {
  const auth = await requireEventsView();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const reg = await prisma.eventRegistration.findFirst({
    where: { id: registrationId },
    include: {
      event: { select: { id: true, clubId: true } },
      treasuryEntry: { select: { id: true } },
      ticketSlot: { select: { id: true } },
    },
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

  if (reg.ticketSlot) {
    await prisma.eventTicketSlot.update({
      where: { id: reg.ticketSlot.id },
      data: { isReserved: false, registrationId: null },
    });
  }

  if (reg.treasuryEntry) {
    await prisma.budgetEntry.delete({ where: { id: reg.treasuryEntry.id } });
    for (const loc of ["fr", "en"]) revalidatePath(`/${loc}/treasury`);
  }

  revalidateEvents(reg.event.id);
  return { success: true as const };
}

export async function markEventRegistrationPaid(
  registrationId: string,
  paymentMethod: PaymentMethod,
  collectionStatus: TreasuryCollectionStatus
) {
  const auth = await requireEventsManage();
  if ("error" in auth && auth.error) return { error: auth.error as string };
  const { ctx } = auth;

  const reg = await prisma.eventRegistration.findFirst({
    where: { id: registrationId },
    include: {
      event: { select: { id: true, clubId: true, title: true, currency: true } },
      member: { select: { firstName: true, lastName: true } },
    },
  });
  if (!reg || reg.event.clubId !== ctx.clubId) return { error: "NOT_FOUND" as const };
  if (reg.status === "CANCELLED") return { error: "CANCELLED" as const };

  const amount = reg.amount ? Number(reg.amount) : 0;
  if (amount <= 0) return { error: "NO_AMOUNT" as const };

  const paidAt = new Date();
  await prisma.eventRegistration.update({
    where: { id: registrationId },
    data: {
      paidAt,
      paymentMethod,
      status: "CONFIRMED",
    },
  });

  const participantLabel = reg.member
    ? `${reg.member.firstName} ${reg.member.lastName}`
    : reg.guestName?.trim() ?? "Invité";

  await syncEventRegistrationTreasury({
    clubId: ctx.clubId,
    userId: ctx.userId,
    eventId: reg.event.id,
    eventTitle: reg.event.title,
    registrationId: reg.id,
    amount,
    currency: reg.event.currency,
    paymentMethod,
    collectionStatus,
    participantLabel,
  });

  revalidateEvents(reg.event.id);
  for (const loc of ["fr", "en"]) revalidatePath(`/${loc}/treasury`);
  return { success: true as const, paidAt: paidAt.toISOString() };
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
        include: { member: true, ticketSlot: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!event) return { error: "NOT_FOUND" as const };

  const header = "Name,Email,Phone,Ticket,Status,Payment,PaidAt,Amount,Notes\n";
  const rows = event.registrations.map((r) => {
    const name = r.member
      ? `${r.member.firstName} ${r.member.lastName}`
      : r.guestName ?? "";
    const email = r.email ?? r.member?.email ?? "";
    const phone = r.phone ?? r.member?.phone ?? "";
    return [
      `"${name.replace(/"/g, '""')}"`,
      `"${email.replace(/"/g, '""')}"`,
      `"${phone.replace(/"/g, '""')}"`,
      r.ticketSlot?.ticketNumber ?? "",
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