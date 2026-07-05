"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuditExportButton() {
  const t = useTranslations("gdpr");

  return (
    <a href="/api/club/audit-export" download>
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4" />
        {t("auditExport")}
      </Button>
    </a>
  );
}