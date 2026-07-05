import { prisma } from "@/lib/prisma";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiError, apiJson } from "@/lib/api-response";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, "READ_MEETINGS");
  if ("error" in auth) {
    return apiError(auth.error, auth.error, auth.status);
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100);

  const meetings = await prisma.meeting.findMany({
    where: { clubId: auth.clubId },
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      date: true,
      type: true,
      location: true,
      startTime: true,
      endTime: true,
      presidedBy: true,
      secretary: true,
      createdAt: true,
      _count: { select: { attendances: true } },
    },
  });

  return apiJson({ data: meetings, count: meetings.length });
}