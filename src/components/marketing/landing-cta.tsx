"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Play, Mail } from "lucide-react";
import { ContactModal } from "./contact-modal";
import { trackLandingCta } from "@/lib/landing-analytics";

export function LandingCta({ locale }: { locale: string }) {
  const t = useTranslations("landing.finalCta");
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-r from-navy to-navy-dark py-12 text-white sm:py-16 lg:py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 100% 50%, rgba(245,166,35,.35), transparent 50%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-3 text-center sm:px-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">{t("title")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">{t("subtitle")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href={`/${locale}/register`}
              onClick={() => trackLandingCta("final_cta", "register")}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold px-8 text-base font-semibold text-navy-dark shadow-lg transition-all hover:bg-gold-light"
            >
              {t("cta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={`/${locale}/demo`}
              onClick={() => trackLandingCta("final_cta", "demo")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 text-base font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10"
            >
              <Play className="h-4 w-4" />
              {t("demo")}
            </Link>
            <button
              type="button"
              onClick={() => {
                trackLandingCta("final_cta", "contact");
                setContactOpen(true);
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 text-base font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10"
            >
              <Mail className="h-4 w-4" />
              {t("contact")}
            </button>
          </div>
          <p className="mt-4 text-sm text-white/45">{t("note")}</p>
        </div>
      </section>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} locale={locale} />
    </>
  );
}