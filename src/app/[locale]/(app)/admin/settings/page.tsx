import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getIntegrationAdminView } from "@/lib/platform-integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSettingsForm } from "@/components/admin/app-settings-form";
import { IntegrationsConfigPanel } from "@/components/admin/integrations-config-panel";
import { Settings } from "lucide-react";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, integration] = await Promise.all([
    prisma.appSettings.findUnique({ where: { id: "global" } }),
    getIntegrationAdminView(),
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
          }}
        />
        <IntegrationsConfigPanel integration={integration} />
      </CardContent>
    </Card>
  );
}