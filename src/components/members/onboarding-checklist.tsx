"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle, Circle, Rocket } from "lucide-react";
import { completeOnboardingStep } from "@/actions/onboarding";
import type { OnboardingStepKey } from "@/generated/prisma/client";
import { ONBOARDING_WIZARD_STEPS } from "@/lib/onboarding-steps";

const STEP_HREFS: Record<string, string> = {
  CLUB_PROFILE: "/settings",
  MEMBERS: "/members",
  FIRST_MEETING: "/meetings/new",
  INVITE_USERS: "/settings/users",
  FIRST_MINUTE: "/minutes",
};

export function OnboardingChecklist({
  completedSteps,
  currentStep,
  progressPercent,
}: {
  completedSteps: OnboardingStepKey[];
  currentStep: OnboardingStepKey;
  progressPercent?: number;
}) {
  const locale = useLocale();
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (currentStep === "COMPLETE") return null;

  const steps = ONBOARDING_WIZARD_STEPS;
  const doneCount = completedSteps.filter((s) => steps.includes(s)).length;
  const percent =
    progressPercent ?? Math.round((doneCount / steps.length) * 100);

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-navy shrink-0" aria-hidden />
          <div>
            <h3 className="font-semibold text-navy">{t("checklistTitle")}</h3>
            <p className="text-xs text-gray-500">
              {t("progressLabel", { done: doneCount, total: steps.length })} ·{" "}
              {percent}%
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/onboarding`}
          className="text-xs font-semibold text-navy hover:underline shrink-0"
        >
          {t("resumeWizard")}
        </Link>
      </div>

      <div className="h-1.5 rounded-full bg-white/80 overflow-hidden border border-gold/20">
        <div
          className="h-full bg-gradient-to-r from-navy to-gold transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="space-y-2">
        {steps.map((key) => {
          const done = completedSteps.includes(key);
          const href = STEP_HREFS[key] ?? "/dashboard";
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              {done ? (
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-400 shrink-0" />
              )}
              <Link
                href={`/${locale}${href}`}
                className={
                  done
                    ? "text-gray-500 line-through"
                    : "text-navy hover:underline"
                }
              >
                {t(`checklist.${key}`)}
              </Link>
              {!done && (
                <button
                  type="button"
                  disabled={pending}
                  className="text-xs text-gold-dark hover:underline ml-auto"
                  onClick={() =>
                    startTransition(async () => {
                      await completeOnboardingStep(key);
                      router.refresh();
                    })
                  }
                >
                  {t("markDone")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
