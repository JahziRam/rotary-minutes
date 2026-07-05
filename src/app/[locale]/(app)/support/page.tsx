import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportTicketForm } from "@/components/support/support-ticket-form";
import { SupportTicketsList } from "@/components/support/support-tickets-list";
import {
  getUserSupportTickets,
  getSupportTicketDetail,
} from "@/lib/queries/support";

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("support");
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const tickets = await getUserSupportTickets(session.user.id);

  const ticketsWithMessages = await Promise.all(
    tickets.map(async (ticket) => {
      const detail = await getSupportTicketDetail(
        ticket.id,
        session.user!.id,
        false
      );
      return detail ?? ticket;
    })
  );

  return (
    <AppShellServer title={t("title")}>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-500 mt-1">{t("subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("newTicket")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SupportTicketForm locale={locale} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("myTickets")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SupportTicketsList tickets={ticketsWithMessages} locale={locale} />
          </CardContent>
        </Card>
      </div>
    </AppShellServer>
  );
}