import Link from "next/link";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { User, Wallet } from "lucide-react";
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
import { MemberDuesBadge } from "@/components/treasury/member-dues-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { AddMemberForm } from "@/components/members/add-member-form";
import { MemberImportPanel } from "@/components/members/member-import-panel";
import { BirthdayBanner } from "@/components/members/birthday-banner";
import { MandatesPanel } from "@/components/members/mandates-panel";
import { OnboardingChecklist } from "@/components/members/onboarding-checklist";
import { resolveMemberPhotoUrl } from "@/lib/media-url";
import { GuidedEmptyState } from "@/components/assistance/guided-empty-state";
import { Users } from "lucide-react";

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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <Link key={member.id} href={`/${locale}/members/${member.id}`}>
              <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${!member.isActive ? "opacity-60" : ""}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  {member.photoUrl ? (
                    <Image
                      src={resolveMemberPhotoUrl(member.id, member.photoUrl) ?? member.photoUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-navy" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {member.position || member.commission?.name || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {duesOverview && member.isActive && (
                      <MemberDuesBadge dues={duesOverview.duesByMemberId[member.id]} />
                    )}
                    <Badge variant={member.isActive ? "success" : "muted"}>
                      {member.isActive ? t("members.active") : t("members.inactive")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        )}
      </div>
    </AppShellServer>
  );
}