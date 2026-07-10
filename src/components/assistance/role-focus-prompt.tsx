"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserCircle, X } from "lucide-react";
import { setAssistanceFocusRole } from "@/actions/assistance";
import type { AssistanceFocusRole } from "@/lib/assistance/missions";
import { useAssistance } from "./assistance-context";
import { Button } from "@/components/ui/button";

const ROLES: AssistanceFocusRole[] = [
  "SECRETARY",
  "TREASURER",
  "PRESIDENT",
  "READER",
];

export function RoleFocusPrompt() {
  const t = useTranslations("assistance.rolePrompt");
  const assistance = useAssistance();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  if (!assistance?.showRolePrompt || dismissed) return null;

  function select(role: AssistanceFocusRole) {
    startTransition(async () => {
      await setAssistanceFocusRole(role);
      setDismissed(true);
      router.refresh();
    });
  }

  function skip() {
    select(assistance!.focusRole);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-prompt-title"
      className="fixed inset-0 z-[220] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-navy/50" aria-hidden />
      <div className="relative z-[221] w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="h-1 bg-gold" />
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-navy/10 flex items-center justify-center">
                <UserCircle className="h-6 w-6 text-navy" />
              </div>
              <div>
                <h2 id="role-prompt-title" className="font-display text-xl font-bold text-navy">
                  {t("title")}
                </h2>
                <p className="text-sm text-gray-500">{t("subtitle")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={skip}
              disabled={pending}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label={t("skip")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                disabled={pending}
                onClick={() => select(role)}
                className="text-left p-4 rounded-xl border border-gray-200 hover:border-gold hover:bg-gold/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
              >
                <p className="font-semibold text-navy text-sm">{t(`roles.${role}.title`)}</p>
                <p className="text-xs text-gray-500 mt-1">{t(`roles.${role}.desc`)}</p>
              </button>
            ))}
          </div>

          <Button variant="outline" className="w-full" disabled={pending} onClick={skip}>
            {t("useClubRole")}
          </Button>
        </div>
      </div>
    </div>
  );
}