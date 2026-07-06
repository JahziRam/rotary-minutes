import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getAppBaseUrl } from "@/lib/app-url";
import { isDataUrl } from "@/lib/image-storage";
import { resolveClubLogoUrl } from "@/lib/media-url";
import { fiscalYearLabel, formatDuesMoney } from "@/lib/dues";
import type { DuesPaymentPlan, DuesStatus } from "@/generated/prisma/client";

type ClubForPdf = {
  id: string;
  name: string;
  address?: string | null;
  meetingLocation?: string | null;
  logoUrl?: string | null;
  language: string;
};

type MemberForPdf = {
  firstName: string;
  lastName: string;
  email?: string | null;
  duesPaymentPlan?: DuesPaymentPlan;
};

type DuesForPdf = {
  fiscalYear: number;
  periodLabel?: string | null;
  paymentPlan: DuesPaymentPlan;
  amount: number | { toNumber?: () => number };
  currency: string;
  dueDate: Date;
  paidAt?: Date | null;
  status: DuesStatus;
  invoiceNumber?: string | null;
  receiptNumber?: string | null;
};

function resolveLogo(club: ClubForPdf, baseUrl: string): string | undefined {
  if (!club.logoUrl) return undefined;
  if (isDataUrl(club.logoUrl)) return club.logoUrl;
  return resolveClubLogoUrl(club.id, club.logoUrl, baseUrl) ?? club.logoUrl;
}

function planLabel(plan: DuesPaymentPlan, locale: string): string {
  const isFr = locale === "fr";
  return plan === "MONTHLY" ? (isFr ? "Mensuel" : "Monthly") : isFr ? "Annuel" : "Annual";
}

function statusLabel(status: DuesStatus, locale: string): string {
  const isFr = locale === "fr";
  const map: Record<DuesStatus, string> = isFr
    ? { PENDING: "En attente", PAID: "Payée", OVERDUE: "En retard", WAIVED: "Exonérée" }
    : { PENDING: "Pending", PAID: "Paid", OVERDUE: "Overdue", WAIVED: "Waived" };
  return map[status];
}

function toAmount(amount: DuesForPdf["amount"]): number {
  return typeof amount === "number" ? amount : Number(amount);
}

export async function buildDuesInvoicePdfBuffer(
  club: ClubForPdf,
  member: MemberForPdf,
  dues: DuesForPdf,
  locale: string
): Promise<{ buffer: Buffer; filename: string }> {
  const baseUrl = getAppBaseUrl();
  const dateLocale = locale === "en" ? enUS : fr;
  const { renderDuesInvoicePdf } = await import("@/lib/pdf/render");

  const data = {
    club: {
      name: club.name,
      address: club.address ?? club.meetingLocation ?? undefined,
      logoUrl: resolveLogo(club, baseUrl),
    },
    member: {
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email ?? undefined,
    },
    invoiceNumber: dues.invoiceNumber ?? `INV-${dues.fiscalYear}`,
    fiscalYear: fiscalYearLabel(dues.fiscalYear),
    periodLabel: dues.periodLabel ?? fiscalYearLabel(dues.fiscalYear),
    paymentPlan: planLabel(dues.paymentPlan, locale),
    amount: formatDuesMoney(toAmount(dues.amount), dues.currency, locale),
    dueDate: format(dues.dueDate, "d MMMM yyyy", { locale: dateLocale }),
    issuedAt: format(new Date(), "d MMMM yyyy", { locale: dateLocale }),
    locale,
  };

  const buffer = await renderDuesInvoicePdf(data);
  const slug = `${member.lastName}-${member.firstName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return { buffer, filename: `facture-cotisation-${slug}.pdf` };
}

export async function buildDuesReceiptPdfBuffer(
  club: ClubForPdf,
  member: MemberForPdf,
  dues: DuesForPdf,
  locale: string,
  method?: string
): Promise<{ buffer: Buffer; filename: string }> {
  const baseUrl = getAppBaseUrl();
  const dateLocale = locale === "en" ? enUS : fr;
  const { renderDuesReceiptPdf } = await import("@/lib/pdf/render");

  const data = {
    club: {
      name: club.name,
      address: club.address ?? club.meetingLocation ?? undefined,
      logoUrl: resolveLogo(club, baseUrl),
    },
    member: { firstName: member.firstName, lastName: member.lastName },
    receiptNumber: dues.receiptNumber ?? `REC-${dues.fiscalYear}`,
    fiscalYear: fiscalYearLabel(dues.fiscalYear),
    periodLabel: dues.periodLabel ?? fiscalYearLabel(dues.fiscalYear),
    amount: formatDuesMoney(toAmount(dues.amount), dues.currency, locale),
    paidAt: format(dues.paidAt ?? new Date(), "d MMMM yyyy", { locale: dateLocale }),
    method,
    locale,
  };

  const buffer = await renderDuesReceiptPdf(data);
  const slug = `${member.lastName}-${member.firstName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return { buffer, filename: `recu-cotisation-${slug}.pdf` };
}

export async function buildDuesHistoryPdfBuffer(
  club: ClubForPdf,
  member: MemberForPdf,
  duesRows: DuesForPdf[],
  locale: string
): Promise<{ buffer: Buffer; filename: string }> {
  const baseUrl = getAppBaseUrl();
  const dateLocale = locale === "en" ? enUS : fr;
  const { renderDuesHistoryPdf } = await import("@/lib/pdf/render");

  const fiscalYear = duesRows[0]?.fiscalYear ?? new Date().getFullYear();
  let totalPaid = 0;
  let totalPending = 0;

  const rows = duesRows.map((d) => {
    const amt = toAmount(d.amount);
    if (d.status === "PAID" || d.status === "WAIVED") totalPaid += d.status === "PAID" ? amt : 0;
    else totalPending += amt;
    return {
      periodLabel: d.periodLabel ?? fiscalYearLabel(d.fiscalYear),
      amount: formatDuesMoney(amt, d.currency, locale),
      dueDate: format(d.dueDate, "d MMM yyyy", { locale: dateLocale }),
      status: statusLabel(d.status, locale),
      paidAt: d.paidAt ? format(d.paidAt, "d MMM yyyy", { locale: dateLocale }) : undefined,
      reference: d.receiptNumber ?? d.invoiceNumber ?? undefined,
    };
  });

  const currency = duesRows[0]?.currency ?? "EUR";
  const data = {
    club: {
      name: club.name,
      address: club.address ?? club.meetingLocation ?? undefined,
      logoUrl: resolveLogo(club, baseUrl),
    },
    member: {
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email ?? undefined,
    },
    fiscalYear: fiscalYearLabel(fiscalYear),
    paymentPlan: planLabel(member.duesPaymentPlan ?? duesRows[0]?.paymentPlan ?? "ANNUAL", locale),
    rows,
    totalPaid: formatDuesMoney(totalPaid, currency, locale),
    totalPending: formatDuesMoney(totalPending, currency, locale),
    generatedAt: format(new Date(), "d MMMM yyyy HH:mm", { locale: dateLocale }),
    locale,
  };

  const buffer = await renderDuesHistoryPdf(data);
  const slug = `${member.lastName}-${member.firstName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return { buffer, filename: `historique-cotisations-${slug}.pdf` };
}