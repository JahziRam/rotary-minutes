import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type EmailHistoryRecipient = {
  email: string;
  status: "sent" | "failed" | "simulated" | "skipped" | "pending";
  error?: string | null;
};

/**
 * Persist a system/club email send as EmailCampaign + EmailLog rows
 * so it appears under Emails → History (same store as compose campaigns).
 */
export async function recordEmailCampaign(params: {
  clubId: string;
  /** Display name in history, e.g. "PV — réunion du 10/07" */
  name: string;
  subject: string;
  /** HTML or plain body snapshot (truncated for storage) */
  body?: string;
  recipients: EmailHistoryRecipient[];
}): Promise<{ campaignId: string } | { error: string }> {
  const recipients = params.recipients.filter((r) => r.email.includes("@"));
  if (recipients.length === 0) {
    return { error: "NO_RECIPIENTS" };
  }

  const errorCount = recipients.filter((r) => r.status === "failed").length;
  const allFailed = errorCount === recipients.length;
  const body =
    (params.body?.trim() || params.subject).slice(0, 50_000) || params.subject;

  const campaign = await prisma.emailCampaign.create({
    data: {
      clubId: params.clubId,
      name: params.name.slice(0, 200),
      subject: params.subject.slice(0, 500),
      body,
      recipients: recipients.map((r) => r.email.toLowerCase()),
      status: allFailed ? "FAILED" : "SENT",
      sentAt: new Date(),
      errorCount,
      logs: {
        create: recipients.map((r) => ({
          recipient: r.email.toLowerCase(),
          status: r.status,
          error: r.error?.slice(0, 1000) ?? null,
        })),
      },
    },
    select: { id: true },
  });

  for (const loc of ["fr", "en", "es"]) {
    revalidatePath(`/${loc}/emails`);
    revalidatePath(`/${loc}/emails/history`);
  }

  return { campaignId: campaign.id };
}

export function emailStatusFromSendResult(ok: boolean, emailEnabled = true): EmailHistoryRecipient["status"] {
  if (!emailEnabled) return "simulated";
  return ok ? "sent" : "failed";
}
