"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { getAuthCaptchaChallenge } from "@/actions/auth";

export type AuthCaptchaPayload = {
  captchaToken: string;
  captchaAnswer: number;
  openedAt: number;
  website?: string;
};

export function AuthCaptchaField({
  onChallenge,
}: {
  onChallenge?: (payload: { token: string; openedAt: number }) => void;
}) {
  const t = useTranslations("auth.captcha");
  const [openedAt, setOpenedAt] = useState(() => Date.now());
  const [challenge, setChallenge] = useState<{
    a: number;
    b: number;
    token: string;
  } | null>(null);

  async function loadChallenge() {
    const next = await getAuthCaptchaChallenge();
    const issuedAt = Date.now();
    setChallenge(next);
    setOpenedAt(issuedAt);
    onChallenge?.({ token: next.token, openedAt: issuedAt });
  }

  useEffect(() => {
    void loadChallenge();
  }, []);

  if (!challenge) return null;

  return (
    <div className="space-y-2">
      <input type="hidden" name="captchaToken" value={challenge.token} />
      <input type="hidden" name="openedAt" value={openedAt} />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute opacity-0 pointer-events-none h-0 w-0"
        aria-hidden
      />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            name="captchaAnswer"
            type="number"
            inputMode="numeric"
            label={t("label", { a: challenge.a, b: challenge.b })}
            required
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          onClick={() => void loadChallenge()}
          className="h-10 px-3 text-xs font-medium text-navy hover:underline shrink-0"
        >
          {t("refresh")}
        </button>
      </div>
    </div>
  );
}

export function readAuthCaptchaFromForm(form: FormData): AuthCaptchaPayload {
  return {
    captchaToken: String(form.get("captchaToken") ?? ""),
    captchaAnswer: parseInt(String(form.get("captchaAnswer") ?? ""), 10),
    openedAt: parseInt(String(form.get("openedAt") ?? ""), 10),
    website: String(form.get("website") ?? "").trim() || undefined,
  };
}