export const OFFLINE_CHECKIN_STORAGE_KEY = "rotary-offline-checkins";

export type OfflineCheckInEntry = {
  token: string;
  meetingId: string;
  memberId?: string;
  guestName?: string;
  checkedInAt: string;
};

export type SyncCheckInResult = {
  synced: number;
  failed: number;
  errors: string[];
};

export function parseOfflineCheckIns(raw: unknown): OfflineCheckInEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is OfflineCheckInEntry =>
      !!item &&
      typeof item === "object" &&
      "token" in item &&
      typeof (item as OfflineCheckInEntry).token === "string" &&
      "meetingId" in item &&
      typeof (item as OfflineCheckInEntry).meetingId === "string"
  );
}

export async function syncOfflineCheckInsFromClient(
  entries: OfflineCheckInEntry[]
): Promise<SyncCheckInResult & { remaining: OfflineCheckInEntry[] }> {
  if (!entries.length) {
    return { synced: 0, failed: 0, errors: [], remaining: [] };
  }

  const res = await fetch("/api/check-in/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries }),
  });

  if (!res.ok) {
    return {
      synced: 0,
      failed: entries.length,
      errors: [`HTTP ${res.status}`],
      remaining: entries,
    };
  }

  const data = (await res.json()) as SyncCheckInResult & {
    syncedTokens?: string[];
  };
  const syncedSet = new Set(data.syncedTokens ?? []);
  const remaining = entries.filter((e) => !syncedSet.has(e.token + (e.memberId ?? e.guestName ?? "")));

  return {
    synced: data.synced,
    failed: data.failed,
    errors: data.errors,
    remaining,
  };
}

export function readOfflineCheckInsFromStorage(): OfflineCheckInEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_CHECKIN_STORAGE_KEY);
    return raw ? parseOfflineCheckIns(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function writeOfflineCheckInsToStorage(entries: OfflineCheckInEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(OFFLINE_CHECKIN_STORAGE_KEY, JSON.stringify(entries));
}

export async function flushOfflineCheckInQueue(): Promise<SyncCheckInResult> {
  const queued = readOfflineCheckInsFromStorage();
  if (!queued.length) return { synced: 0, failed: 0, errors: [] };

  const result = await syncOfflineCheckInsFromClient(queued);
  writeOfflineCheckInsToStorage(result.remaining);
  return result;
}