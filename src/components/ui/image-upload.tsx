"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_IMAGE_SOURCE_BYTES } from "@/lib/image-data-url";

type UploadResult = { success?: true; error?: string };

const ERROR_LABELS: Record<string, string> = {
  TOO_LARGE: "Image trop volumineuse (max 5 Mo à l’envoi — redimensionnée automatiquement)",
  INVALID_TYPE: "Format non supporté (JPEG, PNG, WebP ou GIF)",
  NO_FILE: "Aucun fichier sélectionné",
  UPLOADS_SUSPENDED: "Upload d’images temporairement désactivé",
  UPLOAD_FAILED: "Échec du téléversement",
  INVALID_FORMAT: "Format d’image invalide",
};

export function ImageUpload({
  label,
  hint,
  currentUrl,
  shape = "square",
  fit = "contain",
  onUpload,
  onRemove,
  disabled = false,
}: {
  label: string;
  hint?: string;
  currentUrl?: string | null;
  shape?: "square" | "circle";
  fit?: "contain" | "cover";
  onUpload: (formData: FormData) => Promise<UploadResult>;
  onRemove?: () => Promise<UploadResult>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shapeClass =
    shape === "circle" ? "rounded-full" : "rounded-xl";

  const handleFile = (file: File) => {
    setError(null);
    if (file.size > MAX_IMAGE_SOURCE_BYTES) {
      setError(ERROR_LABELS.TOO_LARGE);
      return;
    }
    if (file.type && !/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      setError(ERROR_LABELS.INVALID_TYPE);
      return;
    }

    // Local preview only (object URL — free after upload). Do not keep a second base64 copy.
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      try {
        const result = await onUpload(fd);
        if (result.error) {
          setError(ERROR_LABELS[result.error] ?? result.error);
          setPreview(currentUrl ?? null);
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-gray-200 bg-gray-50 ${shapeClass}`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className={`h-full w-full ${fit === "contain" ? "object-contain p-1" : "object-cover"}`}
            />
          ) : (
            <Camera className="h-6 w-6 text-gray-300" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={disabled || pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || pending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {pending ? "..." : "Choisir une image"}
          </Button>
          {preview && onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await onRemove();
                  if (!result.error) setPreview(null);
                  else setError(ERROR_LABELS[result.error] ?? result.error);
                });
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Supprimer
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
