import { prisma } from "@/lib/prisma";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiError, apiJson } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request, "READ_MINUTES");
  if ("error" in auth) {
    return apiError(auth.error, auth.error, auth.status);
  }

  const { id } = await params;

  const minute = await prisma.minute.findFirst({
    where: { id, clubId: auth.clubId },
    include: {
      meeting: {
        select: {
          id: true,
          date: true,
          type: true,
          location: true,
          startTime: true,
          endTime: true,
        },
      },
      agendaItems: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          title: true,
          description: true,
          status: true,
        },
      },
      author: { select: { firstName: true, lastName: true } },
    },
  });

  if (!minute) {
    return apiError("NOT_FOUND", "Minute not found", 404);
  }

  return apiJson({ data: minute });
}