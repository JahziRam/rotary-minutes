/** Client-safe club feature definitions (no Prisma). */

export interface ClubFeatureSet {
  emailsEnabled: boolean;
  statisticsEnabled: boolean;
  districtDashboard: boolean;
  pdfExport: boolean;
  offlineMode: boolean;
  liveMeetings: boolean;
  emailsMenuVisible: boolean;
  statisticsMenuVisible: boolean;
  pdfMenuVisible: boolean;
  liveMeetingsMenuVisible: boolean;
  districtMenuVisible: boolean;
  offlineMenuVisible: boolean;
  apiAccessEnabled: boolean;
  duesEnabled: boolean;
  duesMenuVisible: boolean;
  treasuryEnabled: boolean;
  treasuryMenuVisible: boolean;
  actionsEnabled: boolean;
  actionsMenuVisible: boolean;
  calendarEnabled: boolean;
  calendarMenuVisible: boolean;
  memberPortalEnabled: boolean;
  memberPortalMenuVisible: boolean;
  attendanceReportsEnabled: boolean;
  attendanceReportsMenuVisible: boolean;
  eventsEnabled: boolean;
  eventsMenuVisible: boolean;
  documentsEnabled: boolean;
  documentsMenuVisible: boolean;
  governanceEnabled: boolean;
  governanceMenuVisible: boolean;
  smartNotificationsEnabled: boolean;
  integrationsEnabled: boolean;
  integrationsMenuVisible: boolean;
  pwaEnhancedEnabled: boolean;
  eventsAdvancedEnabled: boolean;
  eventsAdvancedMenuVisible: boolean;
  fileManagerEnabled: boolean;
  fileManagerMenuVisible: boolean;
  documentSharingEnabled: boolean;
  treasuryImportEnabled: boolean;
  clubBackupEnabled: boolean;
  minuteAiAssistEnabled: boolean;
  memberLimit: number | null;
}

export const CLUB_FEATURE_KEYS = Object.keys({
  emailsEnabled: true,
  statisticsEnabled: true,
  districtDashboard: true,
  pdfExport: true,
  offlineMode: true,
  liveMeetings: true,
  emailsMenuVisible: true,
  statisticsMenuVisible: true,
  pdfMenuVisible: true,
  liveMeetingsMenuVisible: true,
  districtMenuVisible: true,
  offlineMenuVisible: true,
  apiAccessEnabled: true,
  duesEnabled: true,
  duesMenuVisible: true,
  treasuryEnabled: true,
  treasuryMenuVisible: true,
  actionsEnabled: true,
  actionsMenuVisible: true,
  calendarEnabled: true,
  calendarMenuVisible: true,
  memberPortalEnabled: true,
  memberPortalMenuVisible: true,
  attendanceReportsEnabled: true,
  attendanceReportsMenuVisible: true,
  eventsEnabled: true,
  eventsMenuVisible: true,
  documentsEnabled: true,
  documentsMenuVisible: true,
  governanceEnabled: true,
  governanceMenuVisible: true,
  smartNotificationsEnabled: true,
  integrationsEnabled: true,
  integrationsMenuVisible: true,
  pwaEnhancedEnabled: true,
  eventsAdvancedEnabled: true,
  eventsAdvancedMenuVisible: true,
  fileManagerEnabled: true,
  fileManagerMenuVisible: true,
  documentSharingEnabled: true,
  treasuryImportEnabled: true,
  clubBackupEnabled: true,
  minuteAiAssistEnabled: true,
  memberLimit: true,
}) as (keyof ClubFeatureSet)[];

