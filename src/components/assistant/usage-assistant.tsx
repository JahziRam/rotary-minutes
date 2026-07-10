"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  Home,
  Settings,
  Sparkles,
  Users,
  Wallet,
  Mail,
  CalendarDays,
  PartyPopper,
  ClipboardList,
  UserCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  completeUsageGuide,
  dismissUsageGuide,
  startUsageGuide,
  trackUsageGuideStep,
} from "@/actions/usage-guide";
import {
  getVisibleUsageGuideSteps,
  type UsageGuideStep,
  type UsageGuideStepKey,
} from "@/lib/usage-guide-steps";
import { useUsageGuide } from "./usage-guide-context";
import { UsageGuideLauncher } from "./usage-guide-launcher";
import { cn } from "@/lib/utils";

const STEP_ICONS: Partial<Record<UsageGuideStepKey, typeof Home>> = {
  WELCOME: Sparkles,
  DASHBOARD: Home,
  MEETINGS: Calendar,
  MINUTES: FileText,
  MEMBERS: Users,
  TREASURY: Wallet,
  EMAILS: Mail,
  CALENDAR: CalendarDays,
  EVENTS: PartyPopper,
  ATTENDANCE: ClipboardList,
  PROFILE: UserCircle,
  SETTINGS: Settings,
  COMPLETE: CheckCircle2,
};

function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const root = containerRef.current;
    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const nodes = () => Array.from(root.querySelectorAll<HTMLElement>(selector));

    const focusFirst = () => {
      const list = nodes();
      list[0]?.focus();
    };

    const timer = setTimeout(focusFirst, 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const list = nodes();
      if (list.length === 0) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    root.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      root.removeEventListener("keydown", onKeyDown);
    };
  }, [active, containerRef]);
}

function SpotlightOverlay({ rect }: { rect: DOMRect | null }) {
  if (!rect) {
    return (
      <div
        className="fixed inset-0 z-[199] bg-navy/65 motion-reduce:transition-none"
        aria-hidden
      />
    );
  }

  const pad = 6;
  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 2;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[199] bg-navy/65" style={{ height: top }} aria-hidden />
      <div
        className="fixed left-0 z-[199] bg-navy/65"
        style={{ top, width: left, height }}
        aria-hidden
      />
      <div
        className="fixed z-[199] bg-navy/65"
        style={{ top, left: left + width, right: 0, height }}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[199] bg-navy/65"
        style={{ top: top + height }}
        aria-hidden
      />
      <div
        className="fixed z-[200] rounded-lg ring-4 ring-gold pointer-events-none motion-reduce:transition-none"
        style={{ top, left, width, height }}
        aria-hidden
      />
    </>
  );
}

