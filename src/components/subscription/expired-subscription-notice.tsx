"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function ExpiredSubscriptionNotice({
  locale,
  clubName,
}: {
  locale: string;
  clubName: string;
}) {
  const t = useTranslations("subscription");
  const tAuth = useTranslations("auth");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-navy/10 flex items-center justify-center mx-auto">
          <CreditCard className="h-6 w-6 text-navy" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{t("expired.title")}</h1>
        <p className="text-sm text-gray-500">
          {t("expired.description", { club: clubName })}
        </p>
        <Link
          href={`/${locale}/settings/subscription`}
          className="inline-flex items-center justify-center w-full h-11 rounded-lg text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light transition-colors"
        >
          {t("expired.upgrade")}
        </Link>
        <SignOutButton label={tAuth("logout")} />
      </div>
    </div>
  );
}