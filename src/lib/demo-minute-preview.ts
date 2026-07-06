import type { MinutePreviewData } from "@/components/minutes/minute-preview";

export function getDemoMinutePreview(locale: string): MinutePreviewData {
  const isFr = locale === "fr";
  return {
    id: "demo-minute-1",
    title: isFr
      ? "PV Réunion statutaire — Mars 2026"
      : "Statutory meeting minutes — March 2026",
    status: "REVIEW",
    club: {
      name: isFr ? "Rotary Club de Paris" : "Rotary Club of Paris",
      address: isFr ? "45 Bd Raspail, 75006 Paris" : "45 Bd Raspail, 75006 Paris",
      district: "1660",
      country: isFr ? "France" : "France",
    },
    meeting: {
      date: new Date("2026-03-04"),
      location: isFr ? "Hôtel Lutetia" : "Hôtel Lutetia",
      startTime: "12:30",
      endTime: "14:00",
      type: "STATUTORY",
      presidedBy: "Jean Dupont",
      secretary: "Marie Martin",
      attendances: [
        ...Array.from({ length: 28 }, () => ({ category: "PRESENT" })),
        ...Array.from({ length: 4 }, () => ({ category: "EXCUSED_ABSENT" })),
        ...Array.from({ length: 2 }, () => ({ category: "UNEXCUSED_ABSENT" })),
      ],
    },
    agendaItems: [
      {
        id: "a1",
        title: isFr ? "Ouverture & quorum" : "Opening & quorum",
        decisions: isFr
          ? "Quorum atteint avec 28 membres présents."
          : "Quorum reached with 28 members present.",
        status: "COMPLETED",
      },
      {
        id: "a2",
        title: isFr ? "Décisions du conseil" : "Board decisions",
        decisions: isFr
          ? "Approbation du budget 2026-2027 et du calendrier des événements."
          : "Approval of the 2026-2027 budget and event calendar.",
        actions: isFr ? "Publier le calendrier sur le site du club" : "Publish calendar on club website",
        responsible: "Sophie Leroy",
        dueDate: new Date("2026-03-15"),
        status: "IN_PROGRESS",
      },
      {
        id: "a3",
        title: isFr ? "Actions communautaires" : "Community actions",
        decisions: isFr
          ? "Lancement de la campagne de vaccination en partenariat avec l'OMS."
          : "Launch vaccination campaign in partnership with WHO.",
        actions: isFr ? "Coordonner avec le district" : "Coordinate with district",
        responsible: "Pierre Bernard",
        status: "OPEN",
      },
    ],
    versions: [
      {
        version: 2,
        createdAt: new Date("2026-03-05"),
        author: { firstName: "Marie", lastName: "Martin" },
      },
      {
        version: 1,
        createdAt: new Date("2026-03-04"),
        author: { firstName: "Marie", lastName: "Martin" },
      },
    ],
  };
}