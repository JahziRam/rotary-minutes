import { DEFAULT_APP_NAME } from "@/lib/app-branding-shared";

/** Known nested relation keys to process separately (not as scalar columns). */
const RELATION_KEYS = new Set([
  "members",
  "meetings",
  "minutes",
  "memberDues",
  "duesPayments",
  "budgetCategories",
  "budgetEntries",
  "clubEvents",
  "clubDocuments",
  "documentFolders",
  "clubActions",
  "attendances",
  "versions",
  "registrations",
  "priceTiers",
  "ticketSlots",
  "subscription",
  "features",
  "clubBackups",
  "governanceRecords",
  "calendarNotes",
  "treasurySubAccounts",
  "emailSettings",
  "memberships",
  "customRole",
  "club",
  "user",
  "createdBy",
  "uploadedBy",
  "minute",
  "folder",
  "flag",
  "overrides",
  "_count",
]);

/** Maps JSON relation keys to Prisma table names. */
const TABLE_NAMES: Record<string, string> = {
  members: "Member",
  meetings: "Meeting",
  minutes: "Minute",
  memberDues: "MemberDue",
  duesPayments: "DuesPayment",
  budgetCategories: "BudgetCategory",
  budgetEntries: "BudgetEntry",
  clubEvents: "ClubEvent",
  clubDocuments: "ClubDocument",
  documentFolders: "DocumentFolder",
  clubActions: "ClubAction",
  attendances: "Attendance",
  versions: "MinuteVersion",
  registrations: "EventRegistration",
  priceTiers: "EventPriceTier",
  ticketSlots: "EventTicketSlot",
  clubs: "Club",
  users: "User",
  planConfigs: "PlanConfig",
  addonConfigs: "AddonConfig",
  appSettings: "AppSettings",
};

function escapeSqlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return value.every((v) => typeof v === "string")
        ? "ARRAY[]::text[]"
        : "'[]'::jsonb";
    }
    if (value.every((v) => typeof v === "string")) {
      const items = value.map((v) => `'${escapeSqlString(v)}'`).join(", ");
      return `ARRAY[${items}]::text[]`;
    }
    return `'${escapeSqlString(JSON.stringify(value))}'::jsonb`;
  }
  if (typeof value === "object") {
    return `'${escapeSqlString(JSON.stringify(value))}'::jsonb`;
  }
  return `'${escapeSqlString(String(value))}'`;
}

function rowToInsert(table: string, row: Record<string, unknown>): string | null {
  const scalar: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (RELATION_KEYS.has(key)) continue;
    if (Array.isArray(value) && TABLE_NAMES[key]) continue;
    scalar[key] = value;
  }

  const keys = Object.keys(scalar);
  if (keys.length === 0) return null;

  const columns = keys.map((k) => `"${k}"`).join(", ");
  const values = keys.map((k) => formatSqlValue(scalar[k])).join(", ");
  return `INSERT INTO "${table}" (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;`;
}

function processObject(
  table: string,
  obj: Record<string, unknown>,
  statements: string[]
): void {
  const insert = rowToInsert(table, obj);
  if (insert) statements.push(insert);

  for (const [key, value] of Object.entries(obj)) {
    const nestedTable = TABLE_NAMES[key];
    if (nestedTable && value != null) {
      processEntity(nestedTable, value, statements);
    }
  }
}

function processEntity(table: string, data: unknown, statements: string[]): void {
  if (data == null) return;
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        processObject(table, item as Record<string, unknown>, statements);
      }
    }
    return;
  }
  if (typeof data === "object") {
    processObject(table, data as Record<string, unknown>, statements);
  }
}

/**
 * Converts a JSON backup payload into PostgreSQL INSERT statements.
 */
export function jsonToSqlDump(data: unknown): string {
  const statements: string[] = [
    `-- ${DEFAULT_APP_NAME} SQL backup`,
    `-- Generated: ${new Date().toISOString()}`,
    "BEGIN;",
  ];

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    if ("exportedAt" in obj) {
      processEntity("Club", obj.clubs, statements);
      processEntity("User", obj.users, statements);
      processEntity("PlanConfig", obj.planConfigs, statements);
      processEntity("AddonConfig", obj.addonConfigs, statements);
      if (obj.appSettings && typeof obj.appSettings === "object") {
        processObject("AppSettings", obj.appSettings as Record<string, unknown>, statements);
      }
    } else if ("slug" in obj && "name" in obj) {
      processObject("Club", obj, statements);
    } else {
      processObject("BackupData", obj, statements);
    }
  }

  statements.push("COMMIT;");
  return statements.join("\n");
}