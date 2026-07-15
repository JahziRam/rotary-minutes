/** Client-safe role labels (no Prisma). */

import type { ClubRoleType } from "@/lib/rotary";

export const ROLE_LABELS: Record<
  ClubRoleType,
  { fr: string; en: string; es: string; desc: string; descEs: string }
> = {
  PRESIDENT: {
    fr: "Président",
    en: "President",
    es: "Presidente",
    desc: "Accès complet au club",
    descEs: "Acceso completo al club",
  },
  VICE_PRESIDENT: {
    fr: "Vice-président",
    en: "Vice President",
    es: "Vicepresidente",
    desc: "Suppléance et pilotage du club",
    descEs: "Suplencia y dirección del club",
  },
  SECRETARY: {
    fr: "Secrétaire",
    en: "Secretary",
    es: "Secretario",
    desc: "Gestion des PV et réunions",
    descEs: "Gestión de actas y reuniones",
  },
  PROTOCOL: {
    fr: "Protocol",
    en: "Protocol",
    es: "Protocolo",
    desc: "Rédaction des PV",
    descEs: "Redacción de actas",
  },
  TREASURER: {
    fr: "Trésorier",
    en: "Treasurer",
    es: "Tesorero",
    desc: "Gestion des cotisations",
    descEs: "Gestión de cuotas",
  },
  FOUNDATION_CHAIR: {
    fr: "Président Fondation",
    en: "Foundation Chair",
    es: "Presidente de Fundación",
    desc: "Consultation",
    descEs: "Consulta",
  },
  MEMBERSHIP_CHAIR: {
    fr: "Président Adhésion",
    en: "Membership Chair",
    es: "Presidente de Admisiones",
    desc: "Gestion des membres",
    descEs: "Gestión de miembros",
  },
  COMMISSION_CHAIR: {
    fr: "Président de commission",
    en: "Commission Chair",
    es: "Presidente de comisión",
    desc: "Pilotage d'une commission du club",
    descEs: "Dirección de una comisión del club",
  },
  PUBLIC_IMAGE_CHAIR: {
    fr: "Président Image",
    en: "Public Image Chair",
    es: "Presidente de Imagen Pública",
    desc: "Emails et communication",
    descEs: "Correos y comunicación",
  },
  ADMIN: {
    fr: "Administrateur club",
    en: "Club Admin",
    es: "Administrador del club",
    desc: "Administration du club",
    descEs: "Administración del club",
  },
  READER: {
    fr: "Membre / Lecteur",
    en: "Member / Reader",
    es: "Miembro / Lector",
    desc: "Accès membre par défaut — consultation",
    descEs: "Acceso de miembro por defecto — consulta",
  },
};