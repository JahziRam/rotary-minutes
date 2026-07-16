import "dotenv/config";

const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
const baseUrl =
  process.env.QWEN_API_BASE_URL?.trim() ||
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const preferredModel = process.env.QWEN_MINUTE_AI_MODEL?.trim() || "qwen-plus";

if (!apiKey) {
  console.error("DASHSCOPE_API_KEY manquante dans .env");
  process.exit(1);
}

const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

const systemPrompt = [
  "Tu es l'assistant de rédaction de procès-verbaux Rotary.",
  "Réécris les notes brutes en style formel de PV de club, en français.",
  "Ne invente aucun fait absent des notes.",
  "Réponds UNIQUEMENT en JSON valide avec les clés :",
  'description, decisions, actions, responsible, dueDate (YYYY-MM-DD ou null).',
].join(" ");

const userPrompt = JSON.stringify({
  meetingType: "REGULAR",
  agendaTitle: "Approbation du budget 2026",
  rawNotes:
    "vote budget ok a l'unanimite, marie envoie doc au district avant mars, action suivi tresorerie",
});

const modelsToTry = [
  preferredModel,
  "qwen-plus",
  "qwen-turbo",
  "qwen-max",
  "qwen-flash",
].filter((model, index, all) => all.indexOf(model) === index);

function parsePolishedResponse(text) {
  const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

async function request(model, withJsonFormat) {
  const body = {
    model,
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (withJsonFormat) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  return { response, raw };
}

console.log("Endpoint:", endpoint);
console.log("Modeles:", modelsToTry.join(", "));
console.log("---");

let lastError = null;

for (const model of modelsToTry) {
  for (const withJsonFormat of [true, false]) {
    const label = `${model}${withJsonFormat ? " + json" : ""}`;
    process.stdout.write(`Test ${label}... `);

    try {
      const { response, raw } = await request(model, withJsonFormat);
      if (!response.ok) {
        lastError = `${response.status} ${raw.slice(0, 300)}`;
        console.log("ECHEC");
        console.log(`  HTTP ${response.status}: ${raw.slice(0, 300)}`);
        continue;
      }

      const payload = JSON.parse(raw);
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        lastError = "EMPTY_RESPONSE";
        console.log("ECHEC (reponse vide)");
        continue;
      }

      const parsed = parsePolishedResponse(content);
      if (!parsed?.description) {
        lastError = `INVALID_RESPONSE: ${content.slice(0, 200)}`;
        console.log("ECHEC (JSON invalide)");
        console.log(`  ${content.slice(0, 200)}`);
        continue;
      }

      console.log("OK");
      console.log(JSON.stringify(parsed, null, 2));
      process.exit(0);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.log("ECHEC");
      console.log(`  ${lastError}`);
    }
  }
}

console.error("Aucun modele n'a fonctionne.");
if (lastError) console.error("Derniere erreur:", lastError);
process.exit(1);