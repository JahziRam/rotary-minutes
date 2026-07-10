import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileHeader } from "@/components/admin/admin-mobile-header";
import { OfflineIndicator } from "./offline-indicator";

export function AdminShell({
  children,
  title,
  userEmail,
  logoutLabel,
}: {
  children: React.ReactNode;
  title: string;
  userEmail?: string;
  logoutLabel: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <AdminSidebar userEmail={userEmail} logoutLabel={logoutLabel} />
      <div className="lg:pl-[var(--admin-sidebar-w)]">
        <AdminMobileHeader title={title} userEmail={userEmail} logoutLabel={logoutLabel} />
        <main className="p-4 lg:p-6 pb-8 max-w-[1400px] mx-auto">{children}</main>
      </div>
      <OfflineIndicator />
    </div>
  );
}