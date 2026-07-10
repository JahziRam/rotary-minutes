"use client";

import { CoachBanner } from "./coach-banner";
import { MissionChecklist } from "./mission-checklist";

export function DashboardAssistance() {
  return (
    <div className="space-y-4">
      <CoachBanner />
      <MissionChecklist />
    </div>
  );
}