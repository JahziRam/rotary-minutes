export interface AgendaAssistItem {
  title: string;
  description?: string | null;
  decisions?: string | null;
  actions?: string | null;
  responsible?: string | null;
  dueDate?: Date | string | null;
}

export interface MinuteAssistHints {
  missingDecisions: string[];
  missingActions: string[];
  overdueActions: string[];
  suggestions: string[];
}

const ACTION_KEYWORDS = /\b(doit|devra|action|charge|responsable|organiser|préparer|contacter|envoyer|must|shall|will|action|responsible)\b/i;
const DECISION_KEYWORDS = /\b(décidé|approuvé|voté|unanimité|adopté|rejeté|decided|approved|voted|unanimous|adopted|rejected)\b/i;

const REQUIRED_BY_TYPE: Record<string, string[]> = {
  STATUTORY: ["Ouverture", "Opening", "Clôture", "Closing"],
  GENERAL_ASSEMBLY: ["Rapport", "report", "Vote", "Election"],
  GOVERNOR_VISIT: ["Gouverneur", "Governor"],
};

export function analyzeMinuteDraft(
  items: AgendaAssistItem[],
  meetingType: string
): MinuteAssistHints {
  const missingDecisions: string[] = [];
  const missingActions: string[] = [];
  const overdueActions: string[] = [];
  const suggestions: string[] = [];
  const now = new Date();

  for (const item of items) {
    const text = `${item.description ?? ""} ${item.decisions ?? ""} ${item.actions ?? ""}`;
    if (item.title.length > 3 && !item.decisions?.trim() && DECISION_KEYWORDS.test(text)) {
      missingDecisions.push(item.title);
    }
    if (item.actions?.trim() && !item.responsible?.trim()) {
      missingActions.push(item.title);
    }
    if (item.dueDate && item.actions?.trim()) {
      const due = new Date(item.dueDate);
      if (due < now) overdueActions.push(item.title);
    }
    if (ACTION_KEYWORDS.test(text) && !item.actions?.trim()) {
      suggestions.push(
        `Point « ${item.title} » : une action semble mentionnée — précisez-la dans le champ Actions.`
      );
    }
  }

  const titles = items.map((i) => i.title).join(" ");
  const required = REQUIRED_BY_TYPE[meetingType] ?? [];
  for (const keyword of required) {
    if (!titles.toLowerCase().includes(keyword.toLowerCase())) {
      suggestions.push(`Point recommandé manquant pour ce type de réunion : « ${keyword} ».`);
    }
  }

  return { missingDecisions, missingActions, overdueActions, suggestions };
}