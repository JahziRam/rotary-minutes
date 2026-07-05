/** Demo data used when database is unavailable (development without Postgres) */

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
};

export const DEMO_MEMBERS = [
  { id: "m1", firstName: "Jean", lastName: "Dupont", position: "Président" },
  { id: "m2", firstName: "Marie", lastName: "Martin", position: "Secrétaire" },
  { id: "m3", firstName: "Pierre", lastName: "Bernard", position: "Trésorier" },
  { id: "m4", firstName: "Sophie", lastName: "Leroy", position: "Membre" },
  { id: "m5", firstName: "Luc", lastName: "Moreau", position: "Membre" },
];

export const DEMO_MEETINGS = [
  {
    id: "meet1",
    date: new Date("2026-07-01"),
    location: "Hôtel Lutetia",
    type: "STATUTORY",
    presidedBy: "Jean Dupont",
    secretary: "Marie Martin",
    attendanceRate: 85,
  },
  {
    id: "meet2",
    date: new Date("2026-06-24"),
    location: "Hôtel Lutetia",
    type: "COMMISSION",
    presidedBy: "Jean Dupont",
    secretary: "Marie Martin",
    attendanceRate: 78,
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
    status: "DRAFT",
    date: new Date("2026-06-24"),
    author: "Marie Martin",
  },
];

export const DEMO_STATS = {
  meetingsCount: 12,
  annualAttendance: 82,
  openActions: 5,
  scheduledEmails: 2,
  notificationCount: 3,
};