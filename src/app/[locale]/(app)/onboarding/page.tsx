import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getClubContext } from "@/lib/club-context";
import { prisma } from "@/lib/prisma";
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

  const onboarding = await prisma.clubOnboarding.findUnique({
    where: { clubId: ctx.clubId },
  });

  if (onboarding?.currentStep === "COMPLETE" || onboarding?.completedAt) {
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
        currentStep={onboarding?.currentStep ?? "CLUB_PROFILE"}
        completedSteps={onboarding?.completedSteps ?? []}
      />
    </AppShellServer>
  );
}