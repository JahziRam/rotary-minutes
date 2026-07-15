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
      { category: "PRESENT", member: { firstName: "Antoine", lastName: "Morel" } },
      { category: "PRESENT", member: { firstName: "Valérie", lastName: "Costa" } },
      { category: "PRESENT", member: { firstName: "Marc", lastName: "Delorme" } },
      { category: "PRESENT", member: { firstName: "Nadia", lastName: "Fournier" } },
      { category: "PRESENT", member: { firstName: "Hugo", lastName: "Bernard" } },
      { category: "EXCUSED_ABSENT", member: { firstName: "Claire", lastName: "Renaud" } },
      { category: "UNEXCUSED_ABSENT", member: { firstName: "David", lastName: "Garcia" } },
      { category: "TRAVEL_RETURN", member: { firstName: "Élodie", lastName: "Martin" } },
      {
        category: "PRESENT",
        member: { firstName: "Georges", lastName: "Honneur", isHonoraryMember: true },
      },
      { category: "ROTARY_GUEST", guestName: "Président — Rotary Club d'Aix-en-Provence" },
      { category: "SPEAKER", guestName: "Mme Laura Benetti — Économie circulaire" },
      { category: "GUEST", guestName: "M. Pierre Lambert — Invité professionnel" },
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