export const CLUB_FEATURE_LABELS: Record<keyof ClubFeatureSet, { fr: string; en: string }> = {
  emailsEnabled: { fr: "Module emails", en: "Emails module" },
  statisticsEnabled: { fr: "Statistiques", en: "Statistics" },
  districtDashboard: { fr: "Tableau district", en: "District dashboard" },
  pdfExport: { fr: "Export PDF", en: "PDF export" },
  offlineMode: { fr: "Mode hors-ligne", en: "Offline mode" },
  liveMeetings: { fr: "Réunions en direct", en: "Live meetings" },
  emailsMenuVisible: { fr: "Menu emails visible", en: "Emails menu visible" },
  statisticsMenuVisible: { fr: "Menu statistiques visible", en: "Statistics menu visible" },
  pdfMenuVisible: { fr: "Menu PDF visible", en: "PDF menu visible" },
  liveMeetingsMenuVisible: { fr: "Menu réunions live visible", en: "Live meetings menu visible" },
  districtMenuVisible: { fr: "Menu district visible", en: "District menu visible" },
  offlineMenuVisible: { fr: "Menu hors-ligne visible", en: "Offline menu visible" },
  apiAccessEnabled: { fr: "API & webhooks", en: "API & webhooks" },
  duesEnabled: { fr: "Cotisations", en: "Dues" },
  duesMenuVisible: { fr: "Menu cotisations visible", en: "Dues menu visible" },
  treasuryEnabled: { fr: "Trésorerie", en: "Treasury" },
  treasuryMenuVisible: { fr: "Menu trésorerie visible", en: "Treasury menu visible" },
  actionsEnabled: { fr: "Gestion des tâches", en: "Task management" },
  actionsMenuVisible: { fr: "Menu tâches visible", en: "Tasks menu visible" },
  calendarEnabled: { fr: "Calendrier", en: "Calendar" },
  calendarMenuVisible: { fr: "Menu calendrier visible", en: "Calendar menu visible" },
  memberPortalEnabled: { fr: "Portail membre", en: "Member portal" },
  memberPortalMenuVisible: { fr: "Menu portail membre visible", en: "Member portal menu visible" },
  attendanceReportsEnabled: { fr: "Rapports d'assiduité", en: "Attendance reports" },
  attendanceReportsMenuVisible: { fr: "Menu assiduité visible", en: "Attendance menu visible" },
  eventsEnabled: { fr: "Événements", en: "Events" },
  eventsMenuVisible: { fr: "Menu événements visible", en: "Events menu visible" },
  documentsEnabled: { fr: "Documents", en: "Documents" },
  documentsMenuVisible: { fr: "Menu documents visible", en: "Documents menu visible" },
  governanceEnabled: { fr: "Gouvernance", en: "Governance" },
  governanceMenuVisible: { fr: "Menu gouvernance visible", en: "Governance menu visible" },
  smartNotificationsEnabled: { fr: "Notifications intelligentes", en: "Smart notifications" },
  integrationsEnabled: { fr: "Intégrations", en: "Integrations" },
  integrationsMenuVisible: { fr: "Menu intégrations visible", en: "Integrations menu visible" },
  pwaEnhancedEnabled: { fr: "PWA avancée", en: "Enhanced PWA" },
  eventsAdvancedEnabled: { fr: "Événements avancés", en: "Advanced events" },
  eventsAdvancedMenuVisible: { fr: "Menu événements avancés visible", en: "Advanced events menu visible" },
  fileManagerEnabled: { fr: "Gestionnaire de fichiers", en: "File manager" },
  fileManagerMenuVisible: { fr: "Menu fichiers visible", en: "File manager menu visible" },
  documentSharingEnabled: { fr: "Partage documents", en: "Document sharing" },
  treasuryImportEnabled: { fr: "Import trésorerie CSV", en: "Treasury CSV import" },
  clubBackupEnabled: { fr: "Sauvegarde club", en: "Club backup" },
  minuteAiAssistEnabled: {
    fr: "Assistant IA rédaction PV",
    en: "AI minutes writing assistant",
  },
  memberLimit: { fr: "Limite utilisateurs", en: "Member limit" },
};

export const DEFAULT_FEATURES: ClubFeatureSet = {
  emailsEnabled: true,
  statisticsEnabled: true,
  districtDashboard: false,
  pdfExport: true,
  offlineMode: false,
  liveMeetings: true,
  emailsMenuVisible: false,
  statisticsMenuVisible: false,
  pdfMenuVisible: false,
  liveMeetingsMenuVisible: false,
  districtMenuVisible: false,
  offlineMenuVisible: false,
  apiAccessEnabled: false,
  duesEnabled: true,
  duesMenuVisible: true,
  treasuryEnabled: true,
  treasuryMenuVisible: true,
  actionsEnabled: true,
  actionsMenuVisible: true,
  calendarEnabled: true,
  calendarMenuVisible: true,
  memberPortalEnabled: true,
  memberPortalMenuVisible: true,
  attendanceReportsEnabled: true,
  attendanceReportsMenuVisible: false,
  eventsEnabled: true,
  eventsMenuVisible: true,
  documentsEnabled: true,
  documentsMenuVisible: true,
  governanceEnabled: true,
  governanceMenuVisible: false,
  smartNotificationsEnabled: true,
  integrationsEnabled: false,
  integrationsMenuVisible: false,
  pwaEnhancedEnabled: true,
  eventsAdvancedEnabled: false,
  eventsAdvancedMenuVisible: false,
  fileManagerEnabled: false,
  fileManagerMenuVisible: false,
  documentSharingEnabled: false,
  treasuryImportEnabled: false,
  clubBackupEnabled: false,
  minuteAiAssistEnabled: false,
  memberLimit: null,
};