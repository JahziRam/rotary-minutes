"use client";

import { splitAppBrandName } from "@/lib/app-branding-shared";
import { useAppBranding } from "./app-branding-provider";

export function AppBrandName({
  name,
  className,
  accentClassName = "text-gold",
  variant = "split",
}: {
  /** Override; defaults to SaaS app name from settings */
  name?: string;
  className?: string;
  accentClassName?: string;
  /** split = first word + accent second part; single = full name */
  variant?: "split" | "single";
}) {
  const { appName } = useAppBranding();
  const display = name ?? appName;

  if (variant === "single") {
    return <span className={className}>{display}</span>;
  }

  const { lead, accent } = splitAppBrandName(display);
  if (!accent) {
    return <span className={className}>{lead}</span>;
  }

  return (
    <span className={className}>
      {lead} <span className={accentClassName}>{accent}</span>
    </span>
  );
}