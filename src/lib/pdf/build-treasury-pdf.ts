import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getAppBaseUrl } from "@/lib/app-url";
import { isDataUrl } from "@/lib/image-storage";
import { resolveClubLogoUrl } from "@/lib/media-url";
import type { BudgetEntryType } from "@/generated/prisma/client";
import type { TreasuryFilters } from "@/lib/queries/treasury";
import { getAppName } from "@/lib/app-settings";

type ClubForPdf = {
  id: string;
  name: string;
  address?: string | null;
  meetingLocation?: string | null;
  logoUrl?: string | null;
  currency: string;
};

type EntryForPdf = {
  type: BudgetEntryType;
  amount: number;
  currency: string;
  date: Date;
  description: string;
  categoryName: string | null;
  eventTitle: string | null;
};

function resolveLogo(club: ClubForPdf, baseUrl: string): string | undefined {
  if (!club.logoUrl) return undefined;
  if (isDataUrl(club.logoUrl)) return club.logoUrl;
  return resolveClubLogoUrl(club.id, club.logoUrl, baseUrl) ?? club.logoUrl;
}

function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function typeLabel(type: BudgetEntryType, locale: string): string {
  const isFr = locale === "fr";
  return type === "INCOME" ? (isFr ? "Recette" : "Income") : isFr ? "Dépense" : "Expense";
}

function periodLabel(filters: TreasuryFilters | undefined, locale: string): string {
  const isFr = locale === "fr";
  const dateLocale = locale === "en" ? enUS : fr;
  if (filters?.from && filters?.to) {
    return `${format(filters.from, "d MMM yyyy", { locale: dateLocale })} — ${format(filters.to, "d MMM yyyy", { locale: dateLocale })}`;
  }
  if (filters?.from) {
    return isFr
      ? `Depuis le ${format(filters.from, "d MMMM yyyy", { locale: dateLocale })}`
      : `From ${format(filters.from, "d MMMM yyyy", { locale: dateLocale })}`;
  }
  if (filters?.to) {
    return isFr
      ? `Jusqu'au ${format(filters.to, "d MMMM yyyy", { locale: dateLocale })}`
      : `Until ${format(filters.to, "d MMMM yyyy", { locale: dateLocale })}`;
  }
  return isFr ? "Toutes les opérations" : "All transactions";
}

export async function buildTreasuryReportPdfBuffer(
  club: ClubForPdf,
  entries: EntryForPdf[],
  summary: { income: number; expense: number; balance: number },
  locale: string,
  filters?: TreasuryFilters
): Promise<{ buffer: Buffer; filename: string }> {
  const baseUrl = getAppBaseUrl();
  const dateLocale = locale === "en" ? enUS : fr;
  const { renderTreasuryReportPdf } = await import("@/lib/pdf/render");
  const appName = await getAppName();

  const data = {
    club: {
      name: club.name,
      address: club.address ?? club.meetingLocation ?? undefined,
      logoUrl: resolveLogo(club, baseUrl),
    },
    periodLabel: periodLabel(filters, locale),
    generatedAt: format(new Date(), "d MMMM yyyy HH:mm", { locale: dateLocale }),
    currency: club.currency,
    summary: {
      income: formatMoney(summary.income, club.currency, locale),
      expense: formatMoney(summary.expense, club.currency, locale),
      balance: formatMoney(summary.balance, club.currency, locale),
    },
    rows: entries.map((e) => ({
      date: format(e.date, "d MMM yy", { locale: dateLocale }),
      type: typeLabel(e.type, locale),
      description: e.description,
      category: e.categoryName ?? e.eventTitle ?? "—",
      amount:
        (e.type === "EXPENSE" ? "−" : "+") + formatMoney(e.amount, e.currency, locale),
      amountClass: (e.type === "INCOME" ? "income" : "expense") as "income" | "expense",
    })),
    locale,
    appName,
  };

  const buffer = await renderTreasuryReportPdf(data);
  const slug = club.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    buffer,
    filename: locale === "fr" ? `rapport-tresorerie-${slug}.pdf` : `treasury-report-${slug}.pdf`,
  };
}