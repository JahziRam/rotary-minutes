"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { sendMemberLoginCredentials } from "@/actions/club-users";
import { Button } from "@/components/ui/button";

export function SendMemberLoginButton({
  memberId,
  memberEmail,
  isCurrentUser,
  compact = false,
  onSuccess,
  onError,
}: {
  memberId: string;
  memberEmail?: string | null;
  isCurrentUser?: boolean;
  compact?: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}) {
  const t = useTranslations("members");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const result = await sendMemberLoginCredentials(memberId, locale);
      if ("error" in result && result.error) {
        if (result.error === "NO_EMAIL") onError?.(t("noEmailForLogin"));
        else if (result.error === "SELF_LOGIN_SEND") onError?.(t("cannotSendOwnLogin"));
        else if (result.error === "MEMBER_LIMIT") onError?.(t("memberLimitReached"));
        else if (result.error === "EMAIL_FAILED") onError?.(t("loginSendFailed"));
        else onError?.(t("loginSendFailed"));
        return;
      }
      if ("success" in result && result.success) {
        onSuccess?.(t("loginSent"));
        router.refresh();
      }
    });
  }

  const disabled = pending || isCurrentUser || !memberEmail?.trim();

  if (compact) {
    return (
      <button
        type="button"
        title={
          isCurrentUser
            ? t("cannotSendOwnLogin")
            : !memberEmail?.trim()
              ? t("noEmailForLogin")
              : t("sendLogin")
        }
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          send();
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-navy hover:bg-navy/5 disabled:opacity-40"
      >
        <Mail className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={send}
        className="gap-2"
      >
        <Mail className="h-4 w-4" />
        {pending ? t("sendingLogin") : t("sendLogin")}
      </Button>
      <p className="text-xs text-gray-500">{t("sendLoginHint")}</p>
    </div>
  );
}