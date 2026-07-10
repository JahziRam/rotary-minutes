import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/cached-auth";
import { AdminShellServer } from "@/components/layout/admin-shell-server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();

  if (!session?.user?.isSuperAdmin) {
    redirect(`/${locale}/dashboard`);
  }

  return <AdminShellServer>{children}</AdminShellServer>;
}