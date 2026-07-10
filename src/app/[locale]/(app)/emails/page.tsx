import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail, FileText, Users, Send, Clock } from "lucide-react";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { FeatureUnavailable } from "@/components/layout/feature-unavailable";
import { SmtpSettingsPanel } from "@/components/emails/smtp-settings-panel";
import { requireFeature } from "@/lib/require-feature";
import { getClubEmailSettings } from "@/actions/club-email-settings";
import { getSession } from "@/lib/cached-auth";
import { hasRolePermission } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageAssistance } from "@/components/assistance/page-assistance";

const sections = [
  { key: "compose", icon: Send, href: "compose" },
  { key: "templates", icon: FileText, href: "templates" },
  { key: "campaigns", icon: Mail, href: "campaigns" },
  { key: "contacts", icon: Users, href: "contacts" },
  { key: "history", icon: Clock, href: "history" },
] as const;

export default async function EmailsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("emails");
  const tc = await getTranslations("common");
  const gate = await requireFeature("emailsEnabled");

  if ("error" in gate) {
    if (gate.error === "FEATURE_DISABLED") {
      return (
        <AppShellServer title={t("title")}>
          <FeatureUnavailable
            feature="emailsEnabled"
            locale={locale}
            plan={gate.ctx.club.subscription?.plan}
          />
        </AppShellServer>
      );
    }
    return (
      <AppShellServer title={t("title")}>
        <p className="text-gray-500">{tc("noResults")}</p>
      </AppShellServer>
    );
  }

  const { ctx } = gate;
  const session = await getSession();
  const canSend = await hasRolePermission(ctx.role, "emails.send", ctx.isSuperAdmin);
  const defaultSmtpSettings = {
    useCustomSmtp: false,
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpFrom: "",
    smtpFromName: "",
    hasPassword: false,
    lastSmtpError: null,
    lastSmtpFallbackAt: null,
  };
  const smtpResult = await getClubEmailSettings();
  const smtpSettings =
    smtpResult && "settings" in smtpResult
      ? (smtpResult.settings ?? defaultSmtpSettings)
      : defaultSmtpSettings;

  return (
    <AppShellServer title={t("title")}>
      <div className="space-y-6">
        <PageAssistance hints={["emails_intro", "emails_compose_action"]} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map(({ key, icon: Icon, href }) => (
            <Link
              key={key}
              href={`/${locale}/emails/${href}`}
              data-assist={key === "compose" ? "emails-compose-link" : undefined}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-navy/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-navy" />
                    </div>
                    <CardTitle className="text-base">{t(key)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{t(`${key}Desc`)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <SmtpSettingsPanel
          initialSettings={smtpSettings}
          canManage={canSend}
          userEmail={session?.user?.email}
        />
      </div>
    </AppShellServer>
  );
}