function StepProgress({
  steps,
  stepIndex,
  onSelect,
}: {
  steps: UsageGuideStep[];
  stepIndex: number;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations("usageGuide");
  const tSteps = useTranslations("usageGuide.steps");

  return (
    <div
      className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none"
      role="tablist"
      aria-label={t("stepListLabel")}
    >
      {steps.map((s, i) => {
        const isActive = i === stepIndex;
        const isPast = i < stepIndex;
        return (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={t("ariaStep", {
              current: i + 1,
              total: steps.length,
              title: tSteps(`${s.key}.title`),
            })}
            onClick={() => onSelect(i)}
            className={cn(
              "shrink-0 h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1",
              isActive ? "w-8 bg-gold" : isPast ? "w-2 bg-green-500" : "w-2 bg-gray-300 hover:bg-gray-400"
            )}
          />
        );
      })}
    </div>
  );
}

function GuidePanel({
  step,
  stepIndex,
  steps,
  onNext,
  onPrev,
  onDismiss,
  onGoToStep,
  onClose,
  pending,
  locale,
}: {
  step: UsageGuideStep;
  stepIndex: number;
  steps: UsageGuideStep[];
  onNext: () => void;
  onPrev: () => void;
  onDismiss: () => void;
  onGoToStep: (index: number) => void;
  onClose: () => void;
  pending: boolean;
  locale: string;
}) {
  const t = useTranslations("usageGuide");
  const tCommon = useTranslations("common");
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const liveId = useId();

  useFocusTrap(true, panelRef);

  const StepIcon = STEP_ICONS[step.key] ?? HelpCircle;
  const isFirst = step.key === "WELCOME";
  const isLast = step.key === "COMPLETE";
  const isLastIndex = stepIndex === steps.length - 1;
  const sectionHref = step.href ? `/${locale}${step.href}` : null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight" && !pending) {
        e.preventDefault();
        onNext();
      } else if (e.key === "ArrowLeft" && stepIndex > 0 && !pending) {
        e.preventDefault();
        onPrev();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onNext, onPrev, pending, stepIndex]);

  return (
    <div
      ref={panelRef}
      id="usage-guide-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className={cn(
        "fixed z-[210] flex flex-col bg-white shadow-2xl border border-gold/30 overflow-hidden motion-reduce:transition-none",
        "inset-x-4 bottom-[calc(var(--bottom-nav-h)+1rem)] max-h-[min(32rem,70vh)] rounded-2xl",
        "lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[24rem] lg:max-h-[min(36rem,calc(100vh-3rem))]"
      )}
    >
      <div className="h-1 bg-gold shrink-0" />
      <div className="p-4 sm:p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
        <div className="sr-only" id={liveId} aria-live="polite" aria-atomic="true">
          {t("ariaStep", {
            current: stepIndex + 1,
            total: steps.length,
            title: t(`steps.${step.key}.title`),
          })}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
              <StepIcon className="h-5 w-5 text-navy" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gold-dark">
                {t("stepOf", { current: stepIndex + 1, total: steps.length })}
              </p>
              <h2 id={titleId} className="font-display text-lg font-bold text-navy truncate">
                {t(`steps.${step.key}.title`)}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy shrink-0"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <StepProgress steps={steps} stepIndex={stepIndex} onSelect={onGoToStep} />

        <p id={bodyId} className="text-sm text-gray-600 leading-relaxed">
          {t(`steps.${step.key}.body`)}
        </p>

        {isFirst && (
          <ul className="space-y-2 text-sm text-gray-600">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-gold shrink-0 mt-0.5" aria-hidden />
                <span>{t(`welcomePoints.${i}`)}</span>
              </li>
            ))}
          </ul>
        )}

        {sectionHref && (
          <Link
            href={sectionHref}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-medium bg-navy text-white hover:bg-navy-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 transition-colors"
          >
            {t("openSection")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}

        {isLast && (
          <Link
            href={`/${locale}/help`}
            className="inline-flex items-center gap-2 text-sm text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded"
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            {t("helpCenter")}
          </Link>
        )}

        <p className="sr-only">{t("keyboardHints")}</p>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 mt-auto">
          <button
            type="button"
            onClick={onDismiss}
            disabled={pending}
            className="text-xs text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:underline"
          >
            {t("dismiss")}
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={onPrev}
                aria-label={tCommon("previous")}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{tCommon("previous")}</span>
              </Button>
            )}
            <Button
              type="button"
              variant="gold"
              size="sm"
              disabled={pending}
              onClick={onNext}
              aria-label={
                isLastIndex ? t("finish") : isFirst ? t("start") : tCommon("next")
              }
            >
              {pending ? (
                "..."
              ) : isLastIndex ? (
                t("finish")
              ) : isFirst ? (
                t("start")
              ) : (
                <>
                  <span className="hidden sm:inline">{tCommon("next")}</span>
                  <ChevronRight className="h-4 w-4 sm:ml-0" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UsageAssistant() {
  const guide = useUsageGuide();
  const locale = useLocale();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const isOnboardingPage = pathname.includes("/onboarding");

  const steps = useMemo(
    () => (guide ? getVisibleUsageGuideSteps(guide.config.hiddenNavKeys) : []),
    [guide]
  );

  const stepIndex = guide ? Math.min(guide.stepIndex, steps.length - 1) : 0;
  const step = steps[stepIndex];
  const isOpen = guide?.isOpen ?? false;
  const showSpotlight = isOpen && step?.type === "spotlight" && !isOnboardingPage;

  const updateSpotlight = useCallback(() => {
    if (!showSpotlight || !step?.target) return;
    const el = document.querySelector(`[data-guide="${step.target}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.setAttribute("aria-current", "step");
    }
  }, [showSpotlight, step]);

  useEffect(() => {
    if (!showSpotlight) {
      const resetTimer = setTimeout(() => setRect(null), 0);
      document.querySelectorAll("[data-guide][aria-current='step']").forEach((el) => {
        el.removeAttribute("aria-current");
      });
      return () => clearTimeout(resetTimer);
    }

    const timer = setTimeout(updateSpotlight, 0);
    const delayed = setTimeout(updateSpotlight, 150);
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      clearTimeout(timer);
      clearTimeout(delayed);
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
      document.querySelectorAll("[data-guide][aria-current='step']").forEach((el) => {
        el.removeAttribute("aria-current");
      });
    };
  }, [showSpotlight, updateSpotlight]);

  useEffect(() => {
    if (!isOpen || !step) return;
    if (stepIndex === 0 && step.key === "WELCOME") {
      startTransition(() => {
        void startUsageGuide();
      });
    }
    startTransition(() => {
      void trackUsageGuideStep(step.key);
    });
  }, [isOpen, step?.key, stepIndex]);

  if (!guide || isOnboardingPage) return null;

  const { config, closeGuide, goToStep, nextStep, prevStep } = guide;
  const canShow = config.guideEnabled && config.clubSetupComplete;
  if (!canShow) return null;

  function handleDismiss() {
    startTransition(async () => {
      await dismissUsageGuide(step?.key);
      closeGuide();
    });
  }

  function handleFinish() {
    startTransition(async () => {
      await completeUsageGuide();
      closeGuide();
    });
  }

  function handleNext() {
    if (stepIndex >= steps.length - 1) {
      handleFinish();
      return;
    }
    const next = steps[stepIndex + 1];
    if (next) {
      startTransition(() => {
        void trackUsageGuideStep(next.key);
      });
    }
    nextStep();
  }

  return (
    <>
      {isOpen && step && (
        <>
          {showSpotlight ? <SpotlightOverlay rect={rect} /> : (
            <div className="fixed inset-0 z-[199] bg-navy/40 backdrop-blur-[1px]" aria-hidden />
          )}
          <GuidePanel
            step={step}
            stepIndex={stepIndex}
            steps={steps}
            onNext={handleNext}
            onPrev={prevStep}
            onDismiss={handleDismiss}
            onGoToStep={(i) => goToStep(i)}
            onClose={closeGuide}
            pending={pending}
            locale={locale}
          />
        </>
      )}

      <UsageGuideLauncher variant="fab" />
    </>
  );
}