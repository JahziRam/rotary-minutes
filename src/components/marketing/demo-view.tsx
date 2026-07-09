"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { initDemoSession } from "@/actions/demo";
import { DemoApp } from "./demo-app";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export function DemoView({
  locale,
}: {
  locale: string;
  club?: unknown;
}) {
  const t = useTranslations("demo");
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    initDemoSession().then(() => setSessionReady(true));
  }, []);

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-navy-dark text-white lg:hidden">
        <div className="h-1 bg-gold" />
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href={`/${locale}`} className="font-display text-lg font-bold">
            Rotary Minutes
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher variant="dark" />
            <Link
              href={`/${locale}`}
              className="text-xs text-white/70 hover:text-white"
            >
              ← {t("backHome")}
            </Link>
          </div>
        </div>
      </div>
      <DemoApp locale={locale} />
    </div>
  );
}