"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import {
  createBudgetCategory,
  exportTreasuryAccountingCsv,
  exportTreasuryAccountingOfx,
  toggleBudgetCategory,
} from "@/actions/treasury";
import type { BudgetEntryType } from "@/generated/prisma/client";

type CategoryRow = {
  id: string;
  name: string;
  type: BudgetEntryType;
  isActive: boolean;
};

export function TreasuryExtras({
  allCategories,
  canManage,
  locale,
  exportFrom,
  exportTo,
}: {
  allCategories: CategoryRow[];
  canManage: boolean;
  locale: string;
  exportFrom: string;
  exportTo: string;
}) {
  const t = useTranslations("treasury");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<BudgetEntryType>("EXPENSE");

  function download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setToast(t("exportSuccess"));
  }

  const exportOpts = { from: exportFrom, to: exportTo, locale };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("exportSection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">{t("exportAccountingHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await exportTreasuryAccountingCsv(exportOpts);
                  if ("csv" in r && r.csv) download(r.csv, r.filename!, "text/csv");
                })
              }
            >
              <Download className="h-4 w-4 mr-1" />
              {t("exportAccounting")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await exportTreasuryAccountingOfx(exportOpts);
                  if ("ofx" in r && r.ofx) download(r.ofx, r.filename!, "application/x-ofx");
                })
              }
            >
              <Download className="h-4 w-4 mr-1" />
              OFX
            </Button>
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("customCategories")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder={t("categoryNameFr")}
                className="flex-1 min-w-[140px] text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
              <select
                value={catType}
                onChange={(e) => setCatType(e.target.value as BudgetEntryType)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="INCOME">{t("types.INCOME")}</option>
                <option value="EXPENSE">{t("types.EXPENSE")}</option>
              </select>
              <Button
                size="sm"
                variant="gold"
                disabled={pending || !catName.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const r = await createBudgetCategory({ name: catName, type: catType });
                    if ("success" in r && r.success) {
                      setCatName("");
                      setToast(t("saved"));
                      router.refresh();
                    }
                  })
                }
              >
                <FolderPlus className="h-4 w-4 mr-1" />
                {t("addCategory")}
              </Button>
            </div>
            <ul className="space-y-1.5 text-sm max-h-40 overflow-y-auto">
              {allCategories.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className={c.isActive ? "text-gray-800" : "text-gray-400 line-through"}>
                    {c.name}
                    <span className="text-xs text-gray-400 ml-1">({t(`types.${c.type}`)})</span>
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={c.isActive ? "success" : "muted"} className="text-[10px]">
                      {c.isActive ? t("activateCategory") : t("deactivateCategory")}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await toggleBudgetCategory(c.id, !c.isActive);
                          router.refresh();
                        })
                      }
                    >
                      {c.isActive ? t("deactivateCategory") : t("activateCategory")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}