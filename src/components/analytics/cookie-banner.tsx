"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Cookie } from "lucide-react";
import { useCookieConsent } from "./cookie-consent-provider";
import { useNativeApp } from "@/hooks/use-native-app";

export function CookieBanner() {
  const t = useTranslations("cookies");
  const locale = useLocale();
  const { bannerOpen, acceptAll, rejectOptional } = useCookieConsent();
  const { isNative } = useNativeApp();

  if (isNative || !bannerOpen) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="flex gap-3">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/10">
            <Cookie className="h-5 w-5 text-navy" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h2 id="cookie-banner-title" className="font-semibold text-gray-900">
                {t("title")}
              </h2>
              <p id="cookie-banner-desc" className="mt-1 text-sm text-gray-600 leading-relaxed">
                {t("description")}{" "}
                <Link
                  href={`/${locale}/privacy`}
                  className="text-navy font-medium underline underline-offset-2 hover:no-underline"
                >
                  {t("privacyLink")}
                </Link>
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={rejectOptional}
                className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t("reject")}
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="h-10 rounded-lg bg-gold px-4 text-sm font-semibold text-navy-dark hover:bg-gold-light transition-colors"
              >
                {t("accept")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}