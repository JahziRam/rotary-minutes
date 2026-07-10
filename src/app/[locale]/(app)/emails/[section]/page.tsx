import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { FeatureUnavailable } from "@/components/layout/feature-unavailable";
import { ContactsManager } from "@/components/emails/contacts-manager";
import { TemplatesPanel } from "@/components/emails/templates-panel";
import { ComposeForm } from "@/components/emails/compose-form";
import { HistoryList } from "@/components/emails/history-list";
import { requireFeature } from "@/lib/require-feature";
import { hasRolePermission } from "@/lib/roles";
import { isEmailEnabled } from "@/lib/email";
import {
  getEmailContacts,
  getEmailGroups,
  getEmailTemplates,
  getEmailHistory,
} from "@/lib/queries/emails";
import { ensureEmailSystemTemplates } from "@/lib/email-system-templates";

/** "campaigns" is intentionally omitted — section hidden from product UI. */
const VALID = ["compose", "templates", "contacts", "history"] as const;

export default async function EmailSectionPage({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale, section } = await params;
  setRequestLocale(locale);
  if (!VALID.includes(section as (typeof VALID)[number])) notFound();

  const t = await getTranslations("emails");
  const title = t(section as "compose");
  const gate = await requireFeature("emailsEnabled");

  if (gate.error === "FEATURE_DISABLED") {
    return (
      <AppShellServer title={title}>
        <FeatureUnavailable
          feature="emailsEnabled"
          locale={locale}
          plan={gate.ctx.club.subscription?.plan}
        />
      </AppShellServer>
    );
  }

  if (gate.error) return null;

  await ensureEmailSystemTemplates();

  const { ctx } = gate;
  const canSend = await hasRolePermission(ctx.role, "emails.send", ctx.isSuperAdmin);
  const emailEnabled = await isEmailEnabled();

  let content: ReactNode;

  switch (section) {
    case "contacts": {
      const [contacts, groups] = await Promise.all([
        getEmailContacts(ctx.clubId),
        getEmailGroups(ctx.clubId),
      ]);
      content = <ContactsManager contacts={contacts} groups={groups} canSend={canSend} />;
      break;
    }
    case "templates": {
      const templates = await getEmailTemplates(ctx.clubId, locale);
      content = <TemplatesPanel templates={templates} canSend={canSend} />;
      break;
    }
    case "compose": {
      const [templates, groups] = await Promise.all([
        getEmailTemplates(ctx.clubId, locale),
        getEmailGroups(ctx.clubId),
      ]);
      content = (
        <ComposeForm
          templates={templates}
          groups={groups}
          canSend={canSend}
          emailEnabled={emailEnabled}
        />
      );
      break;
    }
    case "history": {
      const logs = await getEmailHistory(ctx.clubId);
      content = <HistoryList logs={logs} locale={locale} />;
      break;
    }
    default:
      content = null;
  }

  return (
    <AppShellServer title={title}>
      <div className="max-w-4xl space-y-4">
        <Link href={`/${locale}/emails`} className="text-sm text-navy hover:underline">
          ← {t("back")}
        </Link>
        {content}
      </div>
    </AppShellServer>
  );
}