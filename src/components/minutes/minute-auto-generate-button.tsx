"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { autoGenerateMinuteFromMeeting } from "@/actions/minute-auto";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

export function MinuteAutoGenerateButton({
  minuteId,
  disabled,
}: {
  minuteId: string;
  disabled?: boolean;
}) {
  const t = useTranslations("minutes.autoGenerate");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function handleGenerate() {
    startTransition(async () => {
      const result = await autoGenerateMinuteFromMeeting(minuteId, locale);
      if ("success" in result && result.success) {
        setToast(t("success"));
        router.refresh();
      } else if ("error" in result) {
        setToast(t(`error.${result.error}`));
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || pending}
        onClick={handleGenerate}
      >
        <Sparkles className="h-4 w-4" />
        {pending ? "..." : t("button")}
      </Button>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}