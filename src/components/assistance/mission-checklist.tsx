"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Circle, ListChecks, X, ArrowRight, Play } from "lucide-react";
import { dismissMissionChecklist } from "@/actions/assistance";
import { trackMissionStarted } from "@/actions/assistance-walkthrough";
import { useAssistance } from "./assistance-context";
import {
  getWalkthroughForMission,
  getWalkthroughSteps,
} from "@/lib/assistance/walkthroughs";

export function MissionChecklist() {
  const t = useTranslations("assistance.missions");
  const tWt = useTranslations("assistance.walkthrough");
  const tCommon = useTranslations("assistance");
  const locale = useLocale();
  const assistance = useAssistance();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (
    !assistance?.guideEnabled ||
    !assistance.clubSetupComplete ||
    assistance.missionsDismissed ||
    assistance.missions.length === 0
  ) {
    return null;
  }

  if (assistance.allMissionsComplete) return null;

  const completed = assistance.missions.filter(
    (m) => assistance.missionProgress[m.key]
  ).length;

  function dismiss() {
    startTransition(async () => {
      await dismissMissionChecklist();
      router.refresh();
    });
  }

  function startMission(missionKey: string, href: string) {
    startTransition(async () => {
      await trackMissionStarted(missionKey);
      router.push(`/${locale}${href}`);
    });
  }

  return (
    <section
      aria-labelledby="mission-checklist-title"
      className="rounded-2xl border border-gold/30 bg-gradient-to-br from-white to-gold/5 p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-navy flex items-center justify-center shrink-0">
            <ListChecks className="h-5 w-5 text-gold" aria-hidden />
          </div>
          <div>
            <h2 id="mission-checklist-title" className="font-display font-bold text-navy">
              {t("title")}
            </h2>
            <p className="text-xs text-gray-500">
              {t("progress", { done: completed, total: assistance.missions.length })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="text-gray-400 hover:text-gray-600 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded"
          aria-label={tCommon("dismissMissions")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-gray-600">{t(`intro.${assistance.focusRole}`)}</p>

      <ol className="space-y-2">
        {assistance.missions.map((mission, index) => {
          const done = assistance.missionProgress[mission.key];
          const flowId = getWalkthroughForMission(mission.key);
          const wtSteps = flowId ? getWalkthroughSteps(flowId) : [];
          const expanded = expandedKey === mission.key;

          return (
            <li key={mission.key} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div
                className={`flex items-center gap-3 p-3 ${
                  done ? "bg-green-50/50 border-green-200" : ""
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" aria-hidden />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 shrink-0" aria-hidden />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${done ? "text-gray-500 line-through" : "text-navy"}`}
                  >
                    {index + 1}. {t(`items.${mission.key}.title`)}
                  </p>
                  {!done && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t(`items.${mission.key}.hint`)}
                    </p>
                  )}
                </div>
                {!done && (
                  <div className="flex items-center gap-1 shrink-0">
                    {wtSteps.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedKey(expanded ? null : mission.key)
                        }
                        className="text-xs text-navy hover:underline px-2 py-1"
                      >
                        {t("stepsBtn")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startMission(mission.key, mission.href)}
                      className="inline-flex items-center gap-1 rounded-lg bg-gold/20 text-navy px-2.5 py-1.5 text-xs font-semibold hover:bg-gold/30"
                    >
                      <Play className="h-3 w-3" />
                      {t("startBtn")}
                    </button>
                  </div>
                )}
              </div>

              {!done && expanded && wtSteps.length > 0 && flowId && (
                <ol className="border-t border-gray-100 bg-gray-50/80 px-4 py-3 space-y-2 text-xs text-gray-600">
                  {wtSteps.map((step, si) => (
                    <li key={step.target} className="flex gap-2">
                      <span className="font-semibold text-gold-dark shrink-0">
                        {si + 1}.
                      </span>
                      <span>
                        {tWt(`${flowId}.${step.titleKey}.title`)}
                      </span>
                    </li>
                  ))}
                  <li className="pt-1">
                    <button
                      type="button"
                      onClick={() => startMission(mission.key, mission.href)}
                      className="inline-flex items-center gap-1 text-navy font-medium hover:underline"
                    >
                      {t("launchWalkthrough")}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </li>
                </ol>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex justify-end">
        <Link
          href={`/${locale}/help#getting-started`}
          className="inline-flex h-8 items-center rounded-md border border-gray-200 bg-white px-3 text-xs font-medium hover:bg-gray-50"
        >
          {tCommon("learnMore")}
        </Link>
      </div>
    </section>
  );
}