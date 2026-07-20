/**
 * Génère un PV PDF d'exemple (charte Rotary) sur le bureau.
 * Usage : npx tsx scripts/generate-sample-minute-pdf.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildMinutePdfBuffer } from "../src/lib/pdf/build-minute-pdf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.join(process.env.USERPROFILE || "", "Desktop");
const outPath = path.join(
  desktop,
  "Exemple-PV-Logo-Complet-Rotary-Minutes.pdf"
);

const sampleMinute = {
  id: "sample-minute-marseille-logo",
  title: "Procès-verbal — Réunion hebdomadaire",
  contentHash: null as string | null,
  club: {
    id: "sample-club-marseille",
    name: "Rotary Club de Marseille Provence",
    address: "58 cours Pierre Puget, 13006 Marseille",
    meetingLocation: "Hôtel NH Collection Marseille",
    logoUrl: null as string | null,
    language: "FR",
  },
  agendaItems: [
    {
      title: "Ouverture et tour de table",
      description:
        "La séance est ouverte à 12 h 45. Le président souhaite la bienvenue à 19 membres et 4 invités.",
      decisions: "",
      actions: "",
    },
    {
      title: "Conférence — Économie circulaire en Méditerranée",
      description:
        "Mme Laura Benetti, consultante en développement durable, présente les initiatives des clubs Rotary du littoral.",
      decisions: "Remerciements officiels à la conférencière.",
      actions: "",
    },
    {
      title: "Projet « Parc marin » — Calanques",
      description:
        "La commission environnement propose un partenariat avec une association locale pour la sensibilisation scolaire.",
      decisions: "Budget de 1 200 € alloué pour la rentrée 2026.",
      actions: "Marc Delorme contacte les écoles partenaires avant le 1er septembre.",
    },
    {
      title: "Visite du gouverneur — préparation",
      description:
        "Organisation de la réception prévue le 12 octobre 2026 : programme, salle et liste des intervenants.",
      decisions: "Comité d'organisation de cinq membres constitué.",
      actions: "Valérie Costa réserve la salle et envoie les invitations avant le 20 août.",
    },
    {
      title: "Clôture",
      description: "Le président remercie l'assemblée et lève la séance à 14 h 15.",
      decisions: "",
      actions: "",
    },
  ],
  meeting: {
    date: new Date("2026-07-15T12:45:00"),
    location: "Hôtel NH Collection — Salon Vieux-Port",
    type: "WEEKLY",
    presidedBy: "Antoine Morel",
    secretary: "Valérie Costa",
    attendances: [
      { category: "PRESENT", memberId: "m1", member: { firstName: "Antoine", lastName: "Morel" } },
      { category: "PRESENT", memberId: "m2", member: { firstName: "Valérie", lastName: "Costa" } },
      { category: "PRESENT", memberId: "m3", member: { firstName: "Marc", lastName: "Delorme" } },
      { category: "PRESENT", memberId: "m4", member: { firstName: "Nadia", lastName: "Fournier" } },
      { category: "PRESENT", memberId: "m5", member: { firstName: "Hugo", lastName: "Bernard" } },
      { category: "EXCUSED_ABSENT", memberId: "m6", member: { firstName: "Claire", lastName: "Renaud" } },
      { category: "UNEXCUSED_ABSENT", memberId: "m7", member: { firstName: "David", lastName: "Garcia" } },
      { category: "TRAVEL_RETURN", memberId: "m8", member: { firstName: "Élodie", lastName: "Martin" } },
      {
        category: "PRESENT",
        memberId: "m9",
        member: { firstName: "Georges", lastName: "Honneur", isHonoraryMember: true },
      },
      { category: "ROTARY_GUEST", guestName: "Président RC Aix-en-Provence" },
      { category: "SPEAKER", guestName: "Laura Benetti" },
      { category: "VISITOR", guestName: "Pierre Lambert" },
    ],
  },
};

async function main() {
  const { buffer } = await buildMinutePdfBuffer(sampleMinute, "fr");
  fs.writeFileSync(outPath, buffer);
  console.log(`PDF créé : ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});