import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMemberDetail } from "@/actions/members";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { MemberEditForm } from "@/components/members/member-edit-form";
import { MemberDuesPanel } from "@/components/treasury/member-dues-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("members");
  const member = await getMemberDetail(id);
  if (!member) notFound();

  const ctx = await getClubContext();
  const canManage = ctx
    ? await hasRolePermission(ctx.role, "members.manage", ctx.isSuperAdmin)
    : false;
  const commissions = ctx
    ? await prisma.commission.findMany({
        where: { clubId: ctx.clubId, isActive: true },
        orderBy: { name: "asc" },
      })
    : [];

  const showDues =
    ctx &&
    isFeatureEnabled(ctx.features, "duesEnabled", ctx.isSuperAdmin) &&
    (await hasRolePermission(ctx.role, "dues.view", ctx.isSuperAdmin));

  return (
    <AppShellServer title={t("title")}>
      <div className="max-w-2xl space-y-4">
        <Link href={`/${locale}/members`} className="text-sm text-navy hover:underline">
          ← {t("backToList")}
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>
              {member.firstName} {member.lastName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MemberEditForm
              member={member}
              commissions={commissions}
              canManage={canManage}
            />
          </CardContent>
        </Card>
        {showDues && ctx && (
          <MemberDuesPanel
            clubId={ctx.clubId}
            memberId={id}
            locale={locale}
            showDuesLink
          />
        )}
      </div>
    </AppShellServer>
  );
}