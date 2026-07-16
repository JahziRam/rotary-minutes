import {
  parseMinuteAiProvider,
  resolveChatCompletionsUrl,
  resolveModelForProvider,
  type MinuteAiProvider,
} from "@/lib/minute-ai-providers";

export type PolishedAgendaItem = {
  description: string;
  decisions: string;
  actions: string;
  responsible: string;
  dueDate: string | null;
};

export type PolishAgendaItemInput = {
  locale: string;
  meetingType: string;
  agendaTitle: string;
  rawNotes: string;
  existingDecisions?: string;
  existingActions?: string;
  existingResponsible?: string;
  existingDueDate?: string;
};

function localeLabel(locale: string): "fr" | "en" | "es" {
  if (locale === "es") return "es";
  if (locale === "en") return "en";
  return "fr";
}

function buildSystemPrompt(locale: string): string {
  const lang = localeLabel(locale);
  const language =
    lang === "fr" ? "français" : lang === "es" ? "español" : "English";

  return [
    `Tu es l'assistant de rédaction de procès-verbaux Rotary.`,
    `Réécris les notes brutes en style formel de PV de club, en ${language}.`,
    `Ne invente aucun fait absent des notes.`,
    `Réponds UNIQUEMENT en JSON valide avec les clés :`,
    `description (compte-rendu du point), decisions (décisions prises ou ""),`,
    `actions (actions à mener ou ""), responsible (nom ou ""), dueDate (YYYY-MM-DD ou null).`,
  ].join(" ");
}

function buildUserPrompt(input: PolishAgendaItemInput): string {
  return JSON.stringify({
    meetingType: input.meetingType,
    agendaTitle: input.agendaTitle,
    rawNotes: input.rawNotes,
    existingDecisions: input.existingDecisions ?? "",
    existingActions: input.existingActions ?? "",
    existingResponsible: input.existingResponsible ?? "",
    existingDueDate: input.existingDueDate ?? "",
  });
}

export function parsePolishedResponse(text: string): PolishedAgendaItem | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const dueDateRaw = parsed.dueDate;
    let dueDate: string | null = null;
    if (typeof dueDateRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDateRaw)) {
      dueDate = dueDateRaw;
    }

    return {
      description: String(parsed.description ?? "").trim(),
      decisions: String(parsed.decisions ?? "").trim(),
      actions: String(parsed.actions ?? "").trim(),
      responsible: String(parsed.responsible ?? "").trim(),
      dueDate,
    };
  } catch {
    return null;
  }
}

type ChatRequestBody = {
  model: string;
  temperature: number;
  messages: Array<{ role: string; content: string }>;
  response_format?: { type: "json_object" };
};

async function requestChatCompletion(
  provider: MinuteAiProvider,
  apiKey: string,
  body: ChatRequestBody
): Promise<Response> {
  const url = resolveChatCompletionsUrl(provider);
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (response.ok || !body.response_format) {
    return response;
  }

  const { response_format: _rf, ...fallbackBody } = body;
  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(fallbackBody),
  });
}

export async function polishAgendaItemNotes(
  input: PolishAgendaItemInput,
  model: string,
  apiKey: string,
  provider: MinuteAiProvider = "xai"
): Promise<PolishedAgendaItem> {
  const key = apiKey.trim();
  if (!key) {
    throw new Error("API_KEY_MISSING");
  }

  const notes = input.rawNotes.trim();
  if (!notes) {
    throw new Error("EMPTY_NOTES");
  }

  const resolvedProvider = parseMinuteAiProvider(provider);
  const resolvedModel = resolveModelForProvider(resolvedProvider, model);
  const messages = [
    { role: "system", content: buildSystemPrompt(input.locale) },
    { role: "user", content: buildUserPrompt(input) },
  ];

  const response = await requestChatCompletion(resolvedProvider, key, {
    model: resolvedModel,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API_ERROR:${response.status}:${body.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("EMPTY_RESPONSE");
  }

  const parsed = parsePolishedResponse(content);
  if (!parsed || !parsed.description) {
    throw new Error("INVALID_RESPONSE");
  }

  return parsed;
}