"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Database, Download, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { createClubBackup, downloadClubBackup } from "@/actions/backup";
import type { BackupScope } from "@/generated/prisma/client";

type BackupRow = {
  id: string;
  scope: BackupScope;
  status: string;
  fileName: string | null;
  sizeBytes: number | null;
  createdAt: string;
  completedAt: string | null;
};

export function ClubBackupPanel({
  backups,
  canManage,
}: {
  backups: BackupRow[];
  canManage: boolean;
}) {
  const t = useTranslations("backup");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function runBackup(scope: BackupScope) {
    startTransition(async () => {
      const result = await createClubBackup(scope);
      if ("success" in result && result.success) {
        setToast(t("created"));
        router.refresh();
      } else {
        setToast(t("failed"));
      }
    });
  }

  function download(backupId: string) {
    startTransition(async () => {
      const result = await downloadClubBackup(backupId);
      if ("content" in result && result.content) {
        const blob = new Blob([result.content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("clubTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">{t("clubDescription")}</p>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => runBackup("DATABASE_ONLY")}>
              <Database className="h-4 w-4 mr-1" />
              {t("databaseOnly")}
            </Button>
            <Button size="sm" variant="gold" disabled={pending} onClick={() => runBackup("FULL")}>
              <HardDrive className="h-4 w-4 mr-1" />
              {t("fullBackup")}
            </Button>
          </div>
        )}
        {backups.length > 0 && (
          <ul className="space-y-2 text-sm">
            {backups.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50">
                <div>
                  <span className="font-medium">{b.fileName ?? b.id.slice(0, 8)}</span>
                  <Badge variant={b.status === "COMPLETED" ? "success" : "muted"} className="ml-2">
                    {t(`scope.${b.scope}`)}
                  </Badge>
                  {b.sizeBytes != null && (
                    <span className="text-xs text-gray-400 ml-2">
                      {(b.sizeBytes / 1024).toFixed(0)} Ko
                    </span>
                  )}
                </div>
                {b.status === "COMPLETED" && (
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => download(b.id)}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </Card>
  );
}