"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/actions/auth";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{t("forgotPassword")}</h1>
      {sent ? (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg p-4">{t("resetEmailSent")}</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const email = new FormData(e.currentTarget).get("email") as string;
            startTransition(async () => {
              await requestPasswordReset(email, locale);
              setSent(true);
            });
          }}
          className="space-y-4"
        >
          <Input name="email" type="email" label={t("email")} required disabled={pending} />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("sending") : t("resetPassword")}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href={`/${locale}/login`} className="text-navy font-medium hover:underline">
          {t("login")}
        </Link>
      </p>
    </>
  );
}