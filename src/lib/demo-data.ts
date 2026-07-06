/** Static demo data — read-only sandbox, no DB required */

import { DEMO_CLUB_SLUG } from "@/lib/demo-constants";

export const DEMO_CLUB = {
  id: "demo-club",
  name: "Rotary Club de Paris",
  slug: DEMO_CLUB_SLUG,
  meetingLocation: "Hôtel Lutetia, 45 Bd Raspail",
  meetingDay: "Mardi",
  meetingTime: "12:30",
  presidentName: "Jean Dupont",
  secretaryName: "Marie Martin",
  memberCount: 42,
  district: "1660",
  country: "France",
  city: "Paris",
  email: "secretariat@rotary-paris.fr",
  website: "https://rotary-paris.fr",
};

export const DEMO_MEMBERS = [
  { id: "m1", firstName: "Jean", lastName: "Dupont", position: "Président", email: "j.dupont@email.fr", joinDate: "2018" },
  { id: "m2", firstName: "Marie", lastName: "Martin", position: "Secrétaire", email: "m.martin@email.fr", joinDate: "2019" },
  { id: "m3", firstName: "Pierre", lastName: "Bernard", position: "Trésorier", email: "p.bernard@email.fr", joinDate: "2015" },
  { id: "m4", firstName: "Sophie", lastName: "Leroy", position: "Présidente Commission Intl.", email: "s.leroy@email.fr", joinDate: "2020" },
  { id: "m5", firstName: "Luc", lastName: "Moreau", position: "Membre", email: "l.moreau@email.fr", joinDate: "2022" },
  { id: "m6", firstName: "Camille", lastName: "Petit", position: "Membre", email: "c.petit@email.fr", joinDate: "2023" },
];

export const DEMO_MEETINGS = [
  {
    id: "meet1",
    title: "Réunion statutaire",
    date: new Date("2026-07-01"),
    location: "Hôtel Lutetia",
    type: "STATUTORY",
    presidedBy: "Jean Dupont",
    secretary: "Marie Martin",
    attendanceRate: 85,
    startTime: "12:30",
  },
  {
    id: "meet2",
    title: "Commission International",
    date: new Date("2026-06-24"),
    location: "Hôtel Lutetia",
    type: "COMMISSION",
    presidedBy: "Jean Dupont",
    secretary: "Marie Martin",
    attendanceRate: 78,
    startTime: "12:30",
  },
  {
    id: "meet3",
    title: "Réunion statutaire",
    date: new Date("2026-07-08"),
    location: "Hôtel Lutetia",
    type: "STATUTORY",
    presidedBy: "Jean Dupont",
    secretary: "Marie Martin",
    attendanceRate: 0,
    startTime: "12:30",
  },
];

export const DEMO_MINUTES = [
  {
    id: "pv1",
    title: "PV Réunion statutaire — 1er juillet 2026",
    status: "FINALIZED",
    date: new Date("2026-07-01"),
    author: "Marie Martin",
  },
  {
    id: "pv2",
    title: "PV Commission International — 24 juin 2026",
    status: "REVIEW",
    date: new Date("2026-06-24"),
    author: "Marie Martin",
  },
  {
    id: "pv3",
    title: "PV Réunion statutaire — 17 juin 2026",
    status: "DRAFT",
    date: new Date("2026-06-17"),
    author: "Marie Martin",
  },
];

export const DEMO_STATS = {
  meetingsCount: 12,
  meetingsThisMonth: 2,
  annualAttendance: 82,
  openActions: 5,
  scheduledEmails: 2,
  notificationCount: 3,
  mandateLabel: "2025-2026",
};

export const DEMO_NOTIFICATIONS = [
  { id: "n1", title: "PV en attente de validation", message: "PV Commission International — 24 juin 2026", time: "Il y a 2 h", type: "review" },
  { id: "n2", title: "Réunion demain", message: "Réunion statutaire — Hôtel Lutetia, 12h30", time: "Il y a 1 j", type: "meeting" },
  { id: "n3", title: "Action assignée", message: "Publier le calendrier des événements — Sophie Leroy", time: "Il y a 3 j", type: "action" },
];

export const DEMO_OPEN_ACTIONS = [
  { id: "a1", title: "Publier le calendrier 2026-2027", responsible: "Sophie Leroy", due: "15 mars 2026" },
  { id: "a2", title: "Coordonner campagne vaccination OMS", responsible: "Pierre Bernard", due: "30 mars 2026" },
  { id: "a3", title: "Valider budget commission", responsible: "Jean Dupont", due: "1 avril 2026" },
];

