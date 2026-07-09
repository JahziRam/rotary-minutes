"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DocumentViewerModal({
  title,
  fileUrl,
  mimeType,
  shareUrl,
  onClose,
}: {
  title: string;
  fileUrl: string;
  mimeType: string | null;
  shareUrl?: string | null;
  onClose: () => void;
}) {
  const isPdf = mimeType === "application/pdf" || fileUrl.includes("/api/pdf/");
  const isImage = mimeType?.startsWith("image/") ?? false;
  const viewUrl = shareUrl ?? fileUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-2 min-h-[300px]">
          {isPdf && (
            <iframe src={viewUrl} title={title} className="w-full h-[70vh] rounded border-0" />
          )}
          {isImage && !isPdf && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewUrl} alt={title} className="max-w-full mx-auto rounded" />
          )}
          {!isPdf && !isImage && (
            <div className="text-center py-12 text-gray-500">
              <p>Aperçu non disponible pour ce type de fichier.</p>
              <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="text-navy hover:underline mt-2 inline-block">
                Ouvrir le fichier
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}