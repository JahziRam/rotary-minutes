"use client";

import { AlertTriangle, Lightbulb } from "lucide-react";
import { analyzeMinuteDraft, type AgendaAssistItem } from "@/lib/minute-assist";

export function MinuteAssistPanel({
  items,
  meetingType,
  locale,
}: {
  items: AgendaAssistItem[];
  meetingType: string;
  locale: string;
}) {
  const hints = analyzeMinuteDraft(items, meetingType);
  const hasHints =
    hints.suggestions.length > 0 ||
    hints.missingActions.length > 0 ||
    hints.overdueActions.length > 0;

  if (!hasHints) return null;

  const isFr = locale === "fr";

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-2 text-sm">
      <p className="font-medium text-amber-900 flex items-center gap-2">
        <Lightbulb className="h-4 w-4" />
        {isFr ? "Aide à la rédaction" : "Writing assistant"}
      </p>
      {hints.suggestions.map((s) => (
        <p key={s} className="text-amber-800">{s}</p>
      ))}
      {hints.missingActions.length > 0 && (
        <p className="text-amber-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {isFr
            ? `Actions sans responsable : ${hints.missingActions.join(", ")}`
            : `Actions without owner: ${hints.missingActions.join(", ")}`}
        </p>
      )}
      {hints.overdueActions.length > 0 && (
        <p className="text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {isFr
            ? `Échéances dépassées : ${hints.overdueActions.join(", ")}`
            : `Overdue: ${hints.overdueActions.join(", ")}`}
        </p>
      )}
    </div>
  );
}