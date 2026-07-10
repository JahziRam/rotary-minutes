"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getWalkthroughSteps,
  type WalkthroughFlowId,
} from "@/lib/assistance/walkthroughs";
import {
  startWalkthrough,
  advanceWalkthroughStep,
  completeWalkthrough,
  abandonWalkthrough,
} from "@/actions/assistance-walkthrough";
import { useAssistance } from "./assistance-context";
import { SpotlightOverlay } from "./spotlight-overlay";

export function WalkthroughOverlay() {
  const t = useTranslations("assistance.walkthrough");
  const tCommon = useTranslations("assistance");
  const assistance = useAssistance();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [activeFlow, setActiveFlow] = useState<WalkthroughFlowId | null>(null);

  const queryFlow = searchParams.get("walkthrough") as WalkthroughFlowId | null;

  useEffect(() => {
    if (!assistance?.guideEnabled) return;
    const flow = queryFlow ?? assistance.walkthroughState.activeFlow ?? null;
    if (!flow || !getWalkthroughSteps(flow).length) return;

    setActiveFlow(flow);
    const savedIndex = queryFlow ? 0 : (assistance.walkthroughState.stepIndex ?? 0);
    setStepIndex(savedIndex);

    if (queryFlow) {
      startTransition(() => {
        void startWalkthrough(queryFlow);
      });
    }
  }, [queryFlow, assistance?.guideEnabled, assistance?.walkthroughState]);

  const steps = activeFlow ? getWalkthroughSteps(activeFlow) : [];
  const step = steps[stepIndex];
  const isOpen = !!activeFlow && !!step && assistance?.guideEnabled;

  const updateSpotlight = useCallback(() => {
    if (!isOpen || !step) return;
    const el = document.querySelector(`[data-assist="${step.target}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.setAttribute("aria-current", "step");
    } else {
      setRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) {
      setRect(null);
      document.querySelectorAll("[data-assist][aria-current='step']").forEach((el) => {
        el.removeAttribute("aria-current");
      });
      return;
    }
    const timer = setTimeout(updateSpotlight, 0);
    const delayed = setTimeout(updateSpotlight, 200);
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      clearTimeout(timer);
      clearTimeout(delayed);
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
      document.querySelectorAll("[data-assist][aria-current='step']").forEach((el) => {
        el.removeAttribute("aria-current");
      });
    };
  }, [isOpen, updateSpotlight, stepIndex]);

  function clearQuery() {
    const url = new URL(window.location.href);
    url.searchParams.delete("walkthrough");
    router.replace(url.pathname + url.search);
  }

  function handleClose() {
    if (!activeFlow) return;
    startTransition(async () => {
      await abandonWalkthrough(activeFlow, stepIndex);
      setActiveFlow(null);
      clearQuery();
    });
  }

  function handleFinish() {
    if (!activeFlow) return;
    startTransition(async () => {
      await completeWalkthrough(activeFlow);
      setActiveFlow(null);
      clearQuery();
      router.refresh();
    });
  }

  function handleNext() {
    if (!activeFlow) return;
    if (stepIndex >= steps.length - 1) {
      handleFinish();
      return;
    }
    const next = stepIndex + 1;
    setStepIndex(next);
    startTransition(() => {
      void advanceWalkthroughStep(activeFlow, next);
    });
  }

  function handlePrev() {
    if (stepIndex <= 0) return;
    const prev = stepIndex - 1;
    setStepIndex(prev);
    if (activeFlow) {
      startTransition(() => {
        void advanceWalkthroughStep(activeFlow, prev);
      });
    }
  }

  if (!isOpen || !activeFlow || !step) return null;

  const panelTop = rect ? Math.min(rect.bottom + 12, window.innerHeight - 220) : undefined;

  return (
    <>
      <SpotlightOverlay rect={rect} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-title"
        className="fixed z-[201] left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md rounded-2xl border border-gold/30 bg-white shadow-2xl p-5 space-y-4"
        style={panelTop != null ? { top: panelTop } : { bottom: "5rem" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
              {t("flowLabel", { flow: t(`flows.${activeFlow}`) })}
            </p>
            <h2 id="walkthrough-title" className="font-display font-bold text-navy mt-1">
              {t(`${activeFlow}.${step.titleKey}.title`)}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label={tCommon("dismissHint")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          {t(`${activeFlow}.${step.bodyKey}.body`)}
        </p>
        <p className="text-xs text-gray-400">
          {t("stepOf", { current: stepIndex + 1, total: steps.length })}
        </p>
        <div className="flex justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePrev} disabled={stepIndex === 0 || pending}>
            <ChevronLeft className="h-4 w-4" />
            {tCommon("walkthroughPrev")}
          </Button>
          <Button type="button" variant="gold" size="sm" onClick={handleNext} disabled={pending}>
            {stepIndex >= steps.length - 1 ? tCommon("walkthroughFinish") : tCommon("walkthroughNext")}
            {stepIndex < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}