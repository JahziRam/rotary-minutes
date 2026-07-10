"use client";

import { useEffect, useRef, useTransition } from "react";
import { HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { resetUsageGuide } from "@/actions/usage-guide";
import { useUsageGuide } from "./usage-guide-context";
import { cn } from "@/lib/utils";

type LauncherVariant = "fab" | "sidebar" | "header";

export function UsageGuideLauncher({
  variant = "fab",
  className,
}: {
  variant?: LauncherVariant;
  className?: string;
}) {
  const t = useTranslations("usageGuide");
  const guide = useUsageGuide();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (buttonRef.current) {
      guide?.registerLauncher(buttonRef.current);
    }
  }, [guide]);

  if (!guide) return null;

  const { config, isOpen, openGuide, closeGuide } = guide;

  function handleOpen() {
    if (isOpen) {
      closeGuide();
      return;
    }
    startTransition(async () => {
      if (config.completed || config.dismissed) {
        await resetUsageGuide();
      }
      openGuide(0);
    });
  }
  const show =
    config.guideEnabled && config.clubSetupComplete;

  if (!show) return null;

  const hasPendingTour =
    config.shouldAutoStart && !config.completed && !config.dismissed;

  const baseStyles = {
    fab: cn(
      "fixed z-[100] bottom-[calc(var(--bottom-nav-h)+1rem)] right-4 lg:bottom-6 lg:right-6 relative",
      "h-12 w-12 rounded-full bg-navy text-white shadow-lg hover:bg-navy-dark",
      "flex items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
    ),
    sidebar: cn(
      "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
      "text-white/70 hover:bg-white/10 hover:text-white",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    ),
    header: cn(
      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-1"
    ),
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleOpen}
      disabled={pending}
      className={cn(baseStyles[variant], className)}
      aria-label={t("launcher")}
      aria-expanded={isOpen}
      aria-controls="usage-guide-panel"
      title={t("launcher")}
    >
      <HelpCircle
        className={cn(
          variant === "fab" ? "h-5 w-5 group-hover:scale-110 transition-transform" : "h-5 w-5 shrink-0",
          variant === "sidebar" && isOpen && "text-gold"
        )}
      />
      {variant !== "fab" && <span>{t("launcher")}</span>}
      {variant === "fab" && hasPendingTour && !isOpen && (
        <span
          className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-gold ring-2 ring-white"
          aria-hidden
        />
      )}
    </button>
  );
}