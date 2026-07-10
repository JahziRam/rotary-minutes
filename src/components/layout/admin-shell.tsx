import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileHeader } from "@/components/admin/admin-mobile-header";
import { OfflineIndicator } from "./offline-indicator";
import type { ViewAsClubOption } from "./club-view-as-switcher";

export function AdminShell({
  children,
  title,
  userEmail,
  logoutLabel,
  isSuperAdmin = false,
  viewAsClubs = [],
  viewAsClubId = null,
  shellLocale = "fr",
}: {
  children: React.ReactNode;
  title: string;
  userEmail?: string;
  logoutLabel: string;
  isSuperAdmin?: boolean;
  viewAsClubs?: ViewAsClubOption[];
  viewAsClubId?: string | null;
  shellLocale?: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <AdminSidebar
        userEmail={userEmail}
        logoutLabel={logoutLabel}
        isSuperAdmin={isSuperAdmin}
        viewAsClubs={viewAsClubs}
        viewAsClubId={viewAsClubId}
        shellLocale={shellLocale}
      />
      <div className="lg:pl-[var(--admin-sidebar-w)]">
        <AdminMobileHeader
          title={title}
          userEmail={userEmail}
          logoutLabel={logoutLabel}
          isSuperAdmin={isSuperAdmin}
          viewAsClubs={viewAsClubs}
          viewAsClubId={viewAsClubId}
          shellLocale={shellLocale}
        />
        <main className="p-4 lg:p-6 pb-[calc(2rem+var(--safe-bottom))] max-w-[1400px] mx-auto">{children}</main>
      </div>
      <OfflineIndicator />
    </div>
  );
}