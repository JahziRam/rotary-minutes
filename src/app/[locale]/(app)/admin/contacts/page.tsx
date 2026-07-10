import { getTranslations, setRequestLocale } from "next-intl/server";
import { listContactSubmissions } from "@/actions/admin-contacts";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ContactsInbox } from "@/components/admin/contacts-inbox";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("adminNav");
  const tPages = await getTranslations("adminPages");

  const result = await listContactSubmissions();
  const rows = "items" in result && result.items ? result.items : [];
  const items = rows.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader title={tNav("contacts")} description={tPages("contacts")} />
      <ContactsInbox items={items} />
    </div>
  );
}