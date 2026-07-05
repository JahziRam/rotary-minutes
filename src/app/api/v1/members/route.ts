import { prisma } from "@/lib/prisma";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiError, apiJson } from "@/lib/api-response";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, "READ_MEMBERS");
  if ("error" in auth) {
    return apiError(auth.error, auth.error, auth.status);
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") !== "false";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 200);

  const members = await prisma.member.findMany({
    where: {
      clubId: auth.clubId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      position: true,
      joinDate: true,
      isActive: true,
      commission: { select: { name: true } },
    },
  });

  return apiJson({ data: members, count: members.length });
}