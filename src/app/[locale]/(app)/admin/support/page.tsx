import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAdminSupportTickets } from "@/lib/queries/support";
import { adminQuery } from "@/lib/admin-safe";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SupportAdminPanel } from "@/components/admin/support-admin-panel";

export default async function AdminSupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("adminNav");
  const tPages = await getTranslations("adminPages");

  const tickets = await adminQuery(
    "supportTickets",
    () => getAdminSupportTickets(),
    []
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader title={tNav("support")} description={tPages("support")} />
      <SupportAdminPanel tickets={tickets} locale={locale} />
    </div>
  );
}