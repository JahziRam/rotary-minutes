"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginUser } from "@/actions/auth";

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const form = new FormData(e.currentTarget);
      const result = await loginUser(
        form.get("email") as string,
        form.get("password") as string
      );

      if (result.error) {
        setError(
          result.error === "INVALID_CREDENTIALS"
            ? t("invalidCredentials")
            : t("loginError")
        );
        return;
      }

      let dest = `/${locale}/dashboard`;
      if (result.isSuperAdmin) {
        dest = `/${locale}/admin`;
      } else if (result.hasPending && !result.hasApproved) {
        dest = `/${locale}/pending-approval`;
      }
      router.push(dest);
      router.refresh();
    } catch {
      setError(t("loginError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="h-1 bg-gold" />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link
              href={`/${locale}`}
              className="font-display text-2xl font-bold text-navy"
            >
              Rotary Minutes
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-6">
              {t("login")}
            </h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                name="email"
                type="email"
                label={t("email")}
                required
                autoComplete="email"
              />
              <Input
                name="password"
                type="password"
                label={t("password")}
                required
                autoComplete="current-password"
              />
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("loggingIn") : t("login")}
              </Button>
            </form>
            <div className="mt-4 text-center space-y-2">
              <Link
                href={`/${locale}/forgot-password`}
                className="text-sm text-navy hover:underline"
              >
                {t("forgotPassword")}
              </Link>
              <p className="text-sm text-gray-500">
                {t("noAccount")}{" "}
                <Link
                  href={`/${locale}/register`}
                  className="text-navy font-medium hover:underline"
                >
                  {t("register")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}