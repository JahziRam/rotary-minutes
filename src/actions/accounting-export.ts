"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { requireFeature } from "@/lib/require-feature";
import {
  generateContactsCsv,
  generateTreasuryCsv,
  generateTreasuryOfx,
  type TreasuryExportRow,
} from "@/lib/accounting-export";

async function loadTreasuryRows(clubId: string, from?: Date, to?: Date) {
  const entries = await prisma.budgetEntry.findMany({
    where: {
      clubId,
      ...(from || to
        ? {
            date: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    },
    include: { category: { select: { name: true } } },
    orderBy: { date: "asc" },
  });

  const duesPayments = await prisma.duesPayment.findMany({
    where: {
      clubId,
      ...(from || to
        ? {
            paidAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    },
    orderBy: { paidAt: "asc" },
  });

  const budgetRows: TreasuryExportRow[] = entries.map((e) => ({
    id: e.id,
    date: e.date,
    type: e.type,
    amount: Number(e.amount),
    currency: e.currency,
    description: e.description,
    paymentMethod: e.paymentMethod,
    reference: e.reference,
    categoryName: e.category?.name ?? null,
  }));

  const duesRows: TreasuryExportRow[] = duesPayments.map((p) => ({
    id: p.id,
    date: p.paidAt,
    type: "INCOME",
    amount: Number(p.amount),
    currency: p.currency,
    description: `Dues payment${p.receiptNumber ? ` — ${p.receiptNumber}` : ""}`,
    paymentMethod: p.paymentMethod,
    reference: p.reference,
    categoryName: "Cotisations",
  }));

  return [...budgetRows, ...duesRows].sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function exportTreasuryCsv(opts?: { from?: string; to?: string; locale?: string }) {
  const feature = await requireFeature("integrationsEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("settings.manage");
  if (auth.error) return auth;
  const { ctx } = auth;

  const locale = opts?.locale === "en" ? "en" : "fr";
  const rows = await loadTreasuryRows(
    ctx.clubId,
    opts?.from ? new Date(opts.from) : undefined,
    opts?.to ? new Date(opts.to) : undefined
  );

  return {
    success: true,
    content: generateTreasuryCsv(rows, locale),
    filename: `treasury-${ctx.clubId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`,
    mimeType: "text/csv; charset=utf-8",
  };
}

export async function exportTreasuryOfx(opts?: { from?: string; to?: string }) {
  const feature = await requireFeature("integrationsEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("settings.manage");
  if (auth.error) return auth;
  const { ctx } = auth;

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { currency: true, slug: true },
  });

  const rows = await loadTreasuryRows(
    ctx.clubId,
    opts?.from ? new Date(opts.from) : undefined,
    opts?.to ? new Date(opts.to) : undefined
  );

  return {
    success: true,
    content: generateTreasuryOfx(rows, {
      accountId: club?.slug ?? ctx.clubId,
      currency: club?.currency ?? "EUR",
    }),
    filename: `treasury-${club?.slug ?? "club"}-${new Date().toISOString().slice(0, 10)}.ofx`,
    mimeType: "application/x-ofx",
  };
}

export async function syncEmailContacts() {
  const feature = await requireFeature("integrationsEnabled");
  if (feature.error) return feature;
  const auth = await requirePermission("settings.manage");
  if (auth.error) return auth;
  const { ctx } = auth;

  const members = await prisma.member.findMany({
    where: { clubId: ctx.clubId, isActive: true, email: { not: null } },
    select: { email: true, firstName: true, lastName: true, position: true },
  });

  const contacts = members
    .filter((m) => m.email?.includes("@"))
    .map((m) => ({
      email: m.email!,
      firstName: m.firstName,
      lastName: m.lastName,
      company: m.position,
    }));

  for (const contact of contacts) {
    await prisma.emailContact.upsert({
      where: {
        clubId_email: { clubId: ctx.clubId, email: contact.email.toLowerCase() },
      },
      create: {
        clubId: ctx.clubId,
        email: contact.email.toLowerCase(),
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
      },
      update: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
      },
    });
  }

  return {
    success: true,
    synced: contacts.length,
    csv: generateContactsCsv(contacts),
  };
}