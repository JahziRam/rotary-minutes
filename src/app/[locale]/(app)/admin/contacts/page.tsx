import { setRequestLocale } from "next-intl/server";
import { listContactSubmissions } from "@/actions/admin-contacts";
import { ContactsInbox } from "@/components/admin/contacts-inbox";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const result = await listContactSubmissions();
  const rows = "items" in result && result.items ? result.items : [];
  const items = rows.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Messages contact</h1>
        <p className="text-sm text-gray-500 mt-1">
          Demandes reçues via le formulaire de la page d&apos;accueil.
        </p>
      </div>
      <ContactsInbox items={items} />
    </div>
  );
}