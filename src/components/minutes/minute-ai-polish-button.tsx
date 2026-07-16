"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { polishMinuteAgendaItem } from "@/actions/minute-ai";

const POLISH_ERROR_KEYS = [
  "FEATURE_DISABLED",
  "GLOBALLY_DISABLED",
  "API_KEY_MISSING",
  "QUOTA_EXCEEDED",
  "AI_UNAVAILABLE",
  "AI_ERROR",
  "EMPTY_NOTES",
  "NOT_FOUND",
  "LOCKED",
  "FORBIDDEN",
  "COMMISSION_REQUIRED",
  "UNAUTHORIZED",
] as const;

type PolishErrorKey = (typeof POLISH_ERROR_KEYS)[number];

function resolvePolishError(
  code: string,
  t: (key: string) => string
): string {
  if (POLISH_ERROR_KEYS.includes(code as PolishErrorKey)) {
    return t(`error.${code}`);
  }
  return t("error.generic");
}

export function MinuteAiPolishButton({
  minuteId,
  agendaItemId,
  agendaTitle,
  rawNotes,
  existingDecisions = "",
  existingActions = "",
  existingResponsible = "",
  existingDueDate = "",
  disabled,
  onEnsureSaved,
  onPolished,
}: {
  minuteId: string;
  agendaItemId: string;
  agendaTitle: string;
  rawNotes: string;
  existingDecisions?: string;
  existingActions?: string;
  existingResponsible?: string;
  existingDueDate?: string;
  disabled?: boolean;
  onEnsureSaved?: (agendaItemId: string) => Promise<string | { error: string }>;
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
    if (!agendaTitle.trim()) {
      setError(t("error.NOT_FOUND"));
      return;
    }

    if (!rawNotes.trim()) {
      setError(t("error.emptyNotes"));
      return;
    }

    setError(null);
    startTransition(async () => {
      let resolvedAgendaItemId = agendaItemId;
      if (onEnsureSaved) {
        const ensured = await onEnsureSaved(agendaItemId);
        if (typeof ensured !== "string") {
          setError(resolvePolishError(ensured.error, t));
          return;
        }
        resolvedAgendaItemId = ensured;
      }

      const result = await polishMinuteAgendaItem(minuteId, {
        agendaItemId: resolvedAgendaItemId,
        agendaTitle,
        rawNotes,
        existingDecisions,
        existingActions,
        existingResponsible,
        existingDueDate,
      });
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
        setError(resolvePolishError(result.error, t));
        return;
      }

      setError(t("error.generic"));
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