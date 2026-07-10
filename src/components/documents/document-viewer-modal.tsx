"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { getDocumentViewKind, type DocumentViewKind } from "@/lib/document-types";

export function DocumentViewerModal({
  title,
  fileUrl,
  downloadUrl,
  mimeType,
  viewKind,
  shareUrl,
  onClose,
}: {
  title: string;
  fileUrl: string;
  downloadUrl?: string | null;
  mimeType: string | null;
  viewKind?: DocumentViewKind;
  shareUrl?: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("documents.viewer");
  const kind = viewKind ?? getDocumentViewKind(mimeType, fileUrl);
  const viewUrl = shareUrl ?? fileUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b gap-3">
          <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-navy hover:underline"
              >
                {t("download")}
              </a>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2 min-h-[300px] bg-gray-50">
          {(kind === "pdf" || kind === "office" || kind === "text") && (
            <iframe
              src={viewUrl}
              title={title}
              className="w-full h-[70vh] rounded border border-gray-200 bg-white"
            />
          )}
          {kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={viewUrl}
              alt={title}
              className="max-w-full max-h-[70vh] mx-auto rounded shadow-sm object-contain"
            />
          )}
          {kind === "unsupported" && (
            <div className="text-center py-12 text-gray-500">
              <p>{t("unsupported")}</p>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy hover:underline mt-2 inline-block"
                >
                  {t("openFile")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}