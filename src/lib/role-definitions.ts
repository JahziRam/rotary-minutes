/** Client-safe role labels (no Prisma). */

import type { ClubRoleType } from "@/lib/rotary";

export const ROLE_LABELS: Record<ClubRoleType, { fr: string; en: string; desc: string }> = {
  PRESIDENT: { fr: "Président", en: "President", desc: "Accès complet au club" },
  SECRETARY: { fr: "Secrétaire", en: "Secretary", desc: "Gestion des PV et réunions" },
  PROTOCOL: { fr: "Protocol", en: "Protocol", desc: "Rédaction des PV" },
  TREASURER: { fr: "Trésorier", en: "Treasurer", desc: "Gestion des cotisations" },
  FOUNDATION_CHAIR: { fr: "Président Fondation", en: "Foundation Chair", desc: "Consultation" },
  MEMBERSHIP_CHAIR: { fr: "Président Adhésion", en: "Membership Chair", desc: "Gestion des membres" },
  PUBLIC_IMAGE_CHAIR: { fr: "Président Image", en: "Public Image Chair", desc: "Emails et communication" },
  ADMIN: { fr: "Administrateur club", en: "Club Admin", desc: "Administration du club" },
  READER: { fr: "Lecteur", en: "Reader", desc: "Consultation seule" },
};