import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMemberDetail } from "@/actions/members";
import { getMemberAppRoleInfo } from "@/actions/club-users";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
import { canManageMemberRoles } from "@/lib/member-roles";
import { ROLE_LABELS } from "@/lib/role-definitions";
import { CLUB_ROLES } from "@/lib/rotary";
import { prisma } from "@/lib/prisma";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { MemberEditForm } from "@/components/members/member-edit-form";
import { MemberRoleField } from "@/components/members/member-role-field";
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
  const canManageRoles = ctx ? await canManageMemberRoles(ctx) : false;
  const [commissions, appRoleInfo, customRoles] = ctx
    ? await Promise.all([
        prisma.commission.findMany({
          where: { clubId: ctx.clubId, isActive: true },
          orderBy: { name: "asc" },
        }),
        getMemberAppRoleInfo(id),
        ctx.isSuperAdmin
          ? prisma.customRole.findMany({
              where: { isActive: true },
              orderBy: { key: "asc" },
            })
          : Promise.resolve([]),
      ])
    : [[], null, []];

  const roleLocale = locale === "fr" ? "fr" : "en";
  const roleOptions = CLUB_ROLES.map((r) => ({
    value: r,
    label: ROLE_LABELS[r][roleLocale],
  }));

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
          <CardContent className="space-y-6">
            {canManageRoles && appRoleInfo && (
              <MemberRoleField
                memberId={id}
                role={appRoleInfo.role}
                customRoleId={appRoleInfo.customRoleId}
                hasAccount={appRoleInfo.hasAccount}
                canManage={canManageRoles}
                isCurrentUser={appRoleInfo.userId === ctx?.userId}
                roleOptions={roleOptions}
                customRoles={customRoles.map((r) => ({
                  id: r.id,
                  label: locale === "fr" ? r.labelFr : r.labelEn,
                }))}
              />
            )}
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