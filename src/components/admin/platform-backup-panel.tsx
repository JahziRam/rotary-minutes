"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Database, HardDrive, FileJson, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { createPlatformBackup, downloadPlatformBackup } from "@/actions/backup";
import type { BackupScope } from "@/generated/prisma/client";

export function PlatformBackupPanel() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [lastBackupId, setLastBackupId] = useState<string | null>(null);

  function runBackup(scope: BackupScope) {
    startTransition(async () => {
      const result = await createPlatformBackup(scope, locale);
      if ("success" in result && result.success) {
        setLastBackupId(result.backupId);
        setToast("Sauvegarde plateforme créée");
        router.refresh();
      } else {
        setToast("Échec de la sauvegarde");
      }
    });
  }

  function download(format: "json" | "sql") {
    if (!lastBackupId) return;
    startTransition(async () => {
      const result = await downloadPlatformBackup(lastBackupId, format);
      if ("content" in result && result.content) {
        const mime = format === "sql" ? "text/plain" : "application/json";
        const blob = new Blob([result.content], { type: mime });
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
    <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">Sauvegarde plateforme</h3>
      <p className="text-xs text-gray-500">
        Export JSON ou SQL des clubs, utilisateurs et configuration SaaS (réservé super admin).
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => runBackup("DATABASE_ONLY")}>
          <Database className="h-4 w-4 mr-1" />
          Base de données
        </Button>
        <Button size="sm" variant="gold" disabled={pending} onClick={() => runBackup("FULL")}>
          <HardDrive className="h-4 w-4 mr-1" />
          Sauvegarde complète
        </Button>
        {lastBackupId && (
          <>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => download("json")}>
              <FileJson className="h-4 w-4 mr-1" />
              Télécharger JSON
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => download("sql")}>
              <FileCode className="h-4 w-4 mr-1" />
              Télécharger SQL
            </Button>
          </>
        )}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}