"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ContactModal } from "@/components/marketing/contact-modal";

export function LandingHeader({
  locale,
  otherLocale,
  loginLabel,
  ctaLabel,
  pricingLabel,
  demoLabel,
  contactLabel,
  navLinks,
}: {
  locale: string;
  otherLocale: string;
  loginLabel: string;
  ctaLabel: string;
  pricingLabel: string;
  demoLabel: string;
  contactLabel: string;
  navLinks: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy-dark/95 text-white backdrop-blur-md">
        <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <Link href={`/${locale}`} className="font-display text-lg font-bold tracking-tight sm:text-xl">
            Rotary <span className="text-gold">Minutes</span>
          </Link>

          <nav className="hidden items-center gap-3 md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {contactLabel}
            </button>
            <Link
              href={`/${otherLocale}`}
              className="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-white/70 hover:border-white/30 hover:text-white"
            >
              {otherLocale}
            </Link>
            <Link href={`/${locale}/login`} className="text-sm text-white/80 hover:text-white">
              {loginLabel}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="inline-flex h-10 items-center rounded-lg bg-gold px-5 text-sm font-semibold text-navy-dark hover:bg-gold-light"
            >
              {ctaLabel}
            </Link>
          </nav>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-white/10 bg-navy-dark/98 px-3 py-4 safe-bottom">
            <nav className="flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/10"
                >
                  {l.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setContactOpen(true);
                }}
                className="rounded-xl px-4 py-3 text-left text-sm font-medium text-white/85 hover:bg-white/10"
              >
                {contactLabel}
              </button>
              <Link
                href={`/${locale}/demo`}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/10"
              >
                {demoLabel}
              </Link>
              <Link
                href={`/${locale}/login`}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/10"
              >
                {loginLabel}
              </Link>
              <Link
                href={`/${locale}/register`}
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-gold text-sm font-semibold text-navy-dark"
              >
                {ctaLabel}
              </Link>
              <Link
                href={`/${otherLocale}`}
                onClick={() => setOpen(false)}
                className="mt-2 text-center text-xs text-white/50 uppercase"
              >
                {otherLocale}
              </Link>
            </nav>
          </div>
        )}
      </header>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} locale={locale} />
    </>
  );
}