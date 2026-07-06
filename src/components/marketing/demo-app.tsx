"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Home,
  FileText,
  Users,
  Mail,
  Calendar,
  BarChart3,
  Settings,
  Lock,
  ArrowLeft,
  Bell,
  Map,
  LifeBuoy,
  Menu,
  X,
  Coins,
  Wallet,
  CheckSquare,
  CalendarRange,
  Ticket,
  UserCircle,
  FolderOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MinutePreview } from "@/components/minutes/minute-preview";
import { getDemoMinutePreview } from "@/lib/demo-minute-preview";
import { DEMO_CLUB } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { DemoReadOnlyBanner } from "./demo-ui";
import { DemoLiveMeeting } from "./demo-live-meeting";
import {
  DemoDashboardPanel,
  DemoNotificationsPanel,
  DemoMeetingsPanel,
  DemoMinutesPanel,
  DemoEmailsPanel,
  DemoMembersPanel,
  DemoStatisticsPanel,
  DemoDistrictPanel,
  DemoSettingsPanel,
  DemoSupportPanel,
  DemoMinuteEditorPanel,
  DemoDuesPanel,
  DemoTreasuryPanel,
  DemoActionsPanel,
  DemoCalendarPanel,
  DemoEventsPanel,
  DemoPortalPanel,
  DemoDocumentsPanel,
} from "./demo-panels";

export type DemoTab =
  | "dashboard"
  | "notifications"
  | "meetings"
  | "minutes"
  | "emails"
  | "members"
  | "dues"
  | "treasury"
  | "actions"
  | "calendar"
  | "events"
  | "myAccount"
  | "documents"
  | "statistics"
  | "district"
  | "settings"
  | "support";

type DemoView = DemoTab | "minutePreview" | "liveMeeting" | "minuteEditor";

const NAV: { id: DemoTab; icon: typeof Home; labelKey: string }[] = [
  { id: "dashboard", icon: Home, labelKey: "dashboard" },
  { id: "notifications", icon: Bell, labelKey: "notifications" },
  { id: "meetings", icon: Calendar, labelKey: "meetings" },
  { id: "minutes", icon: FileText, labelKey: "minutes" },
  { id: "emails", icon: Mail, labelKey: "emails" },
  { id: "members", icon: Users, labelKey: "members" },
  { id: "dues", icon: Coins, labelKey: "dues" },
  { id: "treasury", icon: Wallet, labelKey: "treasury" },
  { id: "actions", icon: CheckSquare, labelKey: "actions" },
  { id: "calendar", icon: CalendarRange, labelKey: "calendar" },
  { id: "events", icon: Ticket, labelKey: "events" },
  { id: "myAccount", icon: UserCircle, labelKey: "myAccount" },
  { id: "documents", icon: FolderOpen, labelKey: "documents" },
  { id: "statistics", icon: BarChart3, labelKey: "statistics" },
  { id: "district", icon: Map, labelKey: "district" },
  { id: "settings", icon: Settings, labelKey: "settings" },
  { id: "support", icon: LifeBuoy, labelKey: "support" },
];

const MOBILE_NAV: DemoTab[] = ["dashboard", "meetings", "minutes", "members", "emails"];

