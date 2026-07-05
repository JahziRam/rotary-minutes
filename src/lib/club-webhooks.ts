import { createHmac, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma, WebhookEvent } from "@/generated/prisma/client";

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

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