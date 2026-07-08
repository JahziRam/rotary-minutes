import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import type { DuesStatus } from "@/generated/prisma/client";
import type { MemberDuesStatusInfo } from "@/lib/queries/dues-overview";

const VARIANT: Record<DuesStatus, "default" | "success" | "warning" | "danger" | "muted"> = {
  PENDING: "warning",
  PAID: "success",
  OVERDUE: "danger",
  WAIVED: "muted",
};

export async function MemberDuesBadge({ dues }: { dues: MemberDuesStatusInfo | undefined }) {
  if (!dues) return null;
  const t = await getTranslations("dues.statuses");

  return (
    <Badge variant={VARIANT[dues.status]} className="text-[10px] shrink-0">
      {t(dues.status)}
    </Badge>
  );
}