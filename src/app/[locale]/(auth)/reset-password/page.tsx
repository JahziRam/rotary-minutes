"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CompanyLegalFooter } from "@/components/legal/company-legal-footer";
import { AppBrandName } from "@/components/brand/app-brand-name";
import { resetPasswordWithToken } from "@/actions/auth";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="h-1 bg-gold" />
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-red-600">{t("resetInvalidLink")}</p>
        </div>
        <CompanyLegalFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="h-1 bg-gold" />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href={`/${locale}`} className="font-display text-2xl font-bold text-navy">
              <AppBrandName />
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-6">{t("resetPassword")}</h1>
            {done ? (
              <div className="space-y-4">
                <p className="text-sm text-green-700 bg-green-50 rounded-lg p-4">
                  {t("resetSuccess")}
                </p>
                <Link
                  href={`/${locale}/login`}
                  className="block text-center text-sm text-navy font-medium hover:underline"
                >
                  {t("login")}
                </Link>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  setPending(true);
                  const fd = new FormData(e.currentTarget);
                  const password = fd.get("password") as string;
                  const confirm = fd.get("confirm") as string;
                  if (password !== confirm) {
                    setError(t("passwordMismatch"));
                    setPending(false);
                    return;
                  }
                  const result = await resetPasswordWithToken(token, password, locale);
                  setPending(false);
                  if ("error" in result && result.error) {
                    if (result.error === "PASSWORD_TOO_SHORT") setError(t("passwordTooShort"));
                    else if (result.error === "INVALID_TOKEN") setError(t("resetInvalidLink"));
                    else setError(t("resetFailed"));
                    return;
                  }
                  setDone(true);
                }}
                className="space-y-4"
              >
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
                )}
                <Input name="password" type="password" label={t("newPassword")} required minLength={8} />
                <Input
                  name="confirm"
                  type="password"
                  label={t("confirmPassword")}
                  required
                  minLength={8}
                />
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? t("resetting") : t("resetPassword")}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
      <CompanyLegalFooter />
    </div>
  );
}