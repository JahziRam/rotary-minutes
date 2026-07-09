"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle, Circle } from "lucide-react";
import { completeOnboardingStep } from "@/actions/onboarding";
import type { OnboardingStepKey } from "@/generated/prisma/client";

const STEPS: { key: OnboardingStepKey; href: string }[] = [
  { key: "CLUB_PROFILE", href: "/settings" },
  { key: "MEMBERS", href: "/members" },
  { key: "FIRST_MEETING", href: "/meetings/new" },
  { key: "INVITE_USERS", href: "/settings/users" },
  { key: "FIRST_MINUTE", href: "/minutes" },
];

export function OnboardingChecklist({
  completedSteps,
  currentStep,
}: {
  completedSteps: OnboardingStepKey[];
  currentStep: OnboardingStepKey;
}) {
  const locale = useLocale();
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (currentStep === "COMPLETE") return null;

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 space-y-3">
      <h3 className="font-semibold text-navy">{t("checklistTitle")}</h3>
      <ul className="space-y-2">
        {STEPS.map((step) => {
          const done = completedSteps.includes(step.key);
          return (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              {done ? (
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-400 shrink-0" />
              )}
              <Link
                href={`/${locale}${step.href}`}
                className={done ? "text-gray-500 line-through" : "text-navy hover:underline"}
              >
                {t(`checklist.${step.key}`)}
              </Link>
              {!done && (
                <button
                  type="button"
                  disabled={pending}
                  className="text-xs text-gold-dark hover:underline ml-auto"
                  onClick={() =>
                    startTransition(async () => {
                      await completeOnboardingStep(step.key);
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