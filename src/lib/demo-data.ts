/** Static demo data — read-only sandbox, no DB required */

import { DEMO_CLUB_SLUG } from "@/lib/demo-constants";
import { pickDemoLocale } from "@/lib/demo-i18n";

function L(locale: string, fr: string, en: string, es: string) {
  return pickDemoLocale(locale, { fr, en, es });
}

export const DEMO_CLUB = {
  id: "demo-club",
  name: "Rotary Club de Paris",
  slug: DEMO_CLUB_SLUG,
  type: "ROTARY" as const,
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
  notificationCount: 4,
  pendingJoinCount: 2,
  mandateLabel: "2025-2026",
};

export const DEMO_NOTIFICATIONS = [
  { id: "n0", title: "Demande d'adhésion", message: "Thomas Girard souhaite rejoindre le club", time: "Il y a 45 min", type: "join" },
  { id: "n1", title: "PV en attente de validation", message: "PV Commission International — 24 juin 2026", time: "Il y a 2 h", type: "review" },
  { id: "n2", title: "Réunion demain", message: "Réunion statutaire — Hôtel Lutetia, 12h30", time: "Il y a 1 j", type: "meeting" },
  { id: "n3", title: "Action assignée", message: "Publier le calendrier des événements — Sophie Leroy", time: "Il y a 3 j", type: "action" },
];

export const DEMO_PENDING_JOIN_REQUESTS = [
  {
    id: "jr1",
    firstName: "Thomas",
    lastName: "Girard",
    email: "t.girard@email.fr",
    requestedAt: "2026-07-09T10:15:00",
  },
  {
    id: "jr2",
    firstName: "Émilie",
    lastName: "Rousseau",
    email: "e.rousseau@email.fr",
    requestedAt: "2026-07-08T16:40:00",
  },
];

export const DEMO_PUBLIC_CLUBS = [
  { id: "c1", label: "Rotary Club de Paris — Paris, France", type: "ROTARY" as const },
  { id: "c2", label: "Rotary Club de Lyon — Lyon, France", type: "ROTARY" as const },
  { id: "c3", label: "Rotaract Paris Opéra — Paris, France", type: "ROTARACT" as const },
  { id: "c4", label: "Rotary Club de Marseille — Marseille, France", type: "ROTARY" as const },
];

export const DEMO_SUBSCRIPTION = {
  plan: "TRIAL",
  planLabelFr: "Essai gratuit",
  planLabelEn: "Free trial",
  trialDaysLeft: 11,
  rotaractDiscountPercent: 15,
};

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
  { name: "Rotary Club de Paris", members: 42, attendance: 82, minutes: 11, type: "ROTARY" as const },
  { name: "Rotary Club de Lyon", members: 38, attendance: 79, minutes: 9, type: "ROTARY" as const },
  { name: "Rotaract Paris Opéra", members: 28, attendance: 88, minutes: 7, type: "ROTARACT" as const },
  { name: "Rotary Club de Marseille", members: 35, attendance: 76, minutes: 8, type: "ROTARY" as const },
  { name: "Moyenne district", members: 36, attendance: 81, minutes: 9, isAvg: true },
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

export const DEMO_DOCUMENT_FOLDERS = [
  { id: "f1", name: "Gouvernance", documentCount: 2, parentId: null as string | null },
  { id: "f2", name: "PV archivés", documentCount: 3, parentId: null as string | null },
  { id: "f3", name: "Budget 2025-2026", documentCount: 1, parentId: "f1" },
];

