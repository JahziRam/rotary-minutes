"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Building2,
  Users,
  Calendar,
  UserPlus,
  CheckCircle2,
  FileText,
  Upload,
  Sparkles,
  ArrowRight,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  completeOnboardingStep,
  createOnboardingMeeting,
  finishOnboarding,
} from "@/actions/onboarding";
import { updateClubSettings } from "@/actions/settings";
import { createMember } from "@/actions/members";
import { inviteClubUser } from "@/actions/club-users";
import type { OnboardingStepKey } from "@/generated/prisma/client";
import type { ClubRole } from "@/generated/prisma/client";
import { ONBOARDING_WIZARD_STEPS } from "@/lib/onboarding-steps";

const STEPS = ONBOARDING_WIZARD_STEPS;

const STEP_ICONS = {
  CLUB_PROFILE: Building2,
  MEMBERS: Users,
  FIRST_MEETING: Calendar,
  INVITE_USERS: UserPlus,
  FIRST_MINUTE: FileText,
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
  progressPercent = 0,
  counts,
  latestDraftMinuteId = null,
}: {
  club: ClubData;
  currentStep: OnboardingStepKey;
  completedSteps: OnboardingStepKey[];
  progressPercent?: number;
  counts?: {
    members: number;
    meetings: number;
    users: number;
    minutes: number;
  };
  latestDraftMinuteId?: string | null;
}) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draftMinuteId, setDraftMinuteId] = useState<string | null>(
    latestDraftMinuteId
  );

  const activeIdx = STEPS.indexOf(
    currentStep === "COMPLETE" ? STEPS[STEPS.length - 1]! : currentStep
  );
  const stepIndex = activeIdx >= 0 ? activeIdx : 0;
  const step = STEPS[stepIndex]!;
  const StepIcon = STEP_ICONS[step as keyof typeof STEP_ICONS];
  const doneCount = completedSteps.filter((s) => STEPS.includes(s)).length;
  const percent =
    progressPercent ||
    Math.round((doneCount / STEPS.length) * 100);

  function goDashboard() {
    router.push(`/${locale}/dashboard`);
    router.refresh();
  }

  function finishStep(key: OnboardingStepKey) {
    startTransition(async () => {
      setError(null);
      const result = await completeOnboardingStep(key);
      if (result && "error" in result && result.error) {
        setError(t("error"));
        return;
      }
      const next =
        result && "nextStep" in result ? result.nextStep : undefined;
      if (key === "FIRST_MINUTE" || next === "COMPLETE") {
        goDashboard();
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
      if ("minuteId" in result && result.minuteId) {
        setDraftMinuteId(result.minuteId);
      }
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
      router.refresh();
    });
  }

  function skipStep() {
    finishStep(step);
  }

  function finishLater() {
    startTransition(async () => {
      setError(null);
      const result = await finishOnboarding();
      if (result && "error" in result && result.error) {
        setError(t("error"));
        return;
      }
      goDashboard();
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-gold/15 text-navy px-3 py-1 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {t("badge")}
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy">
          {t("title")}
        </h1>
        <p className="text-gray-500 text-sm max-w-md mx-auto">{t("subtitle")}</p>
        <p className="inline-flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {t("eta")}
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {t("progressLabel", { done: doneCount, total: STEPS.length })}
          </span>
          <span className="font-semibold text-navy">{percent}%</span>
        </div>
        <div
          className="h-2 rounded-full bg-gray-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-navy to-gold transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((s, i) => {
          const done = completedSteps.includes(s);
          const active = i === stepIndex;
          return (
            <div key={s} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                      ? "bg-gold text-navy-dark ring-2 ring-gold/40"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] text-center hidden sm:block truncate w-full ${
                  active ? "text-navy font-medium" : "text-gray-400"
                }`}
              >
                {t(`steps.${s}`)}
              </span>
            </div>
          );
        })}
      </div>

      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              ["members", counts.members],
              ["meetings", counts.meetings],
              ["users", counts.users],
              ["minutes", counts.minutes],
            ] as const
          ).map(([key, value]) => (
            <div
              key={key}
              className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-center"
            >
              <p className="text-lg font-bold text-navy">{value}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                {t(`stats.${key}`)}
              </p>
            </div>
          ))}
        </div>
      )}

      <Card className="border-navy/10 shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-navy/10 flex items-center justify-center shrink-0">
              <StepIcon className="h-5 w-5 text-navy" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gold-dark">
                {t("stepOf", { current: stepIndex + 1, total: STEPS.length })}
              </p>
              <h2 className="font-semibold text-gray-900">{t(`steps.${step}`)}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {t(`descriptions.${step}`)}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-navy/5 border border-navy/10 px-3 py-2.5 text-sm text-navy/90">
            <span className="font-medium">{t("tipLabel")} </span>
            {t(`tips.${step}`)}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {step === "CLUB_PROFILE" && (
            <form action={handleClubProfile} className="space-y-4">
              <Input
                name="name"
                label={t("fields.clubName")}
                defaultValue={club.name}
                required
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  name="district"
                  label={t("fields.district")}
                  defaultValue={club.district ?? ""}
                />
                <Input
                  name="country"
                  label={t("fields.country")}
                  defaultValue={club.country}
                  required
                />
              </div>
              <Input
                name="city"
                label={t("fields.city")}
                defaultValue={club.city}
                required
              />
              <Input
                name="meetingLocation"
                label={t("fields.meetingLocation")}
                defaultValue={club.meetingLocation ?? ""}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  name="meetingDay"
                  label={t("fields.meetingDay")}
                  defaultValue={club.meetingDay ?? ""}
                  placeholder={t("fields.meetingDayHint")}
                />
                <Input
                  name="meetingTime"
                  label={t("fields.meetingTime")}
                  defaultValue={club.meetingTime ?? ""}
                />
              </div>
              <Input
                name="email"
                type="email"
                label={t("fields.email")}
                defaultValue={club.email ?? ""}
              />
              <Input
                name="website"
                type="url"
                label={t("fields.website")}
                defaultValue={club.website ?? ""}
              />
              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" variant="gold" disabled={pending}>
                  {pending ? "..." : t("continue")}
                </Button>
              </div>
            </form>
          )}

          {step === "MEMBERS" && (
            <form action={handleMember} className="space-y-4">
              {counts && counts.members > 0 && (
                <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  {t("alreadyMembers", { count: counts.members })}
                </p>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input name="firstName" label={t("fields.firstName")} required />
                <Input name="lastName" label={t("fields.lastName")} required />
              </div>
              <Input name="email" type="email" label={t("fields.email")} />
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button type="submit" variant="gold" disabled={pending}>
                  {pending ? "..." : t("addMemberContinue")}
                </Button>
                <Link
                  href={`/${locale}/members`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-navy hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4" />
                  {t("importMembers")}
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={skipStep}
                >
                  {t("skip")}
                </Button>
              </div>
            </form>
          )}

          {step === "FIRST_MEETING" && (
            <form action={handleMeeting} className="space-y-4">
              {counts && counts.meetings > 0 && (
                <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  {t("alreadyMeetings", { count: counts.meetings })}
                </p>
              )}
              <Input
                name="date"
                type="date"
                label={t("fields.meetingDate")}
                required
              />
              <Input
                name="location"
                label={t("fields.meetingLocation")}
                defaultValue={club.meetingLocation ?? ""}
              />
              <Input
                name="startTime"
                type="time"
                label={t("fields.startTime")}
                defaultValue={club.meetingTime ?? "12:30"}
              />
              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" variant="gold" disabled={pending}>
                  {pending ? "..." : t("createMeetingContinue")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={skipStep}
                >
                  {t("skip")}
                </Button>
              </div>
            </form>
          )}

          {step === "FIRST_MINUTE" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{t("firstMinuteHelp")}</p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                {draftMinuteId ? (
                  <Link
                    href={`/${locale}/minutes/${draftMinuteId}/edit`}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-medium text-white hover:bg-navy-dark"
                  >
                    {t("openDraftMinute")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    href={`/${locale}/minutes`}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-medium text-white hover:bg-navy-dark"
                  >
                    {t("openMinutes")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <Button
                  type="button"
                  variant="gold"
                  disabled={pending}
                  onClick={() => finishStep("FIRST_MINUTE")}
                >
                  {pending ? "..." : t("finish")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={skipStep}
                >
                  {t("skip")}
                </Button>
              </div>
            </div>
          )}

          {step === "INVITE_USERS" && (
            <form action={handleInvite} className="space-y-4">
              {counts && counts.users > 1 && (
                <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  {t("alreadyUsers", { count: counts.users })}
                </p>
              )}
              <p className="text-sm text-gray-600">{t("inviteHelp")}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input name="firstName" label={t("fields.firstName")} required />
                <Input name="lastName" label={t("fields.lastName")} required />
              </div>
              <Input name="email" type="email" label={t("fields.email")} required />
              <Input
                name="password"
                type="password"
                label={t("fields.tempPassword")}
                placeholder={t("fields.passwordHint")}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t("fields.role")}
                </label>
                <select
                  name="role"
                  className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  defaultValue="SECRETARY"
                >
                  <option value="SECRETARY">{t("roles.SECRETARY")}</option>
                  <option value="PRESIDENT">{t("roles.PRESIDENT")}</option>
                  <option value="VICE_PRESIDENT">{t("roles.VICE_PRESIDENT")}</option>
                  <option value="TREASURER">{t("roles.TREASURER")}</option>
                  <option value="COMMISSION_CHAIR">
                    {t("roles.COMMISSION_CHAIR")}
                  </option>
                  <option value="READER">{t("roles.READER")}</option>
                  <option value="ADMIN">{t("roles.ADMIN")}</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" variant="gold" disabled={pending}>
                  {pending ? "..." : t("inviteContinue")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={skipStep}
                >
                  {t("skip")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <p className="text-xs text-gray-400 max-w-sm">{t("finishLaterHint")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={finishLater}
        >
          {t("finishLater")}
        </Button>
      </div>
    </div>
  );
}
