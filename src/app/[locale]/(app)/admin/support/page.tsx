import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getAdminSupportTickets,
  getSupportTicketDetail,
} from "@/lib/queries/support";
import { SupportAdminPanel } from "@/components/admin/support-admin-panel";

export default async function AdminSupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("support");

  const tickets = await getAdminSupportTickets();

  const ticketsWithMessages = await Promise.all(
    tickets.map(async (ticket) => {
      const detail = await getSupportTicketDetail(ticket.id, "", true);
      if (detail) return { ...detail, _count: ticket._count };
      return ticket;
    })
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("adminTitle")}</h1>
        <p className="text-gray-500 mt-1">{t("adminSubtitle")}</p>
      </div>
      <SupportAdminPanel tickets={ticketsWithMessages} locale={locale} />
    </div>
  );
}