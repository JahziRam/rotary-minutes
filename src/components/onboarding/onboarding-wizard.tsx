"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Building2, Users, Calendar, UserPlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { completeOnboardingStep, createOnboardingMeeting } from "@/actions/onboarding";
import { updateClubSettings } from "@/actions/settings";
import { createMember } from "@/actions/members";
import { inviteClubUser } from "@/actions/club-users";
import type { OnboardingStepKey } from "@/generated/prisma/client";
import type { ClubRole } from "@/generated/prisma/client";

const STEPS: OnboardingStepKey[] = [
  "CLUB_PROFILE",
  "MEMBERS",
  "FIRST_MEETING",
  "INVITE_USERS",
];

const STEP_ICONS = {
  CLUB_PROFILE: Building2,
  MEMBERS: Users,
  FIRST_MEETING: Calendar,
  INVITE_USERS: UserPlus,
};

interface ClubData {
  name: string;
  district?: string | null;
  country: string;
  city: string;
  meetingLocation?: string | null;
  meetingDay?: string | null;
  meetingTime?: string | null;
  email?: string | null;
  website?: string | null;
}

export function OnboardingWizard({
  club,
  currentStep,
  completedSteps,
}: {
  club: ClubData;
  currentStep: OnboardingStepKey;
  completedSteps: OnboardingStepKey[];
}) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeIdx = STEPS.indexOf(
    currentStep === "COMPLETE" ? "INVITE_USERS" : currentStep
  );
  const stepIndex = activeIdx >= 0 ? activeIdx : 0;
  const step = STEPS[stepIndex]!;
  const StepIcon = STEP_ICONS[step as keyof typeof STEP_ICONS];
  const isLast = stepIndex === STEPS.length - 1;

  function finishStep(key: OnboardingStepKey, then?: () => void) {
    startTransition(async () => {
      setError(null);
      const result = await completeOnboardingStep(key);
      if (result.error) {
        setError(t("error"));
        return;
      }
      then?.();
      if (key === "INVITE_USERS") {
        router.push(`/${locale}/dashboard`);
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  function handleClubProfile(formData: FormData) {
    startTransition(async () => {
      setError(null);
      const result = await updateClubSettings({
        name: formData.get("name") as string,
        district: formData.get("district") as string,
        country: formData.get("country") as string,
        city: formData.get("city") as string,
        meetingLocation: formData.get("meetingLocation") as string,
        meetingDay: formData.get("meetingDay") as string,
        meetingTime: formData.get("meetingTime") as string,
        email: formData.get("email") as string,
        website: formData.get("website") as string,
      });
      if (result.error) {
        setError(t("error"));
        return;
      }
      await completeOnboardingStep("CLUB_PROFILE");
      router.refresh();
    });
  }

  function handleMember(formData: FormData) {
    startTransition(async () => {
      setError(null);
      const result = await createMember({
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        email: (formData.get("email") as string) || undefined,
      });
      if (result.error) {
        setError(t("error"));
        return;
      }
      await completeOnboardingStep("MEMBERS");
      router.refresh();
    });
  }

  function handleMeeting(formData: FormData) {
    startTransition(async () => {
      setError(null);
      const result = await createOnboardingMeeting(
        {
          date: formData.get("date") as string,
          location: formData.get("location") as string,
          startTime: formData.get("startTime") as string,
        },
        locale
      );
      if (result.error) {
        setError(t("error"));
        return;
      }
      await completeOnboardingStep("FIRST_MEETING");
      router.refresh();
    });
  }

  function handleInvite(formData: FormData) {
    startTransition(async () => {
      setError(null);
      const result = await inviteClubUser({
        email: formData.get("email") as string,
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        password: (formData.get("password") as string) || undefined,
        role: (formData.get("role") as ClubRole) || "READER",
      });
      if (result.error) {
        setError(t("error"));
        return;
      }
      await completeOnboardingStep("INVITE_USERS");
      router.push(`/${locale}/dashboard`);
      router.refresh();
    });
  }

  function skipStep() {
    finishStep(step);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display text-2xl font-bold text-navy">{t("title")}</h1>
        <p className="text-gray-500 text-sm">{t("subtitle")}</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        {STEPS.map((s, i) => {
          const done = completedSteps.includes(s);
          const active = i === stepIndex;
          return (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                      ? "bg-gold text-navy-dark"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-[10px] text-center hidden sm:block ${active ? "text-navy font-medium" : "text-gray-400"}`}>
                {t(`steps.${s}`)}
              </span>
            </div>
          );
        })}
      </div>

      <Card className="border-navy/10">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-navy/10 flex items-center justify-center">
              <StepIcon className="h-5 w-5 text-navy" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{t(`steps.${step}`)}</h2>
              <p className="text-sm text-gray-500">{t(`descriptions.${step}`)}</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {step === "CLUB_PROFILE" && (
            <form action={handleClubProfile} className="space-y-4">
              <Input name="name" label={t("fields.clubName")} defaultValue={club.name} required />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input name="district" label={t("fields.district")} defaultValue={club.district ?? ""} />
                <Input name="country" label={t("fields.country")} defaultValue={club.country} required />
              </div>
              <Input name="city" label={t("fields.city")} defaultValue={club.city} required />
              <Input name="meetingLocation" label={t("fields.meetingLocation")} defaultValue={club.meetingLocation ?? ""} />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input name="meetingDay" label={t("fields.meetingDay")} defaultValue={club.meetingDay ?? ""} />
                <Input name="meetingTime" label={t("fields.meetingTime")} defaultValue={club.meetingTime ?? ""} />
              </div>
              <Input name="email" type="email" label={t("fields.email")} defaultValue={club.email ?? ""} />
              <Input name="website" type="url" label={t("fields.website")} defaultValue={club.website ?? ""} />
              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="gold" disabled={pending}>
                  {pending ? "..." : t("continue")}
                </Button>
              </div>
            </form>
          )}

          {step === "MEMBERS" && (
            <form action={handleMember} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input name="firstName" label={t("fields.firstName")} required />
                <Input name="lastName" label={t("fields.lastName")} required />
              </div>
              <Input name="email" type="email" label={t("fields.email")} />
              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="gold" disabled={pending}>
                  {pending ? "..." : t("continue")}
                </Button>
                <Button type="button" variant="outline" disabled={pending} onClick={skipStep}>
                  {t("skip")}
                </Button>
              </div>
            </form>
          )}

          {step === "FIRST_MEETING" && (
            <form action={handleMeeting} className="space-y-4">
              <Input name="date" type="date" label={t("fields.meetingDate")} required />
              <Input name="location" label={t("fields.meetingLocation")} defaultValue={club.meetingLocation ?? ""} />
              <Input name="startTime" type="time" label={t("fields.startTime")} defaultValue={club.meetingTime ?? "12:30"} />
              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="gold" disabled={pending}>
                  {pending ? "..." : t("continue")}
                </Button>
                <Button type="button" variant="outline" disabled={pending} onClick={skipStep}>
                  {t("skip")}
                </Button>
              </div>
            </form>
          )}

          {step === "INVITE_USERS" && (
            <form action={handleInvite} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input name="firstName" label={t("fields.firstName")} required />
                <Input name="lastName" label={t("fields.lastName")} required />
              </div>
              <Input name="email" type="email" label={t("fields.email")} required />
              <Input name="password" type="password" label={t("fields.tempPassword")} placeholder={t("fields.passwordHint")} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{t("fields.role")}</label>
                <select
                  name="role"
                  className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  defaultValue="SECRETARY"
                >
                  <option value="SECRETARY">{t("roles.SECRETARY")}</option>
                  <option value="PRESIDENT">{t("roles.PRESIDENT")}</option>
                  <option value="READER">{t("roles.READER")}</option>
                  <option value="ADMIN">{t("roles.ADMIN")}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="gold" disabled={pending}>
                  {pending ? "..." : isLast ? t("finish") : t("continue")}
                </Button>
                <Button type="button" variant="outline" disabled={pending} onClick={skipStep}>
                  {t("skip")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}