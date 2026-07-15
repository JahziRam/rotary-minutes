"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, ExternalLink, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteMinuteAttachment,
  listMinuteAttachments,
} from "@/actions/minute-attachments";
import {
  MAX_UPLOAD_FILES_PER_BATCH,
  validateUploadFiles,
} from "@/lib/upload-limits";

type AttachmentRow = {
  id: string;
  title: string;
  fileName: string | null;
  viewUrl: string | null;
  downloadUrl: string | null;
  uploadedByName: string | null;
  createdAt: string;
};

export async function uploadMinuteAttachmentsClient(
  minuteId: string,
  files: File[]
): Promise<{ ok: boolean; uploaded?: number; error?: string }> {
  const validationError = validateUploadFiles(files);
  if (validationError === "TOO_LARGE") return { ok: false, error: "TOO_LARGE" };
  if (validationError === "TOO_MANY_FILES") return { ok: false, error: "TOO_MANY_FILES" };
  if (validationError === "NO_FILE") return { ok: false, error: "NO_FILE" };

  const fd = new FormData();
  for (const file of files) {
    fd.append("files", file);
  }

  const response = await fetch(`/api/minutes/${minuteId}/attachments`, {
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

export function MinuteAttachmentsPanel({ minuteId }: { minuteId: string }) {
  const t = useTranslations("minutes.attachments");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await listMinuteAttachments(minuteId);
      if ("attachments" in result && result.attachments) {
        setAttachments(result.attachments as AttachmentRow[]);
        setCanManage(!!result.canManage);
      }
    });
  }, [minuteId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const batch = Array.from(files).slice(0, MAX_UPLOAD_FILES_PER_BATCH);
    setError(null);

    startTransition(async () => {
      const result = await uploadMinuteAttachmentsClient(minuteId, batch);
      if (result.ok) {
        load();
      } else if (result.error) {
        setError(t(`error.${result.error}` as "error.TOO_LARGE"));
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleDelete(attachmentId: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteMinuteAttachment(attachmentId);
      if ("success" in result && result.success) {
        load();
      } else if ("error" in result) {
        setError(t("error.generic"));
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500">{t("hint")}</p>

        {attachments.length === 0 ? (
          <p className="text-sm text-gray-400">{t("empty")}</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{file.title}</p>
                  {file.fileName && (
                    <p className="text-xs text-gray-500 truncate">{file.fileName}</p>
                  )}
                  {file.uploadedByName && (
                    <p className="text-xs text-gray-400">
                      {t("uploadedBy", { name: file.uploadedByName })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {file.viewUrl && (
                    <a
                      href={file.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-500 hover:text-navy"
                      title={t("view")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {file.downloadUrl && (
                    <a
                      href={file.downloadUrl}
                      className="p-1.5 text-gray-500 hover:text-navy"
                      title={t("download")}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(file.id)}
                      disabled={pending}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                      title={t("delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canManage && (
          <div>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              {t("upload")}
            </Button>
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}