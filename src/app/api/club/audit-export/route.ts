import { NextResponse } from "next/server";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRolePermission } from "@/lib/roles";
import type { ClubRoleType } from "@/lib/rotary";

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = session.user.memberships[0];
  if (!membership && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clubId = membership?.clubId;
  if (!clubId) {
    return NextResponse.json({ error: "No club" }, { status: 400 });
  }

  const allowed = session.user.isSuperAdmin ||
    (await hasRolePermission(membership.role as ClubRoleType, "settings.manage", false));
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await prisma.auditLog.findMany({
    where: { clubId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const header = ["id", "createdAt", "action", "entity", "entityId", "user", "email", "ipAddress", "metadata"];
  const rows = logs.map((log) =>
    [
      log.id,
      format(log.createdAt, "yyyy-MM-dd HH:mm:ss"),
      log.action,
      log.entity,
      log.entityId ?? "",
      log.user ? `${log.user.firstName} ${log.user.lastName}` : "",
      log.user?.email ?? "",
      log.ipAddress ?? "",
      log.metadata ? JSON.stringify(log.metadata) : "",
    ].map(escapeCsv).join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  const filename = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}