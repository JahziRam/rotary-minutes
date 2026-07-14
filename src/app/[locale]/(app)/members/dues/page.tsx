import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { listMemberDues } from "@/actions/dues";
import { duesRemaining, sumPaymentAmounts } from "@/lib/dues";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { DuesPanel } from "@/components/members/dues-panel";
import { PageAssistance } from "@/components/assistance/page-assistance";

export default async function MemberDuesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dues");
  const ctx = await getClubContext();
  if (!ctx) return null;

  if (!isFeatureEnabled(ctx.features, "duesEnabled", ctx.isSuperAdmin)) {
    redirect(`/${locale}/members`);
  }

  const data = await listMemberDues();
  if ("error" in data) return null;

  type DuesPeriod = (typeof data.rows)[number]["periods"][number];

  function mapPeriod(p: DuesPeriod) {
    const amount = Number(p.amount);
    const amountPaid =
      p.status === "PAID" || p.status === "WAIVED"
        ? amount
        : sumPaymentAmounts(p.payments);
    const remaining =
      p.status === "PAID" || p.status === "WAIVED"
        ? 0
        : duesRemaining(amount, amountPaid);

    return {
      id: p.id,
      periodIndex: p.periodIndex,
      periodLabel: p.periodLabel,
      amount,
      amountPaid,
      remaining,
      currency: p.currency,
      dueDate: p.dueDate.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
      status: p.status,
      invoiceNumber: p.invoiceNumber,
      receiptNumber: p.receiptNumber,
      paymentId: p.payments[0]?.id ?? null,
    };
  }

  return (
    <AppShellServer title={t("title")}>
      <div className="space-y-4">
        <PageAssistance hints={["dues_intro", "dues_record_action"]} />
        <Link href={`/${locale}/members`} className="text-sm text-navy hover:underline">
          ← {t("backToMembers")}
        </Link>
        <DuesPanel
          rows={data.rows.map(({ member, periods, nextDue }) => ({
            member: {
              id: member.id,
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              duesPaymentPlan: member.duesPaymentPlan,
            },
            periods: periods.map(mapPeriod),
            nextDue: nextDue ? mapPeriod(nextDue) : null,
          }))}
          fiscalYear={data.fiscalYear}
          currency={data.currency}
          defaultAnnualDues={data.defaultAnnualDues}
          canManage={data.canManage}
          myMemberId={data.myMemberId}
          locale={locale}
        />
      </div>
    </AppShellServer>
  );
}