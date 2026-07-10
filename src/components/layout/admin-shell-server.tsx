import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/cached-auth";
import { getAdminTitleKey } from "@/lib/admin-nav-config";
import { AdminShell } from "./admin-shell";

export async function AdminShellServer({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const session = await getSession();
  const tAuth = await getTranslations("auth");
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/admin";
  const tAdmin = await getTranslations("adminNav");
  const resolvedTitle = title || tAdmin(getAdminTitleKey(pathname));

  return (
    <AdminShell
      title={resolvedTitle}
      userEmail={session?.user?.email ?? undefined}
      logoutLabel={tAuth("logout")}
    >
      {children}
    </AdminShell>
  );
}