"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { sendMeetingInvitation } from "@/actions/meetings";

export function MeetingInvitationButton({
  meetingId,
  variant = "gold",
  size = "default",
  className,
}: {
  meetingId: string;
  variant?: "gold" | "outline" | "default";
  size?: "default" | "sm";
  className?: string;
}) {
  const t = useTranslations("meetings");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function handleSend() {
    startTransition(async () => {
      const result = await sendMeetingInvitation(meetingId, locale);
      if (result.error === "NO_RECIPIENTS") {
        setToast(t("invitationNoRecipients"));
        return;
      }
      if (result.error) {
        setToast(t("invitationError"));
        return;
      }
      setToast(t("invitationSent", { count: result.sent ?? 0 }));
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={handleSend}
        disabled={pending}
      >
        <Mail className="h-4 w-4" />
        {pending ? t("invitationSending") : t("sendInvitation")}
      </Button>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
