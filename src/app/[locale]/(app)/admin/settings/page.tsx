import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { adminQuery } from "@/lib/admin-safe";
import { getIntegrationAdminView } from "@/lib/platform-integrations";
import { getAnalyticsAdminView } from "@/lib/analytics-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSettingsForm } from "@/components/admin/app-settings-form";
import { IntegrationsConfigPanel } from "@/components/admin/integrations-config-panel";
import { Settings } from "lucide-react";
import { PlatformBackupPanel } from "@/components/admin/platform-backup-panel";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, integration, analytics] = await Promise.all([
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
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-navy" />
          Paramètres de la plateforme SaaS
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AppSettingsForm
          settings={{
            appName: settings?.appName ?? "Rotary Minutes",
            tagline: settings?.tagline ?? "",
            supportEmail: settings?.supportEmail ?? "",
            trialDays: settings?.trialDays ?? 14,
            maintenanceMode: settings?.maintenanceMode ?? false,
            gaMeasurementId: analytics.gaMeasurementId,
            gaConfigured: analytics.configured,
            productionUrl: analytics.productionUrl,
          }}
        />
        <IntegrationsConfigPanel integration={integration} />
        <PlatformBackupPanel />
      </CardContent>
    </Card>
  );
}