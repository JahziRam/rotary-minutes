import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Wallet, Users } from "lucide-react";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getUpcomingBirthdays } from "@/lib/queries/members";
import { getMembersDuesOverview } from "@/lib/queries/dues-overview";
import { searchMembersPaginated } from "@/lib/queries/members-list";
import { getRoleLabel } from "@/lib/role-labels";
import { CLUB_ROLES } from "@/lib/rotary";
import { canManageMemberRoles } from "@/lib/member-roles";
import { getOfficerMandates } from "@/actions/mandates";
import { getClubOnboarding } from "@/actions/onboarding";
import { parseListParams, listParamsToRecord } from "@/lib/server-list";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { MembersDuesSummary } from "@/components/treasury/members-dues-summary";
import { AddMemberForm } from "@/components/members/add-member-form";
import { MemberImportPanel } from "@/components/members/member-import-panel";
import { BirthdayBanner } from "@/components/members/birthday-banner";
import { MandatesPanel } from "@/components/members/mandates-panel";
import { OnboardingChecklist } from "@/components/members/onboarding-checklist";
import { MembersDirectory } from "@/components/members/members-directory";
import { MembersRoleHint } from "@/components/members/members-role-hint";
import { GuidedEmptyState } from "@/components/assistance/guided-empty-state";

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tEmpty = await getTranslations("assistance.emptyStates.members");
  const ctx = await getClubContext();
  if (!ctx) return null;

  const listParams = parseListParams({
    q: sp.q,
    page: sp.page,
    status: sp.status,
  });

  const showDues = isFeatureEnabled(ctx.features, "duesEnabled", ctx.isSuperAdmin);
  const canViewDues =
    showDues &&
    (await hasRolePermission(ctx.role, "dues.view", ctx.isSuperAdmin));

  const [membersPage, activeCount, totalCount, birthdays, mandates, onboarding, canManage, canManageRoles, customRoles, duesOverview] =
    await Promise.all([
      searchMembersPaginated(ctx.clubId, listParams),
      prisma.member.count({ where: { clubId: ctx.clubId, isActive: true } }),
      prisma.member.count({ where: { clubId: ctx.clubId } }),
      getUpcomingBirthdays(ctx.clubId),
      getOfficerMandates(),
      getClubOnboarding(),
      hasRolePermission(ctx.role, "members.manage", ctx.isSuperAdmin),
      canManageMemberRoles(ctx),
      ctx.isSuperAdmin
        ? prisma.customRole.findMany({
            where: { isActive: true },
            orderBy: { key: "asc" },
          })
        : Promise.resolve([]),
      canViewDues ? getMembersDuesOverview(ctx.clubId) : Promise.resolve(null),
    ]);

  const inactiveCount = totalCount - activeCount;
  const roleLabels = Object.fromEntries(
    CLUB_ROLES.map((r) => [r, getRoleLabel(r, locale)])
  );
  const roleOptions = CLUB_ROLES.map((r) => ({
    value: r,
    label: getRoleLabel(r, locale),
  }));

  return (
    <AppShellServer title={t("members.title")}>
      <div className="space-y-6">
        {onboarding && onboarding.currentStep !== "COMPLETE" && !onboarding.completedAt && (
          <OnboardingChecklist
            completedSteps={onboarding.completedSteps}
            currentStep={onboarding.currentStep}
          />
        )}
        <BirthdayBanner birthdays={birthdays} locale={locale} />
        {duesOverview && (
          <MembersDuesSummary
            overview={duesOverview}
            locale={locale}
            currency={ctx.club.currency}
          />
        )}
        {canManageRoles && <MembersRoleHint />}
        <MandatesPanel mandates={mandates} canManage={canManage} />
        <MemberImportPanel canManage={canManage} />

        <div className="flex flex-wrap justify-between items-center gap-3">
          <p className="text-sm text-gray-500">
            {listParams.q || listParams.status
              ? `${membersPage.total} ${t("common.results")}`
              : `${activeCount} ${t("members.active").toLowerCase()}${
                  inactiveCount > 0
                    ? ` · ${inactiveCount} ${t("members.inactive").toLowerCase()}`
                    : ""
                }`}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/members/commissions`}
              className="inline-flex items-center justify-center gap-2 h-8 rounded-md px-3 text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 transition-all"
            >
              <Users className="h-4 w-4" />
              {t("members.commissionsLink")}
            </Link>
            {showDues && (
              <Link
                href={`/${locale}/members/dues`}
                className="inline-flex items-center justify-center gap-2 h-8 rounded-md px-3 text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 transition-all"
              >
                <Wallet className="h-4 w-4" />
                {t("dues.title")}
              </Link>
            )}
            {canManage && (
              <AddMemberForm
                canManageRoles={canManageRoles}
                roleOptions={roleOptions}
                customRoles={customRoles.map((r) => ({
                  id: r.id,
                  label: locale === "fr" ? r.labelFr : r.labelEn,
                }))}
              />
            )}
          </div>
        </div>

        {totalCount === 0 ? (
          <GuidedEmptyState
            locale={locale}
            icon={Users}
            title={tEmpty("title")}
            description={tEmpty("description")}
            primaryLabel={tEmpty("primaryLabel")}
            primaryHref="/members"
            secondaryLabel={tEmpty("secondaryLabel")}
            secondaryHref="/help#dues"
            helpAnchor="dues"
          />
        ) : (
          <MembersDirectory
            locale={locale}
            duesByMemberId={duesOverview?.duesByMemberId}
            members={membersPage}
            initialQuery={sp.q ?? ""}
            initialStatus={sp.status ?? "all"}
            listParams={listParamsToRecord(listParams)}
            roleLabels={roleLabels}
            canManageRoles={canManageRoles}
            currentUserId={ctx.userId}
            roleOptions={roleOptions}
            customRoles={customRoles.map((r) => ({
              id: r.id,
              label: locale === "fr" ? r.labelFr : r.labelEn,
            }))}
          />
        )}
      </div>
    </AppShellServer>
  );
}