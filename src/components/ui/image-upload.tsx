"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_IMAGE_BYTES } from "@/lib/image-storage";
import { validateUploadFileSize } from "@/lib/upload-limits";

type UploadResult = { success?: true; error?: string };

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
    if (validateUploadFileSize(file.size) === "TOO_LARGE") {
      setError("Fichier trop volumineux (max 5 Mo)");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image trop volumineuse (max 512 Ko)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const result = await onUpload(fd);
      if (result.error) {
        setError(result.error);
        setPreview(currentUrl ?? null);
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