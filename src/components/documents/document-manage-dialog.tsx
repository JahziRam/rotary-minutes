"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateDocument, archiveDocument } from "@/actions/documents";
import type { DocumentCategory } from "@/generated/prisma/client";

type ManageDocument = {
  id: string;
  title: string;
  category: DocumentCategory;
  description: string | null;
  folderId: string | null;
  minuteId: string | null;
  tags: string[];
};

type FolderOption = {
  id: string;
  name: string;
};

const CATEGORIES: DocumentCategory[] = [
  "STATUTES",
  "BUDGET",
  "MANDATE",
  "MINUTE",
  "REPORT",
  "TREASURY",
  "OTHER",
];

export function DocumentManageDialog({
  document,
  folders,
  fileManagerEnabled,
  onClose,
  onUpdated,
  onDeleted,
}: {
  document: ManageDocument;
  folders: FolderOption[];
  fileManagerEnabled: boolean;
  onClose: () => void;
  onUpdated: (doc: ManageDocument) => void;
  onDeleted: (documentId: string) => void;
}) {
  const t = useTranslations("documents.manage");
  const tCat = useTranslations("documents.categories");
  const [title, setTitle] = useState(document.title);
  const [category, setCategory] = useState(document.category);
  const [description, setDescription] = useState(document.description ?? "");
  const [tags, setTags] = useState(document.tags.join(", "));
  const [folderId, setFolderId] = useState(document.folderId ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMinuteLinked = Boolean(document.minuteId);

  useEffect(() => {
    setTitle(document.title);
    setCategory(document.category);
    setDescription(document.description ?? "");
    setTags(document.tags.join(", "));
    setFolderId(document.folderId ?? "");
    setConfirmDelete(false);
    setError(null);
  }, [document]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const parsedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const result = await updateDocument(document.id, {
      title: title.trim(),
      category: isMinuteLinked ? undefined : category,
      description: description.trim() || null,
      tags: parsedTags,
      ...(fileManagerEnabled
        ? { folderId: folderId || null }
        : {}),
    });

    setPending(false);

    if ("error" in result && result.error) {
      if (result.error === "LINKED_MINUTE") setError(t("linkedMinuteError"));
      else if (result.error === "INVALID_TITLE") setError(t("invalidTitle"));
      else setError(t("updateError"));
      return;
    }

    if ("success" in result && result.success && result.document) {
      onUpdated({
        id: result.document.id,
        title: result.document.title,
        category: result.document.category,
        description: result.document.description,
        folderId: result.document.folderId,
        minuteId: result.document.minuteId,
        tags: result.document.tags,
      });
      onClose();
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setPending(true);
    setError(null);

    const result = await archiveDocument(document.id);
    setPending(false);

    if ("error" in result && result.error) {
      if (result.error === "LINKED_MINUTE") setError(t("linkedMinuteError"));
      else setError(t("deleteError"));
      setConfirmDelete(false);
      return;
    }

    if ("success" in result && result.success) {
      onDeleted(document.id);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b gap-3">
          <h3 className="font-semibold text-gray-900">{t("title")}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-auto p-4 space-y-4">
          {isMinuteLinked && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {t("linkedMinuteHint")}
            </p>
          )}

          <Input
            label={t("docTitle")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={pending}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{t("category")}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              disabled={pending || isMinuteLinked}
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {tCat(c)}
                </option>
              ))}
            </select>
          </div>

          {fileManagerEnabled && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t("folder")}</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                disabled={pending}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">{t("rootFolder")}</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label={t("description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
          />

          <Input
            label={t("tags")}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t("tagsPlaceholder")}
            disabled={pending}
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
            {!isMinuteLinked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={pending}
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
                {confirmDelete ? t("confirmDelete") : t("delete")}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {t("save")}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}