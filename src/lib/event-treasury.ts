import { prisma } from "@/lib/prisma";
import type { PaymentMethod, TreasuryCollectionStatus } from "@/generated/prisma/client";

/** Crée ou met à jour une écriture trésorerie liée à une inscription événement. */
export async function syncEventRegistrationTreasury(opts: {
  clubId: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  registrationId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod | null;
  collectionStatus: TreasuryCollectionStatus;
  participantLabel: string;
}) {
  const existing = await prisma.budgetEntry.findFirst({
    where: { eventRegistrationId: opts.registrationId },
  });

  const description = `Événement — ${opts.eventTitle} — ${opts.participantLabel}`;
  const data = {
    clubId: opts.clubId,
    type: "INCOME" as const,
    amount: opts.amount,
    currency: opts.currency,
    date: new Date(),
    description,
    eventId: opts.eventId,
    eventRegistrationId: opts.registrationId,
    paymentMethod: opts.paymentMethod,
    collectionStatus: opts.collectionStatus,
    recordedById: opts.userId,
  };

  if (existing) {
    return prisma.budgetEntry.update({
      where: { id: existing.id },
      data,
    });
  }

  let categoryId: string | null = null;
  const cat = await prisma.budgetCategory.findFirst({
    where: { clubId: opts.clubId, type: "INCOME", name: { in: ["Événements", "Events"] } },
  });
  if (cat) categoryId = cat.id;
  else {
    const created = await prisma.budgetCategory.create({
      data: { clubId: opts.clubId, name: "Événements", type: "INCOME", sortOrder: 5 },
    });
    categoryId = created.id;
  }

  return prisma.budgetEntry.create({
    data: { ...data, categoryId },
  });
}