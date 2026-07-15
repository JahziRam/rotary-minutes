import fr from "../../messages/fr.json";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { resolveUiLocale } from "@/lib/locale-utils";
import type { Locale } from "@/i18n/config";

type MessageTree = Record<string, unknown>;

const BUNDLES: Record<Locale, MessageTree> = { fr, en, es };

function getNested(tree: MessageTree, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = tree;
  for (const part of parts) {
    if (!cur || typeof cur !== "object" || !(part in (cur as MessageTree))) {
      return undefined;
    }
    cur = (cur as MessageTree)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Server-side messages for actions (no request locale). */
export function formatServerMessage(
  locale: string,
  key: string,
  params?: Record<string, string | number>
): string {
  const loc = resolveUiLocale(locale);
  let text = getNested(BUNDLES[loc], key) ?? getNested(BUNDLES.fr, key) ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}