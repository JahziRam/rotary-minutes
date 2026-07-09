"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ContactModal } from "@/components/marketing/contact-modal";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { trackLandingCta, trackContactFormOpen } from "@/lib/landing-analytics";

export function LandingHeader({
  locale,
  loginLabel,
  ctaLabel,
  pricingLabel,
  demoLabel,
  contactLabel,
  helpLabel,
  navLinks,
}: {
  locale: string;
  loginLabel: string;
  ctaLabel: string;
  pricingLabel: string;
  demoLabel: string;
  contactLabel: string;
  helpLabel: string;
  navLinks: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const pathname = usePathname();

  function localeHref(target: Locale) {
    const suffix = pathname.replace(new RegExp(`^/${locale}`), "") || "";
    return `/${target}${suffix}`;
  }

  function openContact() {
    trackContactFormOpen();
    setContactOpen(true);
  }

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
            <Link
              href={`/${locale}/help`}
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {helpLabel}
            </Link>
            <button
              type="button"
              onClick={openContact}
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {contactLabel}
            </button>
            <div className="flex items-center gap-1 rounded-lg border border-white/15 p-0.5">
              {locales.map((loc) => (
                <Link
                  key={loc}
                  href={localeHref(loc)}
                  className={
                    loc === locale
                      ? "rounded-md bg-white/15 px-2 py-1 text-xs font-semibold uppercase text-white"
                      : "rounded-md px-2 py-1 text-xs uppercase text-white/60 hover:text-white"
                  }
                  title={localeLabels[loc]}
                >
                  {loc}
                </Link>
              ))}
            </div>
            <Link
              href={`/${locale}/login`}
              onClick={() => trackLandingCta("header", "login")}
              className="text-sm text-white/80 hover:text-white"
            >
              {loginLabel}
            </Link>
            <Link
              href={`/${locale}/register`}
              onClick={() => trackLandingCta("header", "register")}
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
              <Link
                href={`/${locale}/help`}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/10"
              >
                {helpLabel}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openContact();
                }}
                className="rounded-xl px-4 py-3 text-left text-sm font-medium text-white/85 hover:bg-white/10"
              >
                {contactLabel}
              </button>
              <Link
                href={`/${locale}/demo`}
                onClick={() => {
                  trackLandingCta("mobile_nav", "demo");
                  setOpen(false);
                }}
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
                onClick={() => {
                  trackLandingCta("mobile_nav", "register");
                  setOpen(false);
                }}
                className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-gold text-sm font-semibold text-navy-dark"
              >
                {ctaLabel}
              </Link>
              <div className="mt-3 flex justify-center gap-2">
                {locales.map((loc) => (
                  <Link
                    key={loc}
                    href={localeHref(loc)}
                    onClick={() => setOpen(false)}
                    className={
                      loc === locale
                        ? "text-xs font-semibold uppercase text-gold"
                        : "text-xs uppercase text-white/50"
                    }
                  >
                    {localeLabels[loc]}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        )}
      </header>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} locale={locale} />
    </>
  );
}