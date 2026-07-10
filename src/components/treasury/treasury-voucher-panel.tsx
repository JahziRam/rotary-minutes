"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Paperclip, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteTreasuryVoucher,
  listTreasuryVouchers,
  type TreasuryVoucherEntity,
} from "@/actions/treasury-vouchers";
import {
  MAX_UPLOAD_FILES_PER_BATCH,
  validateUploadFiles,
} from "@/lib/upload-limits";
import type { TreasuryVoucherKind } from "@/generated/prisma/client";

type VoucherRow = {
  id: string;
  kind: TreasuryVoucherKind;
  label: string | null;
  fileName: string;
  mimeType: string;
  viewUrl: string;
  downloadUrl: string;
  createdAt: string;
};

const VOUCHER_KINDS: TreasuryVoucherKind[] = [
  "INVOICE",
  "RECEIPT",
  "PAYMENT_PROOF",
  "BANK_STATEMENT",
  "CONTRACT",
  "OTHER",
];

export async function uploadVoucherFilesClient(
  entity: TreasuryVoucherEntity,
  files: File[],
  kind: TreasuryVoucherKind = "OTHER"
): Promise<{ ok: boolean; uploaded?: number; error?: string }> {
  const validationError = validateUploadFiles(files);
  if (validationError === "TOO_LARGE") return { ok: false, error: "TOO_LARGE" };
  if (validationError === "TOO_MANY_FILES") return { ok: false, error: "TOO_MANY_FILES" };
  if (validationError === "NO_FILE") return { ok: false, error: "NO_FILE" };

  const fd = new FormData();
  fd.set("entityType", entity.type);
  fd.set("entityId", entity.id);
  fd.set("kind", kind);
  for (const file of files) {
    fd.append("files", file);
  }

  const response = await fetch("/api/treasury/vouchers/upload", {
    method: "POST",
    body: fd,
  });
  const result = (await response.json()) as {
    success?: boolean;
    uploaded?: number;
    error?: string;
  };

  if (response.ok && result.success) {
    return { ok: true, uploaded: result.uploaded };
  }
  return { ok: false, error: result.error ?? "UPLOAD_FAILED" };
}

export function TreasuryVoucherPanel({
  entity,
  canManage,
  compact = false,
  defaultKind,
  onCountChange,
}: {
  entity: TreasuryVoucherEntity | null;
  canManage: boolean;
  compact?: boolean;
  defaultKind?: TreasuryVoucherKind;
  onCountChange?: (count: number) => void;
}) {
  const t = useTranslations("treasury.vouchers");
  const [pending, startTransition] = useTransition();
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [kind, setKind] = useState<TreasuryVoucherKind>(defaultKind ?? "OTHER");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!entity) return;
    startTransition(async () => {
      const result = await listTreasuryVouchers(entity);
      if ("vouchers" in result) {
        setVouchers(result.vouchers as VoucherRow[]);
        onCountChange?.(result.vouchers.length);
      }
    });
  }, [entity, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (defaultKind) setKind(defaultKind);
  }, [defaultKind]);

  if (!entity) return null;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;

    setError(null);
    const result = await uploadVoucherFilesClient(entity!, selected, kind);
    if (result.ok) {
      load();
    } else if (result.error === "TOO_LARGE") {
      setError(t("fileTooLarge"));
    } else if (result.error === "TOO_MANY_FILES") {
      setError(t("tooManyFiles", { max: MAX_UPLOAD_FILES_PER_BATCH }));
    } else {
      setError(t("uploadError"));
    }
  }

  function handleDelete(voucherId: string) {
    startTransition(async () => {
      const result = await deleteTreasuryVoucher(voucherId);
      if ("success" in result && result.success) {
        load();
      }
    });
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Paperclip className="h-4 w-4" />
          {t("title")}
        </p>
      )}

      {canManage && (
        <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "p-3 rounded-lg border border-gray-200 bg-gray-50"}`}>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as TreasuryVoucherKind)}
            disabled={pending}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          >
            {VOUCHER_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-navy cursor-pointer hover:underline">
            <Upload className="h-3.5 w-3.5" />
            {t("addFiles")}
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
              className="sr-only"
              disabled={pending}
              onChange={handleUpload}
            />
          </label>
          <span className="text-[10px] text-gray-400">{t("limitsHint")}</span>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {vouchers.length === 0 ? (
        <p className="text-xs text-gray-400">{t("empty")}</p>
      ) : (
        <ul className="space-y-1.5">
          {vouchers.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-2 text-xs border border-gray-100 rounded-lg px-2 py-1.5 bg-white"
            >
              <div className="min-w-0">
                <a
                  href={v.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-navy hover:underline truncate block"
                >
                  {v.label ?? v.fileName}
                </a>
                <p className="text-[10px] text-gray-400">
                  {t(`kinds.${v.kind}`)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={v.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-gray-500 hover:text-navy"
                >
                  {t("download")}
                </a>
                {canManage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500"
                    disabled={pending}
                    onClick={() => handleDelete(v.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TreasuryVoucherModal({
  entity,
  title,
  canManage,
  defaultKind,
  onClose,
}: {
  entity: TreasuryVoucherEntity;
  title: string;
  canManage: boolean;
  defaultKind?: TreasuryVoucherKind;
  onClose: () => void;
}) {
  const t = useTranslations("treasury.vouchers");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{t("modalTitle")}</h3>
            <p className="text-xs text-gray-500 truncate">{title}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <TreasuryVoucherPanel
            entity={entity}
            canManage={canManage}
            defaultKind={defaultKind}
          />
        </div>
      </div>
    </div>
  );
}