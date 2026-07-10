"use client";

import { ContextualHintBanner } from "./contextual-hint-banner";
import type { ContextualHintId } from "@/lib/assistance/hints";

export function PageAssistance({ hints }: { hints: ContextualHintId[] }) {
  return (
    <div className="space-y-3 mb-4">
      {hints.map((hintId) => (
        <ContextualHintBanner key={hintId} hintId={hintId} />
      ))}
    </div>
  );
}