export function DemoApp({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const tNav = useTranslations("nav");
  const [tab, setTab] = useState<DemoTab>("dashboard");
  const [view, setView] = useState<DemoView>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const clubName = DEMO_CLUB.name;
  const panelProps = {
    locale,
    onPreviewMinute: () => setView("minutePreview"),
    onLiveMeeting: () => setView("liveMeeting"),
    onMinuteEditor: () => setView("minuteEditor"),
  };

  const goToTab = (id: DemoTab) => {
    setTab(id);
    setView(id);
    setMenuOpen(false);
  };

  const titleKey = NAV.find((n) => n.id === (view === "minutePreview" || view === "liveMeeting" || view === "minuteEditor" ? tab : view))?.labelKey ?? "dashboard";

  const renderContent = () => {
    if (view === "minutePreview") {
      return (
        <MinutePreview
          data={getDemoMinutePreview(locale)}
          locale={locale}
          backHref="#"
          pdfEnabled={false}
          pdfVisible
          emailsEnabled={false}
          emailsVisible
          hideBackLink
        />
      );
    }
    if (view === "liveMeeting") {
      return <DemoLiveMeeting locale={locale} onBack={() => setView(tab)} />;
    }
    if (view === "minuteEditor") {
      return (
        <DemoMinuteEditorPanel
          locale={locale}
          onPreviewMinute={() => setView("minutePreview")}
        />
      );
    }

    switch (view) {
      case "dashboard":
        return <DemoDashboardPanel {...panelProps} />;
      case "notifications":
        return <DemoNotificationsPanel locale={locale} />;
      case "meetings":
        return <DemoMeetingsPanel {...panelProps} />;
      case "minutes":
        return <DemoMinutesPanel {...panelProps} />;
      case "emails":
        return <DemoEmailsPanel locale={locale} />;
      case "members":
        return <DemoMembersPanel locale={locale} />;
      case "dues":
        return <DemoDuesPanel locale={locale} />;
      case "treasury":
        return <DemoTreasuryPanel locale={locale} />;
      case "actions":
        return <DemoActionsPanel locale={locale} />;
      case "calendar":
        return <DemoCalendarPanel locale={locale} />;
      case "events":
        return <DemoEventsPanel locale={locale} />;
      case "myAccount":
        return <DemoPortalPanel locale={locale} />;
      case "documents":
        return <DemoDocumentsPanel locale={locale} />;
      case "statistics":
        return <DemoStatisticsPanel locale={locale} />;
      case "district":
        return <DemoDistrictPanel locale={locale} />;
      case "settings":
        return <DemoSettingsPanel locale={locale} />;
      case "support":
        return <DemoSupportPanel locale={locale} />;
      default:
        return <DemoDashboardPanel {...panelProps} />;
    }
  };

  const isSubView = view === "minutePreview" || view === "liveMeeting" || view === "minuteEditor";

  return (
    <div className="min-h-screen bg-gray-50">
      <DemoSidebar
        clubName={clubName}
        tab={tab}
        onTab={goToTab}
        locale={locale}
        tNav={tNav}
        tDemo={t}
        className="hidden lg:flex"
      />

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-[var(--sidebar-w)] bg-navy-dark text-white shadow-xl">
            <div className="h-1 bg-gold" />
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="font-display font-bold">Menu</span>
              <button type="button" onClick={() => setMenuOpen(false)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)]">
              {NAV.map(({ id, icon: Icon, labelKey }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => goToTab(id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    tab === id ? "bg-white/10 text-white" : "text-white/70"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tNav(labelKey)}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="lg:pl-[var(--sidebar-w)]">
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white px-3 py-3 sm:px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="lg:hidden p-1.5 rounded-lg border border-gray-200"
              onClick={() => setMenuOpen(true)}
              aria-label="Menu"
            >
              <Menu className="h-5 w-5 text-navy" />
            </button>
            <div className="min-w-0">
              {isSubView ? (
                <button
                  type="button"
                  onClick={() => setView(tab)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-navy"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("backToDemo")}
                </button>
              ) : (
                <>
                  <h1 className="text-base font-semibold text-gray-900 truncate sm:text-lg">
                    {tNav(titleKey)}
                  </h1>
                  <p className="text-xs text-gray-500 truncate lg:hidden">{clubName}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="gold" className="gap-1 text-[10px] sm:text-xs">
              <Lock className="h-3 w-3" />
              <span className="hidden xs:inline">{t("readOnly")}</span>
            </Badge>
            <Link
              href={`/${locale}/register`}
              className="inline-flex h-9 items-center rounded-lg bg-gold px-3 text-[11px] font-semibold text-navy-dark hover:bg-gold-light sm:px-4 sm:text-sm"
            >
              {t("startTrial")}
            </Link>
          </div>
        </header>

        <main className="p-3 pb-[calc(var(--bottom-nav-h)+1rem)] sm:p-4 lg:p-6 lg:pb-6 max-w-7xl mx-auto space-y-4">
          {!isSubView && (
            <DemoReadOnlyBanner message={t("fullDemoNotice")} locale={locale} ctaLabel={t("startTrial")} />
          )}
          {renderContent()}
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 safe-bottom">
        <div className="flex items-center justify-around h-[var(--bottom-nav-h)] px-1">
          {MOBILE_NAV.map((id) => {
            const item = NAV.find((n) => n.id === id)!;
            const Icon = item.icon;
            const active = tab === id && !isSubView;
            return (
              <button
                key={id}
                type="button"
                onClick={() => goToTab(id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors",
                  active ? "text-navy" : "text-gray-400"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-gold")} />
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-2 text-gray-400"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>
    </div>
  );
}

function DemoSidebar({
  clubName,
  tab,
  onTab,
  locale,
  tNav,
  tDemo,
  className,
}: {
  clubName: string;
  tab: DemoTab;
  onTab: (t: DemoTab) => void;
  locale: string;
  tNav: ReturnType<typeof useTranslations>;
  tDemo: ReturnType<typeof useTranslations>;
  className?: string;
}) {
  return (
    <aside className={cn("lg:flex-col lg:w-[var(--sidebar-w)] lg:fixed lg:inset-y-0 bg-navy-dark text-white", className)}>
      <div className="h-1 bg-gold" />
      <div className="p-5 border-b border-white/10">
        <Link href={`/${locale}`} className="block">
          <h1 className="font-display text-xl font-bold">Rotary Minutes</h1>
          <p className="text-xs text-white/60 mt-1 truncate">{clubName}</p>
          <Badge variant="gold" className="mt-2 text-[10px] gap-1">
            <Lock className="h-2.5 w-2.5" />
            DEMO
          </Badge>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === id ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {tNav(labelKey)}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <Link
          href={`/${locale}/register`}
          className="flex w-full items-center justify-center rounded-lg bg-gold py-2.5 text-sm font-semibold text-navy-dark hover:bg-gold-light"
        >
          {tDemo("startTrial")}
        </Link>
      </div>
    </aside>
  );
}