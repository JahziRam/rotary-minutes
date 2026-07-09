/** Configuration centralisée des modules club (feature flags + navigation). */
export const CLUB_MODULES = [
  { key: "treasury", enabled: "treasuryEnabled", menuVisible: "treasuryMenuVisible", href: "/treasury", navKey: "treasury", labelFr: "Trésorerie", labelEn: "Treasury" },
  { key: "actions", enabled: "actionsEnabled", menuVisible: "actionsMenuVisible", href: "/actions", navKey: "actions", labelFr: "Actions", labelEn: "Actions" },
  { key: "calendar", enabled: "calendarEnabled", menuVisible: "calendarMenuVisible", href: "/calendar", navKey: "calendar", labelFr: "Calendrier", labelEn: "Calendar" },
  { key: "memberPortal", enabled: "memberPortalEnabled", menuVisible: "memberPortalMenuVisible", href: "/my-account", navKey: "myAccount", labelFr: "Mon compte", labelEn: "My account" },
  { key: "attendanceReports", enabled: "attendanceReportsEnabled", menuVisible: "attendanceReportsMenuVisible", href: "/attendance-reports", navKey: "attendanceReports", labelFr: "Assiduité", labelEn: "Attendance" },
  { key: "events", enabled: "eventsEnabled", menuVisible: "eventsMenuVisible", href: "/events", navKey: "events", labelFr: "Événements", labelEn: "Events" },
  { key: "documents", enabled: "documentsEnabled", menuVisible: "documentsMenuVisible", href: "/documents", navKey: "documents", labelFr: "Documents", labelEn: "Documents" },
  { key: "fileManager", enabled: "fileManagerEnabled", menuVisible: "fileManagerMenuVisible", href: "/documents", navKey: "documents", labelFr: "Fichiers", labelEn: "Files" },
  { key: "governance", enabled: "governanceEnabled", menuVisible: "governanceMenuVisible", href: "/governance", navKey: "governance", labelFr: "Gouvernance", labelEn: "Governance" },
  { key: "integrations", enabled: "integrationsEnabled", menuVisible: "integrationsMenuVisible", href: "/settings/integrations", navKey: "integrations", labelFr: "Intégrations", labelEn: "Integrations" },
] as const;

export type ClubModuleKey = (typeof CLUB_MODULES)[number]["key"];