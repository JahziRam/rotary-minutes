import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Wallet, Users } from "lucide-react";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getUpcomingBirthdays } from "@/lib/queries/members";
import { getMembersDuesOverview } from "@/lib/queries/dues-overview";
import { getOfficerMandates } from "@/actions/mandates";
import { getClubOnboarding } from "@/actions/onboarding";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { MembersDuesSummary } from "@/components/treasury/members-dues-summary";
import { AddMemberForm } from "@/components/members/add-member-form";
import { MemberImportPanel } from "@/components/members/member-import-panel";
import { BirthdayBanner } from "@/components/members/birthday-banner";
import { MandatesPanel } from "@/components/members/mandates-panel";
import { OnboardingChecklist } from "@/components/members/onboarding-checklist";
import { MembersDirectory } from "@/components/members/members-directory";
import { GuidedEmptyState } from "@/components/assistance/guided-empty-state";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tEmpty = await getTranslations("assistance.emptyStates.members");
  const ctx = await getClubContext();
  if (!ctx) return null;

  const showDues = isFeatureEnabled(ctx.features, "duesEnabled", ctx.isSuperAdmin);
  const canViewDues =
    showDues &&
    (await hasRolePermission(ctx.role, "dues.view", ctx.isSuperAdmin));

  const [members, birthdays, mandates, onboarding, canManage, duesOverview] =
    await Promise.all([
      prisma.member.findMany({
        where: { clubId: ctx.clubId },
        include: { commission: true },
        orderBy: [{ isActive: "desc" }, { lastName: "asc" }],
      }),
      getUpcomingBirthdays(ctx.clubId),
      getOfficerMandates(),
      getClubOnboarding(),
      hasRolePermission(ctx.role, "members.manage", ctx.isSuperAdmin),
      canViewDues ? getMembersDuesOverview(ctx.clubId) : Promise.resolve(null),
    ]);

  const active = members.filter((m) => m.isActive);

  return (
    <AppShellServer title={t("members.title")}>
      <div className="space-y-6">
        {onboarding && (
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
        <MandatesPanel mandates={mandates} canManage={canManage} />
        <MemberImportPanel canManage={canManage} />

        <div className="flex flex-wrap justify-between items-center gap-3">
          <p className="text-sm text-gray-500">
            {active.length} {t("members.active").toLowerCase()}
            {members.length > active.length &&
              ` · ${members.length - active.length} ${t("members.inactive").toLowerCase()}`}
          </p>
          <div className="flex items-center gap-2">
            {showDues && (
              <Link
                href={`/${locale}/members/dues`}
                className="inline-flex items-center justify-center gap-2 h-8 rounded-md px-3 text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 transition-all"
              >
                <Wallet className="h-4 w-4" />
                {t("dues.title")}
              </Link>
            )}
            {canManage && <AddMemberForm />}
          </div>
        </div>

        {members.length === 0 ? (
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
            members={members.map((m) => ({
              id: m.id,
              firstName: m.firstName,
              lastName: m.lastName,
              photoUrl: m.photoUrl,
              position: m.position,
              isActive: m.isActive,
              commissionName: m.commission?.name ?? null,
              email: m.email,
            }))}
          />
        )}
      </div>
    </AppShellServer>
  );
}