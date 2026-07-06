import { createHmac, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma, WebhookEvent } from "@/generated/prisma/client";

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export { CLUB_WEBHOOK_EVENTS } from "@/lib/webhook-events";

export async function dispatchClubWebhook(
  clubId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const webhooks = await prisma.clubWebhook.findMany({
    where: {
      clubId,
      isActive: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) return;

  const envelope = {
    event,
    clubId,
    timestamp: new Date().toISOString(),
    data: payload,
  };
  const body = JSON.stringify(envelope);

  await Promise.allSettled(
    webhooks.map(async (hook) => {
      const signature = signPayload(hook.secret, body);
      let statusCode: number | null = null;
      let error: string | null = null;
      let deliveredAt: Date | null = null;

      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Rotary-Event": event,
            "X-Rotary-Signature": signature,
            "User-Agent": "RotaryMinutes-Webhooks/1.0",
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        statusCode = res.status;
        if (res.ok) {
          deliveredAt = new Date();
        } else {
          error = `HTTP ${res.status}`;
        }
      } catch (e) {
        error = e instanceof Error ? e.message : "Delivery failed";
      }

      await prisma.webhookDelivery.create({
        data: {
          webhookId: hook.id,
          event,
          payload: envelope as Prisma.InputJsonValue,
          statusCode,
          error,
          deliveredAt,
        },
      });
    })
  );
}

export function dispatchDuesPaidWebhook(
  clubId: string,
  payload: {
    duesId: string;
    memberId: string;
    amount: number;
    currency: string;
    paymentMethod?: string | null;
    receiptNumber?: string | null;
    paidAt: string;
  }
): void {
  void dispatchClubWebhook(clubId, "DUES_PAID", payload);
}

export function dispatchActionCompletedWebhook(
  clubId: string,
  payload: {
    actionId: string;
    title: string;
    completedAt: string;
    responsibleMemberId?: string | null;
  }
): void {
  void dispatchClubWebhook(clubId, "ACTION_COMPLETED", payload);
}

export function dispatchEventCreatedWebhook(
  clubId: string,
  payload: {
    eventId: string;
    title: string;
    startAt: string;
    status: string;
  }
): void {
  void dispatchClubWebhook(clubId, "EVENT_CREATED", payload);
}

export function dispatchBudgetEntryCreatedWebhook(
  clubId: string,
  payload: {
    entryId: string;
    type: string;
    amount: number;
    currency: string;
    date: string;
    description: string;
    paymentMethod?: string | null;
  }
): void {
  void dispatchClubWebhook(clubId, "BUDGET_ENTRY_CREATED", payload);
}