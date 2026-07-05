import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { SubscriptionPlans } from "@/components/settings/subscription-plans";

export default async function SubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { locale } = await params;
  const { checkout } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("settings");
  const tSub = await getTranslations("subscription");

  const checkoutStatus =
    checkout === "success" ? "success" : checkout === "cancel" ? "cancel" : null;

  return (
    <AppShellServer title={t("subscription")}>
      <div className="max-w-5xl space-y-4">
        <Link href={`/${locale}/settings`} className="text-sm text-navy hover:underline">
          ← Retour aux paramètres
        </Link>
        <SubscriptionPlans locale={locale} checkoutStatus={checkoutStatus} />
        <p className="text-sm text-gray-500 text-center">{tSub("stripeNote")}</p>
      </div>
    </AppShellServer>
  );
}