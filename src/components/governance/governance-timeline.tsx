"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Scale,
  FileCheck,
  ArrowRightLeft,
  UserCheck,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { createRecord } from "@/actions/governance";
import type { GovernanceRecordType } from "@/generated/prisma/client";

type RecordView = {
  id: string;
  type: GovernanceRecordType;
  title: string;
  description: string | null;
  holderName: string | null;
  effectiveAt: string;
  minute?: { id: string; title: string; status: string } | null;
  mandate?: { id: string; role: string; holderName: string } | null;
  createdByName: string | null;
};

const TYPE_ICONS: Partial<Record<GovernanceRecordType, typeof Scale>> = {
  MANDATE_START: UserCheck,
  MANDATE_END: UserCheck,
  COLLAR_TRANSFER: ArrowRightLeft,
  MINUTE_SUBMITTED: FileCheck,
  MINUTE_APPROVED: FileCheck,
  MINUTE_FINALIZED: FileCheck,
  OFFICER_CHANGE: UserCheck,
};

export function GovernanceTimeline({
  records,
  canManage,
}: {
  records: RecordView[];
  canManage: boolean;
}) {
  const t = useTranslations("governance");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const dateLocale = locale === "fr" ? fr : enUS;

  function handleCreate(fd: FormData) {
    startTransition(async () => {
      const result = await createRecord({
        type: fd.get("type") as "MANDATE_START" | "COLLAR_TRANSFER" | "OFFICER_CHANGE",
        title: fd.get("title") as string,
        description: (fd.get("description") as string) || undefined,
        holderName: (fd.get("holderName") as string) || undefined,
        effectiveAt: fd.get("effectiveAt") as string,
      });
      if ("success" in result && result.success) {
        setToast(t("recordCreated"));
        setShowForm(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("addRecord")}
          </Button>
        </div>
      )}

      {showForm && canManage && (
        <form
          action={handleCreate}
          className="rounded-xl border border-gray-200 bg-white p-4 grid sm:grid-cols-2 gap-3"
        >
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500">{t("recordType")}</label>
            <select
              name="type"
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
              required
            >
              <option value="MANDATE_START">{t("types.MANDATE_START")}</option>
              <option value="COLLAR_TRANSFER">{t("types.COLLAR_TRANSFER")}</option>
              <option value="OFFICER_CHANGE">{t("types.OFFICER_CHANGE")}</option>
            </select>
          </div>
          <Input name="title" label={t("recordTitle")} required />
          <Input name="holderName" label={t("holderName")} />
          <Input name="effectiveAt" type="date" label={t("effectiveDate")} required />
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500">{t("description")}</label>
            <textarea
              name="description"
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="gold" size="sm" disabled={pending}>
              {t("save")}
            </Button>
          </div>
        </form>
      )}

      {records.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">{t("empty")}</p>
      ) : (
        <ol className="relative border-l border-gray-200 ml-3 space-y-6">
          {records.map((record) => {
            const Icon = TYPE_ICONS[record.type] ?? Scale;
            return (
              <li key={record.id} className="ml-6">
                <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-navy/10 ring-4 ring-white">
                  <Icon className="h-3.5 w-3.5 text-navy" />
                </span>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-navy uppercase tracking-wide">
                        {t(`types.${record.type}`)}
                      </p>
                      <h3 className="font-semibold text-gray-900 mt-0.5">{record.title}</h3>
                      {record.holderName && (
                        <p className="text-sm text-gray-600 mt-1">{record.holderName}</p>
                      )}
                      {record.description && (
                        <p className="text-sm text-gray-500 mt-1">{record.description}</p>
                      )}
                      {record.minute && (
                        <p className="text-xs text-gray-400 mt-2">
                          PV : {record.minute.title}
                        </p>
                      )}
                      {record.mandate && (
                        <p className="text-xs text-gray-400 mt-2">
                          {record.mandate.role} — {record.mandate.holderName}
                        </p>
                      )}
                    </div>
                    <time className="text-xs text-gray-400 whitespace-nowrap">
                      {format(new Date(record.effectiveAt), "PPP", { locale: dateLocale })}
                    </time>
                  </div>
                  {record.createdByName && (
                    <p className="text-[10px] text-gray-400 mt-2">
                      {t("createdBy", { name: record.createdByName })}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}