"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CompanyLegalFooter } from "@/components/legal/company-legal-footer";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="h-1 bg-gold" />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href={`/${locale}`} className="font-display text-2xl font-bold text-navy">
              Rotary Minutes
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-6">
              {t("forgotPassword")}
            </h1>
            {sent ? (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg p-4">
                Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="space-y-4"
              >
                <Input name="email" type="email" label={t("email")} required />
                <Button type="submit" className="w-full">
                  {t("resetPassword")}
                </Button>
              </form>
            )}
            <p className="mt-4 text-center text-sm text-gray-500">
              <Link href={`/${locale}/login`} className="text-navy font-medium hover:underline">
                {t("login")}
              </Link>
            </p>
          </div>
        </div>
      </div>
      <CompanyLegalFooter />
    </div>
  );
}