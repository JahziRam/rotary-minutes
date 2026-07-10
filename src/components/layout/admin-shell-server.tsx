import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/cached-auth";
import { getAdminTitleKey } from "@/lib/admin-nav-config";
import { getViewAsClubId } from "@/lib/view-as-club";
import { resolveUiLocale } from "@/lib/locale-utils";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "./admin-shell";

export async function AdminShellServer({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const session = await getSession();
  const isSuperAdmin = session?.user?.isSuperAdmin ?? false;
  const tAuth = await getTranslations("auth");
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/admin";
  const shellLocale = resolveUiLocale(headersList.get("x-locale"));
  const tAdmin = await getTranslations("adminNav");
  const resolvedTitle = title || tAdmin(getAdminTitleKey(pathname));

  const viewAsClubId = isSuperAdmin ? await getViewAsClubId() : null;
  const viewAsClubs = isSuperAdmin
    ? await prisma.club.findMany({
        where: { isActive: true },
        select: { id: true, name: true, city: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <AdminShell
      title={resolvedTitle}
      userEmail={session?.user?.email ?? undefined}
      logoutLabel={tAuth("logout")}
      isSuperAdmin={isSuperAdmin}
      viewAsClubs={viewAsClubs}
      viewAsClubId={viewAsClubId}
      shellLocale={shellLocale}
    >
      {children}
    </AdminShell>
  );
}