export type HelpArticleId =
  | "getting-started"
  | "minutes"
  | "meetings"
  | "dues"
  | "emails"
  | "district"
  | "subscription";

export const HELP_ARTICLES: { id: HelpArticleId; icon: string }[] = [
  { id: "getting-started", icon: "rocket" },
  { id: "minutes", icon: "file-text" },
  { id: "meetings", icon: "calendar" },
  { id: "dues", icon: "wallet" },
  { id: "emails", icon: "mail" },
  { id: "district", icon: "map" },
  { id: "subscription", icon: "credit-card" },
];