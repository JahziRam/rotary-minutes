"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { polishMinuteAgendaItem } from "@/actions/minute-ai";

export function MinuteAiPolishButton({
  minuteId,
  agendaItemId,
  rawNotes,
  disabled,
  onPolished,
}: {
  minuteId: string;
  agendaItemId: string;
  rawNotes: string;
  disabled?: boolean;
  onPolished: (data: {
    description: string;
    decisions: string;
    actions: string;
    responsible: string;
    dueDate: string;
  }) => void;
}) {
  const t = useTranslations("minutes.aiAssist");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePolish() {
    if (!rawNotes.trim()) {
      setError(t("error.emptyNotes"));
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await polishMinuteAgendaItem(minuteId, agendaItemId, rawNotes);
      if ("success" in result && result.success) {
        onPolished({
          description: result.polished.description,
          decisions: result.polished.decisions,
          actions: result.polished.actions,
          responsible: result.polished.responsible,
          dueDate: result.polished.dueDate ?? "",
        });
        return;
      }

      if ("error" in result && result.error) {
        const known = [
          "FEATURE_DISABLED",
          "GLOBALLY_DISABLED",
          "API_KEY_MISSING",
          "QUOTA_EXCEEDED",
          "AI_UNAVAILABLE",
          "AI_ERROR",
          "EMPTY_NOTES",
        ] as const;
        if (known.includes(result.error as (typeof known)[number])) {
          setError(t(`error.${result.error}` as "error.generic"));
        } else {
          setError(t("error.generic"));
        }
      }
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || pending}
        onClick={handlePolish}
      >
        <Sparkles className="h-4 w-4 mr-1" />
        {pending ? t("polishing") : t("polish")}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}