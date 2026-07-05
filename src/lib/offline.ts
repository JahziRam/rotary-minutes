import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "rotary-minutes-offline";
const DB_VERSION = 1;

interface OfflineDB {
  drafts: {
    key: string;
    value: {
      id: string;
      clubId: string;
      data: unknown;
      updatedAt: string;
      synced: boolean;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("drafts", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export async function saveDraftOffline(
  id: string,
  clubId: string,
  data: unknown
) {
  const db = await getDB();
  await db.put("drafts", {
    id,
    clubId,
    data,
    updatedAt: new Date().toISOString(),
    synced: false,
  });
}

export async function getUnsyncedDrafts() {
  const db = await getDB();
  const all = await db.getAll("drafts");
  return all.filter((d) => !d.synced);
}

export async function markDraftSynced(id: string) {
  const db = await getDB();
  const draft = await db.get("drafts", id);
  if (draft) {
    await db.put("drafts", { ...draft, synced: true });
  }
}

export function setupOfflineSync(onOnline: () => void) {
  if (typeof window === "undefined") return;
  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
}