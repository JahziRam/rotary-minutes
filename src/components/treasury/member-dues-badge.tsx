"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { DuesStatus } from "@/generated/prisma/client";
import type { MemberDuesStatusInfo } from "@/lib/queries/dues-overview";

const VARIANT: Record<DuesStatus, "default" | "success" | "warning" | "danger" | "muted"> = {
  PENDING: "warning",
  PAID: "success",
  OVERDUE: "danger",
  WAIVED: "muted",
};

export function MemberDuesBadge({ dues }: { dues: MemberDuesStatusInfo | undefined }) {
  const t = useTranslations("dues.statuses");

  if (!dues) return null;

  return (
    <Badge variant={VARIANT[dues.status]} className="text-[10px] shrink-0">
      {t(dues.status)}
    </Badge>
  );
}