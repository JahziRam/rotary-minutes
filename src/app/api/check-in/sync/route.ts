import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseOfflineCheckIns,
  type OfflineCheckInEntry,
} from "@/lib/offline-check-in-sync";

async function processEntry(entry: OfflineCheckInEntry): Promise<"ok" | "skip" | "error"> {
  const row = await prisma.meetingCheckInToken.findUnique({
    where: { token: entry.token },
    include: { meeting: true },
  });
  if (!row || row.expiresAt < new Date()) return "skip";
  if (row.meetingId !== entry.meetingId) return "error";

  if (!entry.memberId && !entry.guestName?.trim()) return "error";

  if (entry.memberId) {
    const existing = await prisma.meetingAttendance.findFirst({
      where: { meetingId: row.meetingId, memberId: entry.memberId },
    });
    if (existing) {
      await prisma.meetingAttendance.update({
        where: { id: existing.id },
        data: { category: "PRESENT", notes: "QR check-in (offline sync)" },
      });
    } else {
      await prisma.meetingAttendance.create({
        data: {
          meetingId: row.meetingId,
          memberId: entry.memberId,
          category: "PRESENT",
          notes: "QR check-in (offline sync)",
        },
      });
    }
  } else {
    await prisma.meetingAttendance.create({
      data: {
        meetingId: row.meetingId,
        guestName: entry.guestName!.trim(),
        category: "VISITOR",
        notes: "QR check-in (offline sync)",
      },
    });
  }

  return "ok";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entries = parseOfflineCheckIns(
    body && typeof body === "object" && "entries" in body
      ? (body as { entries: unknown }).entries
      : body
  );

  if (!entries.length) {
    return NextResponse.json({ synced: 0, failed: 0, errors: [], syncedTokens: [] });
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  const syncedTokens: string[] = [];

  for (const entry of entries) {
    try {
      const result = await processEntry(entry);
      if (result === "ok") {
        synced++;
        syncedTokens.push(entry.token + (entry.memberId ?? entry.guestName ?? ""));
      } else if (result === "skip") {
        failed++;
        errors.push(`expired:${entry.token}`);
      } else {
        failed++;
        errors.push(`invalid:${entry.token}`);
      }
    } catch (e) {
      failed++;
      errors.push(e instanceof Error ? e.message : "error");
    }
  }

  return NextResponse.json({ synced, failed, errors, syncedTokens });
}