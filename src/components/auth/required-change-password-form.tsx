"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { completeRequiredPasswordChange } from "@/actions/auth";

export function RequiredChangePasswordForm() {
  const t = useTranslations("auth.requiredPassword");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="h-5 w-5 text-navy" />
        <h1 className="text-xl font-semibold text-gray-900">{t("title")}</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">{t("description")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const fd = new FormData(e.currentTarget);
          const newPassword = fd.get("newPassword") as string;
          const confirm = fd.get("confirmPassword") as string;
          if (newPassword !== confirm) {
            setError(t("mismatch"));
            return;
          }
          startTransition(async () => {
            const result = await completeRequiredPasswordChange(newPassword);
            if ("error" in result && result.error) {
              if (result.error === "PASSWORD_TOO_SHORT") setError(t("tooShort"));
              else setError(t("failed"));
              return;
            }
            router.push(`/${locale}/dashboard`);
            router.refresh();
          });
        }}
        className="space-y-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6"
      >
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
        )}
        <Input
          name="newPassword"
          type="password"
          label={t("new")}
          required
          minLength={8}
          disabled={pending}
          autoComplete="new-password"
        />
        <Input
          name="confirmPassword"
          type="password"
          label={t("confirm")}
          required
          minLength={8}
          disabled={pending}
          autoComplete="new-password"
        />
        <Button type="submit" variant="gold" className="w-full" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </form>
    </div>
  );
}