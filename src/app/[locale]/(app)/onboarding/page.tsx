import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getClubContext } from "@/lib/club-context";
import {
  canManageClubOnboarding,
  getOnboardingBootstrap,
} from "@/actions/onboarding";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("onboarding");
  const ctx = await getClubContext();

  if (!ctx) {
    redirect(`/${locale}/login`);
  }

  if (ctx.isSuperAdmin) {
    redirect(`/${locale}/dashboard`);
  }

  if (!(await canManageClubOnboarding(ctx))) {
    redirect(`/${locale}/dashboard`);
  }

  const bootstrap = await getOnboardingBootstrap();
  if (
    !bootstrap ||
    bootstrap.currentStep === "COMPLETE" ||
    bootstrap.progressPercent >= 100
  ) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <AppShellServer title={t("title")}>
      <OnboardingWizard
        club={{
          name: ctx.club.name,
          district: ctx.club.district,
          country: ctx.club.country,
          city: ctx.club.city,
          meetingLocation: ctx.club.meetingLocation,
          meetingDay: ctx.club.meetingDay,
          meetingTime: ctx.club.meetingTime,
          email: ctx.club.email,
          website: ctx.club.website,
        }}
        currentStep={bootstrap.currentStep}
        completedSteps={bootstrap.completedSteps}
        progressPercent={bootstrap.progressPercent}
        counts={bootstrap.counts}
        latestDraftMinuteId={bootstrap.latestDraftMinuteId}
      />
    </AppShellServer>
  );
}
