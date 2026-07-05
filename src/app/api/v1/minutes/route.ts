import { prisma } from "@/lib/prisma";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiError, apiJson } from "@/lib/api-response";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, "READ_MINUTES");
  if ("error" in auth) {
    return apiError(auth.error, auth.error, auth.status);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "FINALIZED";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100);

  const minutes = await prisma.minute.findMany({
    where: {
      clubId: auth.clubId,
      status: status as never,
    },
    orderBy: { finalizedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      status: true,
      contentHash: true,
      verifyUrl: true,
      finalizedAt: true,
      createdAt: true,
      meeting: {
        select: { id: true, date: true, type: true, location: true },
      },
    },
  });

  return apiJson({ data: minutes, count: minutes.length });
}