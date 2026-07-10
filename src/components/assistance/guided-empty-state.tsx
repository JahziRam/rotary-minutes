import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { PageHelpLink } from "./page-help-link";

export function GuidedEmptyState({
  locale,
  icon: Icon,
  title,
  description,
  primaryLabel,
  primaryHref,
  helpAnchor,
  secondaryLabel,
  secondaryHref,
}: {
  locale: string;
  icon: LucideIcon;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  helpAnchor: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-navy/20 bg-gradient-to-br from-navy/5 to-gold/5 p-8 sm:p-10 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-navy/10 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-navy" aria-hidden />
      </div>
      <h3 className="font-display text-lg font-bold text-navy mb-2">{title}</h3>
      <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed mb-6">
        {description}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href={primaryHref.startsWith("/") ? `/${locale}${primaryHref}` : primaryHref}
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        {secondaryLabel && secondaryHref && (
          <Link
            href={secondaryHref.startsWith("/") ? `/${locale}${secondaryHref}` : secondaryHref}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            {secondaryLabel}
          </Link>
        )}
        <PageHelpLink locale={locale} anchor={helpAnchor} variant="button" />
      </div>
    </div>
  );
}