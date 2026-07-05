import { addHours } from "date-fns";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { DEMO_CLUB_SLUG } from "@/lib/demo-constants";

export async function getDemoClubData() {
  const club = await prisma.club.findUnique({
    where: { slug: DEMO_CLUB_SLUG },
    include: {
      members: {
        where: { isActive: true },
        orderBy: { lastName: "asc" },
        take: 12,
      },
      meetings: {
        orderBy: { date: "desc" },
        take: 5,
        include: {
          minute: { select: { id: true, title: true, status: true } },
          _count: { select: { attendances: true } },
        },
      },
      minutes: {
        where: { status: { not: "ARCHIVED" } },
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: {
          meeting: { select: { date: true } },
          author: { select: { firstName: true, lastName: true } },
        },
      },
      _count: {
        select: { members: true, meetings: true, minutes: true },
      },
    },
  });

  return club;
}

export async function createDemoSessionRecord() {
  const token = randomBytes(32).toString("hex");
  const expiresAt = addHours(new Date(), 24);

  return prisma.demoSession.create({
    data: { token, expiresAt },
  });
}

export async function getValidDemoSession(token: string) {
  const session = await prisma.demoSession.findUnique({ where: { token } });
  if (!session || session.expiresAt <= new Date()) return null;
  return session;
}

export async function ensureDemoSessionHelper(token?: string | null) {
  if (token) {
    const existing = await getValidDemoSession(token);
    if (existing) return existing;
  }
  return createDemoSessionRecord();
}