import { prisma } from "@/lib/prisma";

type StripeClient = import("stripe").default;

const clubStripeCache = new Map<string, { key: string; client: StripeClient }>();

export async function getClubDuesPaymentSettings(clubId: string) {
  return prisma.clubDuesPaymentSettings.findUnique({ where: { clubId } });
}

export async function isClubDuesStripeEnabled(clubId: string): Promise<boolean> {
  const settings = await getClubDuesPaymentSettings(clubId);
  return !!(settings?.stripeEnabled && settings.stripeSecretKey?.trim());
}

export async function getClubStripe(clubId: string): Promise<StripeClient | null> {
  const settings = await getClubDuesPaymentSettings(clubId);
  const key = settings?.stripeSecretKey?.trim();
  if (!settings?.stripeEnabled || !key) return null;

  const cached = clubStripeCache.get(clubId);
  if (cached?.key === key) return cached.client;

  const { default: Stripe } = await import("stripe");
  const client = new Stripe(key, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });
  clubStripeCache.set(clubId, { key, client });
  return client;
}

export async function getClubStripeWebhookSecret(clubId: string): Promise<string | null> {
  const settings = await getClubDuesPaymentSettings(clubId);
  return settings?.stripeWebhookSecret?.trim() || null;
}

export function clubDuesWebhookUrl(clubId: string, baseUrl?: string): string {
  const root = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${root}/api/webhooks/stripe/club/${clubId}`;
}