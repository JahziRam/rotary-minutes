import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";
import { listMemberDues } from "@/actions/dues";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { DuesPanel } from "@/components/members/dues-panel";

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

  const data = await listMemberDues();
  if ("error" in data) return null;

  const canManage = await hasRolePermission(ctx.role, "members.manage", ctx.isSuperAdmin);

  return (
    <AppShellServer title={t("title")}>
      <div className="space-y-4">
        <Link href={`/${locale}/members`} className="text-sm text-navy hover:underline">
          ← {t("backToMembers")}
        </Link>
        <DuesPanel
          rows={data.rows.map(({ member, dues }) => ({
            member: {
              id: member.id,
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
            },
            dues: dues
              ? {
                  id: dues.id,
                  amount: Number(dues.amount),
                  currency: dues.currency,
                  dueDate: dues.dueDate.toISOString(),
                  paidAt: dues.paidAt?.toISOString() ?? null,
                  status: dues.status,
                }
              : null,
          }))}
          fiscalYear={data.fiscalYear}
          currency={data.currency}
          defaultAnnualDues={data.defaultAnnualDues}
          canManage={canManage}
          locale={locale}
        />
      </div>
    </AppShellServer>
  );
}