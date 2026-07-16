import "dotenv/config";
import { polishAgendaItemNotes } from "../src/lib/minute-ai.ts";

const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_MINUTE_AI_MODEL?.trim() || "gpt-4o-mini";

if (!apiKey) {
  console.error("OPENAI_API_KEY manquante");
  process.exit(1);
}

try {
  const polished = await polishAgendaItemNotes(
    {
      locale: "fr",
      meetingType: "REGULAR",
      agendaTitle: "Approbation du budget 2026",
      rawNotes:
        "vote budget ok a l'unanimite, marie envoie doc au district avant mars, action suivi tresorerie",
    },
    model,
    apiKey,
    "openai"
  );

  console.log("minute-ai.ts OK");
  console.log(JSON.stringify(polished, null, 2));
} catch (error) {
  console.error("minute-ai.ts ECHEC");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}