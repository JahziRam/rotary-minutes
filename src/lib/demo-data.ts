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

export const DEMO_DUES = [
  { id: "d1", member: "Jean Dupont", amount: 250, currency: "EUR", fiscalYear: "2025-2026", dueDate: "2026-03-31", status: "PAID", paidAt: "2026-01-15", plan: "ANNUAL" as const, invoiceNumber: "INV-2025-0001", receiptNumber: "REC-2025-0001" },
  { id: "d2", member: "Marie Martin", amount: 20.83, currency: "EUR", fiscalYear: "2025-2026", dueDate: "2026-03-01", status: "PAID", paidAt: "2026-03-01", plan: "MONTHLY" as const, periodLabel: "mars 2026", invoiceNumber: "INV-2025-0012", receiptNumber: "REC-2025-0012" },
  { id: "d3", member: "Pierre Bernard", amount: 250, currency: "EUR", fiscalYear: "2025-2026", dueDate: "2026-03-31", status: "PENDING", paidAt: null, plan: "ANNUAL" as const, invoiceNumber: "INV-2025-0003", receiptNumber: null },
  { id: "d4", member: "Sophie Leroy", amount: 20.83, currency: "EUR", fiscalYear: "2025-2026", dueDate: "2026-04-01", status: "PENDING", paidAt: null, plan: "MONTHLY" as const, periodLabel: "avril 2026", invoiceNumber: "INV-2025-0015", receiptNumber: null },
  { id: "d5", member: "Luc Moreau", amount: 250, currency: "EUR", fiscalYear: "2025-2026", dueDate: "2026-03-31", status: "OVERDUE", paidAt: null, plan: "ANNUAL" as const, invoiceNumber: "INV-2025-0005", receiptNumber: null },
  { id: "d6", member: "Camille Petit", amount: 20.83, currency: "EUR", fiscalYear: "2025-2026", dueDate: "2026-03-01", status: "PENDING", paidAt: null, plan: "MONTHLY" as const, periodLabel: "mars 2026", invoiceNumber: "INV-2025-0018", receiptNumber: null },
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

export const DEMO_TREASURY = {
  balance: 12450,
  currency: "EUR",
  income: 8200,
  expenses: 3150,
  entries: [
    { id: "b1", label: "Cotisations Q1", type: "INCOME" as const, amount: 4200, date: "2026-01-15", category: "Cotisations" },
    { id: "b2", label: "Gala humanitaire", type: "INCOME" as const, amount: 2800, date: "2026-02-20", category: "Événements" },
    { id: "b3", label: "Location salle mars", type: "EXPENSE" as const, amount: 850, date: "2026-03-01", category: "Réunions" },
    { id: "b4", label: "Projet Madagascar", type: "EXPENSE" as const, amount: 1500, date: "2026-03-10", category: "Actions" },
  ],
};

export const DEMO_CALENDAR_EVENTS = [
  { id: "ce1", title: "Réunion statutaire", date: "2026-07-08", source: "MEETING", color: "bg-navy" },
  { id: "ce2", title: "Échéance cotisation — Luc Moreau", date: "2026-07-15", source: "DUES", color: "bg-amber-500" },
  { id: "ce3", title: "Gala humanitaire", date: "2026-07-22", source: "EVENT", color: "bg-emerald-500" },
  { id: "ce4", title: "Publier calendrier 2026-2027", date: "2026-07-18", source: "ACTION", color: "bg-violet-500" },
  { id: "ce5", title: "Anniversaire — Sophie Leroy", date: "2026-07-25", source: "BIRTHDAY", color: "bg-pink-500" },
];

export const DEMO_CLUB_EVENTS = [
  { id: "ev1", title: "Gala humanitaire 2026", date: "2026-07-22", location: "Hôtel Lutetia", registrations: 28, capacity: 50, fee: 75, status: "OPEN" },
  { id: "ev2", title: "Conférence Paix & éducation", date: "2026-09-12", location: "Maison de l'UNESCO", registrations: 12, capacity: 40, fee: 0, status: "OPEN" },
];

export const DEMO_DOCUMENTS = [
  { id: "doc1", title: "Statuts du club", category: "STATUTES", updatedAt: "2024-09-01" },
  { id: "doc2", title: "Budget 2025-2026", category: "BUDGET", updatedAt: "2025-07-15" },
  { id: "doc3", title: "PV Réunion statutaire — 1er juillet 2026", category: "MINUTES", updatedAt: "2026-07-02" },
  { id: "doc4", title: "Mandat président 2025-2026", category: "MANDATE", updatedAt: "2025-07-01" },
];

export const DEMO_PORTAL = {
  member: "Marie Martin",
  duesStatus: "PAID",
  attendanceRate: 92,
  openActions: 1,
  documentsReceived: 4,
};

export const DEMO_ACTIONS = [
  { id: "a1", title: "Publier le calendrier 2026-2027", responsible: "Sophie Leroy", due: "2026-07-18", status: "IN_PROGRESS", priority: "HIGH" },
  { id: "a2", title: "Coordonner campagne vaccination OMS", responsible: "Pierre Bernard", due: "2026-07-30", status: "OPEN", priority: "MEDIUM" },
  { id: "a3", title: "Valider budget commission", responsible: "Jean Dupont", due: "2026-08-01", status: "OPEN", priority: "HIGH" },
  { id: "a4", title: "Envoyer rapport district Q2", responsible: "Marie Martin", due: "2026-07-10", status: "COMPLETED", priority: "MEDIUM" },
];

export function getDemoDues(locale: string) {
  const isFr = locale === "fr";
  return DEMO_DUES.map((d) => ({
    ...d,
    dueDateLabel: isFr
      ? d.dueDate === "2026-03-31"
        ? "31 mars 2026"
        : d.dueDate
      : "Mar 31, 2026",
    statusLabel:
      d.status === "PAID"
        ? isFr
          ? "Payée"
          : "Paid"
        : d.status === "OVERDUE"
          ? isFr
            ? "En retard"
            : "Overdue"
          : isFr
            ? "En attente"
            : "Pending",
  }));
}

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