export const DEMO_EMAIL_TEMPLATES = [
  { id: "t1", name: "Convocation réunion", subject: "Convocation — {{meetingDate}}", uses: 24 },
  { id: "t2", name: "Rappel assiduité", subject: "Votre participation — {{clubName}}", uses: 8 },
  { id: "t3", name: "PV finalisé", subject: "Procès-verbal disponible — {{minuteTitle}}", uses: 15 },
];

export const DEMO_EMAIL_CAMPAIGNS = [
  { id: "c1", name: "Convocation mars 2026", status: "SENT", recipients: 38, sentAt: "28 fév. 2026" },
  { id: "c2", name: "Newsletter district 1660", status: "SCHEDULED", recipients: 42, sentAt: "8 mars 2026" },
];

export const DEMO_EMAIL_CONTACTS = [
  { id: "ec1", email: "j.dupont@email.fr", name: "Jean Dupont", group: "Bureau" },
  { id: "ec2", email: "m.martin@email.fr", name: "Marie Martin", group: "Bureau" },
  { id: "ec3", email: "membres@rotary-paris.fr", name: "Liste membres", group: "Tous" },
];

export const DEMO_ATTENDANCE_MONTHS = [
  { month: "Sep", rate: 78 },
  { month: "Oct", rate: 82 },
  { month: "Nov", rate: 85 },
  { month: "Déc", rate: 80 },
  { month: "Jan", rate: 88 },
  { month: "Fév", rate: 84 },
];

export const DEMO_DISTRICT_CLUBS = [
  { name: "Rotary Club de Paris", members: 42, attendance: 82, minutes: 11 },
  { name: "Rotary Club de Lyon", members: 38, attendance: 79, minutes: 9 },
  { name: "Rotary Club de Marseille", members: 35, attendance: 76, minutes: 8 },
  { name: "Moyenne district", members: 38, attendance: 79, minutes: 9, isAvg: true },
];

export const DEMO_LIVE_AGENDA = [
  { id: "l1", title: "Ouverture & quorum", status: "COMPLETED", note: "28 présents, 4 excusés" },
  { id: "l2", title: "Mot du président", status: "COMPLETED", note: "Bilan actions humanitaires Q1" },
  { id: "l3", title: "Décisions du conseil", status: "IN_PROGRESS", note: "Budget 2026-2027 en discussion…" },
  { id: "l4", title: "Communications", status: "OPEN", note: "" },
  { id: "l5", title: "Clôture", status: "OPEN", note: "" },
];

export const DEMO_MANDATES = [
  { role: "Président", name: "Jean Dupont", period: "2025-2026" },
  { role: "Secrétaire", name: "Marie Martin", period: "2025-2026" },
  { role: "Trésorier", name: "Pierre Bernard", period: "2025-2026" },
];

export function getDemoData(locale: string) {
  const isFr = locale === "fr";
  return {
    notifications: isFr
      ? DEMO_NOTIFICATIONS
      : DEMO_NOTIFICATIONS.map((n) => ({
          ...n,
          title: n.id === "n1" ? "Minutes pending review" : n.id === "n2" ? "Meeting tomorrow" : "Action assigned",
          message:
            n.id === "n1"
              ? "International Commission minutes — Jun 24, 2026"
              : n.id === "n2"
                ? "Statutory meeting — Hôtel Lutetia, 12:30 PM"
                : "Publish event calendar — Sophie Leroy",
          time: n.id === "n1" ? "2 h ago" : n.id === "n2" ? "1 d ago" : "3 d ago",
        })),
    openActions: isFr
      ? DEMO_OPEN_ACTIONS
      : DEMO_OPEN_ACTIONS.map((a) => ({
          ...a,
          title:
            a.id === "a1"
              ? "Publish 2026-2027 calendar"
              : a.id === "a2"
                ? "Coordinate WHO vaccination campaign"
                : "Validate commission budget",
          due: a.id === "a1" ? "Mar 15, 2026" : a.id === "a2" ? "Mar 30, 2026" : "Apr 1, 2026",
        })),
    months: isFr
      ? DEMO_ATTENDANCE_MONTHS
      : DEMO_ATTENDANCE_MONTHS.map((m) => ({
          ...m,
          month: { Sep: "Sep", Oct: "Oct", Nov: "Nov", Déc: "Dec", Jan: "Jan", Fév: "Feb" }[m.month] ?? m.month,
        })),
  };
}