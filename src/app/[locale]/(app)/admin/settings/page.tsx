import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { adminQuery } from "@/lib/admin-safe";
import { getIntegrationAdminView } from "@/lib/platform-integrations";
import { getAnalyticsAdminView } from "@/lib/analytics-config";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AppSettingsForm } from "@/components/admin/app-settings-form";
import { IntegrationsConfigPanel } from "@/components/admin/integrations-config-panel";
import { PlatformBackupPanel } from "@/components/admin/platform-backup-panel";
import { VapidConfigPanel } from "@/components/admin/vapid-config-panel";
import { getVapidAdminView } from "@/lib/vapid-config";
import { getMinuteAiAdminView } from "@/lib/minute-ai-config";
import { MinuteAiConfigPanel } from "@/components/admin/minute-ai-config-panel";
import { DEFAULT_APP_NAME } from "@/lib/app-branding-shared";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("adminNav");
  const tPages = await getTranslations("adminPages");

  const [settings, integration, analytics, vapid, minuteAiConfig] = await Promise.all([
    adminQuery(
      "appSettings",
      () => prisma.appSettings.findUnique({ where: { id: "global" } }),
      null
    ),
    adminQuery("integrations", () => getIntegrationAdminView(), {
      stripeEnabled: false,
      resendEnabled: false,
      stripeSecretKeySet: false,
      stripePublishableKeySet: false,
      stripeWebhookSecretSet: false,
      resendApiKeySet: false,
      emailFrom: "",
      stripePublishableKeyPreview: "",
      webhookUrl: "",
      stripeConfigured: false,
      resendConfigured: false,
    }),
    adminQuery("analytics", () => getAnalyticsAdminView(), {
      gaMeasurementId: "",
      configured: false,
      productionUrl: "https://clubminutes.api.mg",
    }),
    adminQuery("vapid", () => getVapidAdminView(), {
      configured: false,
      publicKeySet: false,
      privateKeySet: false,
      subject: "",
      publicKeyPreview: "",
      envFallback: false,
    }),
    adminQuery("minuteAi", () => getMinuteAiAdminView(), {
      globallyEnabled: true,
      monthlyQuotaPerClub: 50,
      provider: "xai" as const,
      model: "grok-3-mini",
      apiConfigured: false,
      apiKeySet: false,
      apiKeyPreview: "",
      envFallback: false,
      envFallbackVar: "XAI_API_KEY",
    }),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={tNav("settings")} description={tPages("settings")} />
      <Card>
        <CardContent className="pt-6">
        <AppSettingsForm
          settings={{
            appName: settings?.appName ?? DEFAULT_APP_NAME,
            tagline: settings?.tagline ?? "",
            supportEmail: settings?.supportEmail ?? "",
            contactToEmail: settings?.contactToEmail ?? "",
            contactBccEmail: settings?.contactBccEmail ?? "",
            signupNotifyEmail: settings?.signupNotifyEmail ?? "",
            trialDays: settings?.trialDays ?? 14,
            maintenanceMode: settings?.maintenanceMode ?? false,
            gaMeasurementId: analytics.gaMeasurementId,
            gaConfigured: analytics.configured,
            productionUrl: analytics.productionUrl,
          }}
        />
        <IntegrationsConfigPanel integration={integration} />
        <MinuteAiConfigPanel config={minuteAiConfig} />
        <VapidConfigPanel vapid={vapid} />
        <PlatformBackupPanel />
        </CardContent>
      </Card>
    </div>
  );
}