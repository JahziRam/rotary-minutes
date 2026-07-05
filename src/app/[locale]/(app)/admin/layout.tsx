import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/cached-auth";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { AdminNav } from "@/components/admin/admin-nav";

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

  return (
    <AppShellServer title="Super Admin">
      <div className="space-y-6">
        <AdminNav />
        {children}
      </div>
    </AppShellServer>
  );
}