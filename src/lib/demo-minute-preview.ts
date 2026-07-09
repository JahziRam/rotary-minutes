import type { MinutePreviewData } from "@/components/minutes/minute-preview";
import { pickDemoLocale } from "@/lib/demo-i18n";

export function getDemoMinutePreview(locale: string): MinutePreviewData {
  const L = (fr: string, en: string, es: string) => pickDemoLocale(locale, { fr, en, es });

  return {
    id: "demo-minute-1",
    title: L(
      "PV Réunion statutaire — Mars 2026",
      "Statutory meeting minutes — March 2026",
      "Acta de reunión estatutaria — marzo 2026"
    ),
    status: "REVIEW",
    club: {
      name: L("Rotary Club de Paris", "Rotary Club of Paris", "Rotary Club de París"),
      address: "45 Bd Raspail, 75006 Paris",
      district: "1660",
      country: L("France", "France", "Francia"),
    },
    meeting: {
      date: new Date("2026-03-04"),
      location: "Hôtel Lutetia",
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
        title: L("Ouverture & quorum", "Opening & quorum", "Apertura y quórum"),
        decisions: L(
          "Quorum atteint avec 28 membres présents.",
          "Quorum reached with 28 members present.",
          "Quórum alcanzado con 28 miembros presentes."
        ),
        status: "COMPLETED",
      },
      {
        id: "a2",
        title: L("Décisions du conseil", "Board decisions", "Decisiones de la junta"),
        decisions: L(
          "Approbation du budget 2026-2027 et du calendrier des événements.",
          "Approval of the 2026-2027 budget and event calendar.",
          "Aprobación del presupuesto 2026-2027 y del calendario de eventos."
        ),
        actions: L(
          "Publier le calendrier sur le site du club",
          "Publish calendar on club website",
          "Publicar el calendario en el sitio del club"
        ),
        responsible: "Sophie Leroy",
        dueDate: new Date("2026-03-15"),
        status: "IN_PROGRESS",
      },
      {
        id: "a3",
        title: L("Actions communautaires", "Community actions", "Acciones comunitarias"),
        decisions: L(
          "Lancement de la campagne de vaccination en partenariat avec l'OMS.",
          "Launch vaccination campaign in partnership with WHO.",
          "Lanzamiento de campaña de vacunación en colaboración con la OMS."
        ),
        actions: L(
          "Coordonner avec le district",
          "Coordinate with district",
          "Coordinar con el distrito"
        ),
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