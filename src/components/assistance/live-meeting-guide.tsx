"use client";

import { ContextualHintBanner } from "./contextual-hint-banner";
import { GuidedEmptyStateClient } from "./guided-empty-state-client";

export function LiveMeetingGuide({ hasMinute }: { hasMinute: boolean }) {
  return (
    <div className="space-y-4 lg:col-span-2">
      <ContextualHintBanner hintId="live_meeting_intro" />
      <ContextualHintBanner hintId="live_attendance" />
      {!hasMinute && <GuidedEmptyStateClient stateKey="live_no_minute" />}
    </div>
  );
}