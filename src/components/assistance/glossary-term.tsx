"use client";

import { useState, useId } from "react";
import { useTranslations } from "next-intl";
import type { GlossaryTermKey } from "@/lib/assistance/glossary";

export function GlossaryTerm({
  term,
  children,
}: {
  term: GlossaryTermKey;
  children: React.ReactNode;
}) {
  const t = useTranslations("assistance.glossary");
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline">
      <button
        type="button"
        className="underline decoration-dotted decoration-gold underline-offset-2 text-inherit font-inherit cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded"
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {children}
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute z-50 left-0 top-full mt-1 w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg"
        >
          <span className="font-semibold text-navy block mb-0.5">{t(`${term}.term`)}</span>
          {t(`${term}.definition`)}
        </span>
      )}
    </span>
  );
}