import type { WebhookEvent } from "@/generated/prisma/client";

/** Supported outbound webhook events for club integrations. */
export const CLUB_WEBHOOK_EVENTS: WebhookEvent[] = [
  "MINUTE_FINALIZED",
  "MEETING_CREATED",
  "MEMBER_CREATED",
  "DUES_PAID",
  "ACTION_COMPLETED",
  "EVENT_CREATED",
  "BUDGET_ENTRY_CREATED",
];