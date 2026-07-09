"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { trackLandingCta } from "@/lib/landing-analytics";

export function LandingHeroActions({
  locale,
  ctaLabel,
  demoLabel,
}: {
  locale: string;
  ctaLabel: string;
  demoLabel: string;
}) {
  return (
    <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3 lg:justify-start">
      <Link
        href={`/${locale}/register`}
        onClick={() => trackLandingCta("hero", "register")}
        className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 text-base font-semibold text-navy-dark shadow-lg shadow-gold/25 transition-all hover:bg-gold-light sm:w-auto"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <Link
        href={`/${locale}/demo`}
        onClick={() => trackLandingCta("hero", "demo")}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 text-base font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 sm:w-auto"
      >
        <Play className="h-4 w-4" />
        {demoLabel}
      </Link>
    </div>
  );
}