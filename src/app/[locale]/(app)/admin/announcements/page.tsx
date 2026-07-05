import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { Megaphone } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function AdminAnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [clubs, history] = await Promise.all([
    prisma.club.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { author: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-navy" />
            Nouvelle annonce
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementForm clubs={clubs} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune annonce envoyée.</p>
          ) : (
            history.map((a) => (
              <div key={a.id} className="p-3 rounded-lg border border-gray-100">
                <p className="font-medium text-sm">{a.title}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(a.sentAt ?? a.createdAt, "d MMM yyyy HH:mm", { locale: fr })}
                  {" · "}{a.author.firstName} {a.author.lastName}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}