export const DEMO_DOCUMENTS = [
  { id: "doc1", title: "Statuts du club", category: "STATUTES", updatedAt: "2024-09-01", fileSizeKb: 420, folderId: "f1", shared: false },
  { id: "doc2", title: "Budget 2025-2026", category: "BUDGET", updatedAt: "2025-07-15", fileSizeKb: 890, folderId: "f3", shared: false },
  { id: "doc3", title: "PV Réunion statutaire — 1er juillet 2026", category: "MINUTES", updatedAt: "2026-07-02", fileSizeKb: 310, folderId: "f2", shared: true },
  { id: "doc4", title: "Mandat président 2025-2026", category: "MANDATE", updatedAt: "2025-07-01", fileSizeKb: 156, folderId: "f1", shared: false },
  { id: "doc5", title: "Rapport trésorerie Q2", category: "TREASURY", updatedAt: "2026-07-05", fileSizeKb: 245, folderId: null, shared: false },
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

export function getDemoMeetings(locale: string) {
  const titles: Record<string, [string, string, string]> = {
    meet1: ["Réunion statutaire", "Statutory meeting", "Reunión estatutaria"],
    meet2: ["Commission International", "International Commission", "Comisión Internacional"],
    meet3: ["Réunion statutaire", "Statutory meeting", "Reunión estatutaria"],
  };
  return DEMO_MEETINGS.map((m) => {
    const [fr, en, es] = titles[m.id] ?? [m.title, m.title, m.title];
    return { ...m, title: L(locale, fr, en, es) };
  });
}

export function getDemoMinutes(locale: string) {
  const titles: Record<string, [string, string, string]> = {
    pv1: [
      "PV Réunion statutaire — 1er juillet 2026",
      "Statutory meeting minutes — July 1, 2026",
      "Acta reunión estatutaria — 1 de julio de 2026",
    ],
    pv2: [
      "PV Commission International — 24 juin 2026",
      "International Commission minutes — June 24, 2026",
      "Acta Comisión Internacional — 24 de junio de 2026",
    ],
    pv3: [
      "PV Réunion statutaire — 17 juin 2026",
      "Statutory meeting minutes — June 17, 2026",
      "Acta reunión estatutaria — 17 de junio de 2026",
    ],
  };
  return DEMO_MINUTES.map((m) => {
    const [fr, en, es] = titles[m.id] ?? [m.title, m.title, m.title];
    return { ...m, title: L(locale, fr, en, es) };
  });
}

export function getDemoLiveAgenda(locale: string) {
  const copy: Record<string, { title: [string, string, string]; note: [string, string, string] }> = {
    l1: {
      title: ["Ouverture & quorum", "Opening & quorum", "Apertura y quórum"],
      note: ["28 présents, 4 excusés", "28 present, 4 excused", "28 presentes, 4 excusados"],
    },
    l2: {
      title: ["Mot du président", "President's remarks", "Palabras del presidente"],
      note: ["Bilan actions humanitaires Q1", "Q1 humanitarian actions review", "Balance de acciones humanitarias T1"],
    },
    l3: {
      title: ["Décisions du conseil", "Board decisions", "Decisiones del consejo"],
      note: ["Budget 2026-2027 en discussion…", "2026-2027 budget under discussion…", "Presupuesto 2026-2027 en debate…"],
    },
    l4: {
      title: ["Communications", "Communications", "Comunicaciones"],
      note: ["", "", ""],
    },
    l5: {
      title: ["Clôture", "Closing", "Clausura"],
      note: ["", "", ""],
    },
  };
  return DEMO_LIVE_AGENDA.map((item) => {
    const c = copy[item.id];
    if (!c) return item;
    return {
      ...item,
      title: L(locale, c.title[0], c.title[1], c.title[2]),
      note: c.note[0] ? L(locale, c.note[0], c.note[1], c.note[2]) : "",
    };
  });
}

export function getDemoMembers(locale: string) {
  const positions: Record<string, [string, string, string]> = {
    m1: ["Président", "President", "Presidente"],
    m2: ["Secrétaire", "Secretary", "Secretario"],
    m3: ["Trésorier", "Treasurer", "Tesorero"],
    m4: ["Présidente Commission Intl.", "Intl. Commission Chair", "Presidenta Comisión Intl."],
    m5: ["Membre", "Member", "Miembro"],
    m6: ["Membre", "Member", "Miembro"],
  };
  return DEMO_MEMBERS.map((m) => {
    const [fr, en, es] = positions[m.id] ?? [m.position, m.position, m.position];
    return { ...m, position: L(locale, fr, en, es) };
  });
}

export function getDemoDues(locale: string) {
  return DEMO_DUES.map((d) => ({
    ...d,
    dueDateLabel:
      d.dueDate === "2026-03-31"
        ? L(locale, "31 mars 2026", "Mar 31, 2026", "31 mar 2026")
        : d.dueDate,
    periodLabel: d.periodLabel
      ? L(
          locale,
          d.periodLabel,
          d.periodLabel.replace("mars", "Mar").replace("avril", "Apr"),
          d.periodLabel.replace("mars", "mar").replace("avril", "abr")
        )
      : d.periodLabel,
    statusLabel:
      d.status === "PAID"
        ? L(locale, "Payée", "Paid", "Pagada")
        : d.status === "OVERDUE"
          ? L(locale, "En retard", "Overdue", "Vencida")
          : L(locale, "En attente", "Pending", "Pendiente"),
  }));
}

export function getDemoPendingJoinRequests(locale: string) {
  return DEMO_PENDING_JOIN_REQUESTS.map((r) => ({
    ...r,
    requestedLabel: L(locale, "Demandé récemment", "Requested recently", "Solicitado recientemente"),
  }));
}

export function getDemoData(locale: string) {
  const notificationCopy: Record<string, { title: [string, string, string]; message: [string, string, string]; time: [string, string, string] }> = {
    n0: {
      title: ["Demande d'adhésion", "Join request", "Solicitud de adhesión"],
      message: ["Thomas Girard souhaite rejoindre le club", "Thomas Girard wants to join the club", "Thomas Girard desea unirse al club"],
      time: ["Il y a 45 min", "45 min ago", "Hace 45 min"],
    },
    n1: {
      title: ["PV en attente de validation", "Minutes pending review", "Acta pendiente de revisión"],
      message: ["PV Commission International — 24 juin 2026", "International Commission minutes — Jun 24, 2026", "Acta Comisión Internacional — 24 jun 2026"],
      time: ["Il y a 2 h", "2 h ago", "Hace 2 h"],
    },
    n2: {
      title: ["Réunion demain", "Meeting tomorrow", "Reunión mañana"],
      message: ["Réunion statutaire — Hôtel Lutetia, 12h30", "Statutory meeting — Hôtel Lutetia, 12:30 PM", "Reunión estatutaria — Hôtel Lutetia, 12:30"],
      time: ["Il y a 1 j", "1 d ago", "Hace 1 d"],
    },
    n3: {
      title: ["Action assignée", "Action assigned", "Tarea asignada"],
      message: ["Publier le calendrier des événements — Sophie Leroy", "Publish event calendar — Sophie Leroy", "Publicar calendario de eventos — Sophie Leroy"],
      time: ["Il y a 3 j", "3 d ago", "Hace 3 d"],
    },
  };
  const actionCopy: Record<string, { title: [string, string, string]; due: [string, string, string] }> = {
    a1: {
      title: ["Publier le calendrier 2026-2027", "Publish 2026-2027 calendar", "Publicar calendario 2026-2027"],
      due: ["15 mars 2026", "Mar 15, 2026", "15 mar 2026"],
    },
    a2: {
      title: ["Coordonner campagne vaccination OMS", "Coordinate WHO vaccination campaign", "Coordinar campaña de vacunación OMS"],
      due: ["30 mars 2026", "Mar 30, 2026", "30 mar 2026"],
    },
    a3: {
      title: ["Valider budget commission", "Validate commission budget", "Validar presupuesto de comisión"],
      due: ["1 avril 2026", "Apr 1, 2026", "1 abr 2026"],
    },
  };
  const monthCopy: Record<string, [string, string, string]> = {
    Sep: ["Sep", "Sep", "Sep"],
    Oct: ["Oct", "Oct", "Oct"],
    Nov: ["Nov", "Nov", "Nov"],
    Déc: ["Déc", "Dec", "Dic"],
    Jan: ["Jan", "Jan", "Ene"],
    Fév: ["Fév", "Feb", "Feb"],
  };
  return {
    pendingJoinRequests: getDemoPendingJoinRequests(locale),
    notifications: DEMO_NOTIFICATIONS.map((n) => {
      const c = notificationCopy[n.id];
      if (!c) return n;
      return {
        ...n,
        title: L(locale, c.title[0], c.title[1], c.title[2]),
        message: L(locale, c.message[0], c.message[1], c.message[2]),
        time: L(locale, c.time[0], c.time[1], c.time[2]),
      };
    }),
    openActions: DEMO_OPEN_ACTIONS.map((a) => {
      const c = actionCopy[a.id];
      if (!c) return a;
      return {
        ...a,
        title: L(locale, c.title[0], c.title[1], c.title[2]),
        due: L(locale, c.due[0], c.due[1], c.due[2]),
      };
    }),
    months: DEMO_ATTENDANCE_MONTHS.map((m) => {
      const [fr, en, es] = monthCopy[m.month] ?? [m.month, m.month, m.month];
      return { ...m, month: L(locale, fr, en, es) };
    }),
  };
}

export function getDemoActions(locale: string) {
  const copy: Record<string, [string, string, string]> = {
    a1: ["Publier le calendrier 2026-2027", "Publish 2026-2027 calendar", "Publicar calendario 2026-2027"],
    a2: ["Coordonner campagne vaccination OMS", "Coordinate WHO vaccination campaign", "Coordinar campaña de vacunación OMS"],
    a3: ["Valider budget commission", "Validate commission budget", "Validar presupuesto de comisión"],
    a4: ["Envoyer rapport district Q2", "Send district Q2 report", "Enviar informe distrito T2"],
  };
  return DEMO_ACTIONS.map((a) => {
    const [fr, en, es] = copy[a.id] ?? [a.title, a.title, a.title];
    return { ...a, title: L(locale, fr, en, es) };
  });
}

export function getDemoCalendarEvents(locale: string) {
  const copy: Record<string, [string, string, string]> = {
    ce1: ["Réunion statutaire", "Statutory meeting", "Reunión estatutaria"],
    ce2: ["Échéance cotisation — Luc Moreau", "Dues due — Luc Moreau", "Vencimiento cuota — Luc Moreau"],
    ce3: ["Gala humanitaire", "Humanitarian gala", "Gala humanitario"],
    ce4: ["Publier calendrier 2026-2027", "Publish 2026-2027 calendar", "Publicar calendario 2026-2027"],
    ce5: ["Anniversaire — Sophie Leroy", "Birthday — Sophie Leroy", "Cumpleaños — Sophie Leroy"],
  };
  return DEMO_CALENDAR_EVENTS.map((e) => {
    const [fr, en, es] = copy[e.id] ?? [e.title, e.title, e.title];
    return { ...e, title: L(locale, fr, en, es) };
  });
}

export function getDemoClubEvents(locale: string) {
  const copy: Record<string, [string, string, string]> = {
    ev1: ["Gala humanitaire 2026", "Humanitarian gala 2026", "Gala humanitario 2026"],
    ev2: ["Conférence Paix & éducation", "Peace & education conference", "Conferencia Paz y educación"],
  };
  return DEMO_CLUB_EVENTS.map((e) => {
    const [fr, en, es] = copy[e.id] ?? [e.title, e.title, e.title];
    return { ...e, title: L(locale, fr, en, es) };
  });
}

export function getDemoEmailTemplates(locale: string) {
  const copy: Record<string, { name: [string, string, string]; subject: [string, string, string] }> = {
    t1: {
      name: ["Convocation réunion", "Meeting invitation", "Convocatoria reunión"],
      subject: ["Convocation — {{meetingDate}}", "Invitation — {{meetingDate}}", "Convocatoria — {{meetingDate}}"],
    },
    t2: {
      name: ["Rappel assiduité", "Attendance reminder", "Recordatorio asistencia"],
      subject: ["Votre participation — {{clubName}}", "Your attendance — {{clubName}}", "Su participación — {{clubName}}"],
    },
    t3: {
      name: ["PV finalisé", "Minutes finalized", "Acta finalizada"],
      subject: ["Procès-verbal disponible — {{minuteTitle}}", "Minutes available — {{minuteTitle}}", "Acta disponible — {{minuteTitle}}"],
    },
  };
  return DEMO_EMAIL_TEMPLATES.map((t) => {
    const c = copy[t.id];
    if (!c) return t;
    return {
      ...t,
      name: L(locale, c.name[0], c.name[1], c.name[2]),
      subject: L(locale, c.subject[0], c.subject[1], c.subject[2]),
    };
  });
}

export function getDemoEmailCampaigns(locale: string) {
  const copy: Record<string, { name: [string, string, string]; sentAt: [string, string, string] }> = {
    c1: {
      name: ["Convocation mars 2026", "March 2026 invitation", "Convocatoria marzo 2026"],
      sentAt: ["28 fév. 2026", "Feb 28, 2026", "28 feb 2026"],
    },
    c2: {
      name: ["Newsletter district 1660", "District 1660 newsletter", "Boletín distrito 1660"],
      sentAt: ["8 mars 2026", "Mar 8, 2026", "8 mar 2026"],
    },
  };
  return DEMO_EMAIL_CAMPAIGNS.map((c) => {
    const t = copy[c.id];
    if (!t) return c;
    return {
      ...c,
      name: L(locale, t.name[0], t.name[1], t.name[2]),
      sentAt: L(locale, t.sentAt[0], t.sentAt[1], t.sentAt[2]),
    };
  });
}

export function getDemoDistrictClubs(locale: string) {
  return DEMO_DISTRICT_CLUBS.map((c) => ({
    ...c,
    name: c.isAvg
      ? L(locale, "Moyenne district", "District average", "Media del distrito")
      : c.name,
  }));
}

export function getDemoMandates(locale: string) {
  const roles: Record<string, [string, string, string]> = {
    "Président": ["Président", "President", "Presidente"],
    "Secrétaire": ["Secrétaire", "Secretary", "Secretario"],
    "Trésorier": ["Trésorier", "Treasurer", "Tesorero"],
  };
  return DEMO_MANDATES.map((m) => {
    const [fr, en, es] = roles[m.role] ?? [m.role, m.role, m.role];
    return { ...m, role: L(locale, fr, en, es) };
  });
}

export function getDemoTreasuryEntries(locale: string) {
  const copy: Record<string, { label: [string, string, string]; category: [string, string, string] }> = {
    b1: {
      label: ["Cotisations Q1", "Q1 dues", "Cuotas T1"],
      category: ["Cotisations", "Dues", "Cuotas"],
    },
    b2: {
      label: ["Gala humanitaire", "Humanitarian gala", "Gala humanitario"],
      category: ["Événements", "Events", "Eventos"],
    },
    b3: {
      label: ["Location salle mars", "March venue rental", "Alquiler sala marzo"],
      category: ["Réunions", "Meetings", "Reuniones"],
    },
    b4: {
      label: ["Projet Madagascar", "Madagascar project", "Proyecto Madagascar"],
      category: ["Actions", "Projects", "Proyectos"],
    },
  };
  return DEMO_TREASURY.entries.map((e) => {
    const c = copy[e.id];
    if (!c) return e;
    return {
      ...e,
      label: L(locale, c.label[0], c.label[1], c.label[2]),
      category: L(locale, c.category[0], c.category[1], c.category[2]),
    };
  });
}

export function getDemoDocumentFolders(locale: string) {
  const copy: Record<string, [string, string, string]> = {
    f1: ["Gouvernance", "Governance", "Gobernanza"],
    f2: ["PV archivés", "Archived minutes", "Actas archivadas"],
    f3: ["Budget 2025-2026", "Budget 2025-2026", "Presupuesto 2025-2026"],
  };
  return DEMO_DOCUMENT_FOLDERS.map((f) => {
    const [fr, en, es] = copy[f.id] ?? [f.name, f.name, f.name];
    return { ...f, name: L(locale, fr, en, es) };
  });
}

export function getDemoDocuments(locale: string) {
  const copy: Record<string, [string, string, string]> = {
    doc1: ["Statuts du club", "Club bylaws", "Estatutos del club"],
    doc2: ["Budget 2025-2026", "Budget 2025-2026", "Presupuesto 2025-2026"],
    doc3: ["PV Réunion statutaire — 1er juillet 2026", "Statutory meeting minutes — July 1, 2026", "Acta reunión estatutaria — 1 de julio de 2026"],
    doc4: ["Mandat président 2025-2026", "President mandate 2025-2026", "Mandato presidente 2025-2026"],
    doc5: ["Rapport trésorerie Q2", "Treasury report Q2", "Informe tesorería T2"],
  };
  return DEMO_DOCUMENTS.map((d) => {
    const [fr, en, es] = copy[d.id] ?? [d.title, d.title, d.title];
    return { ...d, title: L(locale, fr, en, es) };
  });
}

export function getDemoSubscriptionPlanLabel(locale: string) {
  return L(locale, DEMO_SUBSCRIPTION.planLabelFr, DEMO_SUBSCRIPTION.planLabelEn, "Prueba gratuita");
}