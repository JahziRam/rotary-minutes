"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { changePassword } from "@/actions/auth";

export function ChangePasswordForm() {
  const t = useTranslations("memberPortal.password");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            const currentPassword = fd.get("currentPassword") as string;
            const newPassword = fd.get("newPassword") as string;
            const confirm = fd.get("confirmPassword") as string;
            if (newPassword !== confirm) {
              setError(t("mismatch"));
              return;
            }
            startTransition(async () => {
              const result = await changePassword(currentPassword, newPassword);
              if ("error" in result && result.error) {
                if (result.error === "INVALID_CURRENT_PASSWORD") setError(t("invalidCurrent"));
                else if (result.error === "PASSWORD_TOO_SHORT") setError(t("tooShort"));
                else if (result.error === "NO_PASSWORD") setError(t("noPassword"));
                else setError(t("failed"));
                return;
              }
              e.currentTarget.reset();
              setToast(t("success"));
            });
          }}
          className="space-y-3 max-w-md"
        >
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
          )}
          <Input
            name="currentPassword"
            type="password"
            label={t("current")}
            required
            disabled={pending}
            autoComplete="current-password"
          />
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
          <Button type="submit" variant="gold" disabled={pending}>
            {pending ? t("saving") : t("save")}
          </Button>
        </form>
      </CardContent>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Card>
  );
}