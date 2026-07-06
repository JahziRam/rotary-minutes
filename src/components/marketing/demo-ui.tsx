"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoReadOnlyBanner({
  message,
  locale,
  ctaLabel,
}: {
  message: string;
  locale: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-amber-900">{message}</p>
      <Link
        href={`/${locale}/register`}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-gold px-4 text-xs font-semibold text-navy-dark hover:bg-gold-light"
      >
        {ctaLabel} →
      </Link>
    </div>
  );
}

export function DemoLockedButton({
  label,
  icon: Icon,
  variant = "outline",
  onClick,
  className,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "gold" | "outline" | "navy";
  onClick?: () => void;
  className?: string;
}) {
  const styles = {
    gold: "bg-gold/80 text-navy-dark hover:bg-gold",
    outline: "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
    navy: "bg-navy text-white hover:bg-navy-light",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-not-allowed opacity-90",
        styles[variant],
        className
      )}
      title="Lecture seule"
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
      <Lock className="h-3 w-3 opacity-60" />
    </button>
  );
}

export function DemoFeaturePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-navy/10 bg-navy/5 px-2.5 py-1 text-xs font-medium text-navy">
      {label}
    </span>
  );
}