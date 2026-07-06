"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerClub } from "@/actions/auth";

export function RegisterForm({ referredByCode }: { referredByCode?: string }) {
  const t = useTranslations("auth");
  const tLegal = useTranslations("legal.disclaimer");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const password = form.get("password") as string;
    const confirm = form.get("confirmPassword") as string;

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    const result = await registerClub({
      firstName: form.get("firstName") as string,
      lastName: form.get("lastName") as string,
      email: form.get("email") as string,
      password,
      clubName: form.get("clubName") as string,
      country: form.get("country") as string,
      city: form.get("city") as string,
      language: locale === "en" ? "EN" : "FR",
      referredByCode,
    });

    if (result.error) {
      setError(
        result.error === "EMAIL_EXISTS"
          ? "Cet email est déjà utilisé"
          : "Erreur lors de l'inscription"
      );
      setLoading(false);
      return;
    }
    router.push(`/${locale}/onboarding`);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="h-1 bg-gold" />
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Link
              href={`/${locale}`}
              className="font-display text-2xl font-bold text-navy"
            >
              Rotary Minutes
            </Link>
            <p className="text-sm text-gray-500 mt-2">{t("trialInfo")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-6">
              {t("register")}
            </h1>
            {referredByCode && (
              <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3 mb-4">
                Parrainage : {referredByCode}
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input name="firstName" label={t("firstName")} required />
                <Input name="lastName" label={t("lastName")} required />
              </div>
              <Input
                name="clubName"
                label={t("clubName")}
                required
                placeholder="Rotary Club de Paris"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input name="city" label="Ville" required />
                <Input name="country" label="Pays" required />
              </div>
              <Input name="email" type="email" label={t("email")} required />
              <Input
                name="password"
                type="password"
                label={t("password")}
                required
                minLength={8}
              />
              <Input
                name="confirmPassword"
                type="password"
                label={t("confirmPassword")}
                required
              />
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  {error}
                </p>
              )}
              <p className="text-xs text-gray-500 leading-relaxed">
                {tLegal("text")}{" "}
                <Link href={`/${locale}/terms`} className="text-navy underline-offset-2 hover:underline">
                  {tLegal("termsLink")}
                </Link>
              </p>
              <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                {loading ? "..." : t("register")}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-500">
              {t("hasAccount")}{" "}
              <Link
                href={`/${locale}/login`}
                className="text-navy font-medium hover:underline"
              >
                {t("login")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}