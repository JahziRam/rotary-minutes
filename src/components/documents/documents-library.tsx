"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Search,
  Upload,
  FileText,
  FolderOpen,
  FolderPlus,
  Eye,
  Share2,
  Link2,
  Settings2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { ListPagination } from "@/components/ui/list-controls";
import { DocumentViewerModal } from "@/components/documents/document-viewer-modal";
import { DocumentManageDialog } from "@/components/documents/document-manage-dialog";
import {
  MAX_UPLOAD_FILES_PER_BATCH,
  validateUploadFiles,
} from "@/lib/upload-limits";
import {
  searchDocuments,
  fetchDocumentRows,
  createDocumentFolder,
  enableDocumentShare,
  disableDocumentShare,
} from "@/actions/documents";
import type { DocumentViewKind } from "@/lib/document-types";
import type { DocumentCategory } from "@/generated/prisma/client";

type DocumentRow = {
  id: string;
  title: string;
  category: DocumentCategory;
  description: string | null;
  fileUrl: string | null;
  downloadUrl?: string | null;
  viewKind?: DocumentViewKind;
  fileName: string | null;
  mimeType: string | null;
  minuteId: string | null;
  folderId: string | null;
  isArchived: boolean;
  isShareEnabled: boolean;
  shareToken: string | null;
  tags: string[];
  createdAt: string;
  uploadedByName: string | null;
};

type FolderRow = {
  id: string;
  name: string;
  parentId: string | null;
  documentCount: number;
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

export function DocumentsLibrary({
  documents: initialDocs,
  folders: initialFolders = [],
  canManage,
  locale,
  fileManagerEnabled = false,
  documentSharingEnabled = false,
}: {
  documents: DocumentRow[];
  folders?: FolderRow[];
  canManage: boolean;
  locale: string;
  fileManagerEnabled?: boolean;
  documentSharingEnabled?: boolean;
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [documents, setDocuments] = useState(initialDocs);
  const [folders] = useState(initialFolders);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [viewer, setViewer] = useState<DocumentRow | null>(null);
  const [managing, setManaging] = useState<DocumentRow | null>(null);
  const dateLocale = locale === "fr" ? fr : enUS;

  const childFolders = useMemo(
    () => folders.filter((f) => f.parentId === currentFolderId),
    [folders, currentFolderId]
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await searchDocuments(query, category || undefined);
      if ("documents" in result) {
        setDocuments(result.documents as DocumentRow[]);
      }
    });
  }

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("files") as HTMLInputElement | null;
    const selected = Array.from(fileInput?.files ?? []);

    const validationError = validateUploadFiles(selected);
    if (validationError === "TOO_LARGE") {
      setToast(t("fileTooLarge"));
      return;
    }
    if (validationError === "TOO_MANY_FILES") {
      setToast(t("tooManyFiles", { max: MAX_UPLOAD_FILES_PER_BATCH }));
      return;
    }
    if (validationError === "NO_FILE") {
      setToast(t("uploadError"));
      return;
    }

    const fd = new FormData(form);
    if (fileManagerEnabled && currentFolderId) {
      fd.set("folderId", currentFolderId);
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: fd,
        });
        const result = (await response.json()) as {
          success?: boolean;
          uploaded?: number;
          failed?: string[];
          error?: string;
        };

        if (response.ok && result.success) {
          const refreshed = await fetchDocumentRows({
            category: category || undefined,
            folderId: fileManagerEnabled ? currentFolderId : undefined,
          });
          if ("documents" in refreshed) {
            setDocuments(refreshed.documents as DocumentRow[]);
          }

          if (result.failed && result.failed.length > 0) {
            setToast(
              t("uploadedPartial", {
                count: result.uploaded ?? 0,
                failed: result.failed.length,
              })
            );
          } else {
            setToast(
              (result.uploaded ?? 0) > 1
                ? t("uploadedMultiple", { count: result.uploaded ?? 0 })
                : t("uploaded")
            );
          }
          setShowUpload(false);
          form.reset();
        } else if (result.error === "TOO_LARGE") {
          setToast(t("fileTooLarge"));
        } else if (result.error === "TOO_MANY_FILES") {
          setToast(t("tooManyFiles", { max: MAX_UPLOAD_FILES_PER_BATCH }));
        } else if (result.error === "INVALID_TYPE") {
          setToast(t("invalidType"));
        } else {
          setToast(t("uploadError"));
        }
      } catch {
        setToast(t("uploadError"));
      }
    });
  }

  function handleDocumentUpdated(updated: {
    id: string;
    title: string;
    category: DocumentCategory;
    description: string | null;
    folderId: string | null;
    minuteId: string | null;
    tags: string[];
  }) {
    setDocuments((prev) => {
      if (fileManagerEnabled && updated.folderId !== currentFolderId) {
        return prev.filter((d) => d.id !== updated.id);
      }
      return prev.map((d) =>
        d.id === updated.id
          ? {
              ...d,
              title: updated.title,
              category: updated.category,
              description: updated.description,
              folderId: updated.folderId,
              tags: updated.tags,
            }
          : d
      );
    });
    setToast(t("manage.updated"));
  }

  function handleDocumentDeleted(documentId: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    setToast(t("manage.deleted"));
  }

  function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    startTransition(async () => {
      const result = await createDocumentFolder({
        name: newFolderName,
        parentId: currentFolderId ?? undefined,
      });
      if ("success" in result && result.success) {
        setToast(t("folderCreated"));
        setNewFolderName("");
        router.refresh();
      }
    });
  }

  function handleShare(doc: DocumentRow) {
    startTransition(async () => {
      if (doc.isShareEnabled && doc.shareToken) {
        const url = `${window.location.origin}/api/share/document/${doc.shareToken}`;
        await navigator.clipboard.writeText(url);
        setToast(t("shareLinkCopied"));
        return;
      }
      const result = await enableDocumentShare(doc.id, 30);
      if ("shareToken" in result && result.shareToken) {
        const url = `${window.location.origin}/api/share/document/${result.shareToken}`;
        await navigator.clipboard.writeText(url);
        setToast(t("shareEnabled"));
        router.refresh();
      }
    });
  }

  function handleDisableShare(documentId: string) {
    startTransition(async () => {
      await disableDocumentShare(documentId);
      setToast(t("shareDisabled"));
      router.refresh();
    });
  }

  const [docPage, setDocPage] = useState(1);
  const filteredBase = useMemo(
    () =>
      documents.filter((d) => {
        if (category && d.category !== category) return false;
        if (fileManagerEnabled && d.folderId !== currentFolderId) return false;
        return true;
      }),
    [documents, category, fileManagerEnabled, currentFolderId]
  );
  useEffect(() => {
    setDocPage(1);
  }, [category, currentFolderId, query]);
  const docPageSize = 12;
  const docTotalPages = Math.max(1, Math.ceil(filteredBase.length / docPageSize) || 1);
  const safeDocPage = Math.min(Math.max(1, docPage), docTotalPages);
  const filtered = filteredBase.slice(
    (safeDocPage - 1) * docPageSize,
    safeDocPage * docPageSize
  );
  const docStart = filteredBase.length === 0 ? 0 : (safeDocPage - 1) * docPageSize + 1;
  const docEnd = Math.min(safeDocPage * docPageSize, filteredBase.length);

  const currentFolder = currentFolderId
    ? folders.find((f) => f.id === currentFolderId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory | "")}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
          >
            <option value="">{t("allCategories")}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" disabled={pending}>
            {t("search")}
          </Button>
        </form>
        {canManage && (
          <Button onClick={() => setShowUpload(!showUpload)}>
            <Upload className="h-4 w-4" />
            {t("upload")}
          </Button>
        )}
      </div>

      {fileManagerEnabled && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setCurrentFolderId(null)}
            className={`px-2 py-1 rounded ${!currentFolderId ? "bg-navy text-white" : "text-navy hover:underline"}`}
          >
            {t("rootFolder")}
          </button>
          {currentFolder && (
            <span className="text-gray-500">/ {currentFolder.name}</span>
          )}
          {canManage && (
            <div className="flex items-center gap-2 ml-auto">
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={t("newFolder")}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1"
              />
              <Button size="sm" variant="outline" disabled={pending} onClick={handleCreateFolder}>
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {fileManagerEnabled && childFolders.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {childFolders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setCurrentFolderId(folder.id)}
              className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:border-navy/30 text-left"
            >
              <FolderOpen className="h-5 w-5 text-gold shrink-0" />
              <div>
                <p className="font-medium text-sm">{folder.name}</p>
                <p className="text-xs text-gray-400">{folder.documentCount} {t("files")}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showUpload && canManage && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleUpload} className="grid sm:grid-cols-2 gap-4">
              <Input name="title" label={t("docTitle")} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{t("category")}</label>
                <select
                  name="category"
                  required
                  className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`categories.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
              <Input name="description" label={t("description")} />
              <Input name="tags" label={t("tags")} placeholder={t("tagsPlaceholder")} />
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{t("uploadFiles")}</label>
                <input
                  type="file"
                  name="files"
                  required
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
                  className="flex w-full text-sm"
                />
                <p className="text-xs text-gray-500">{t("uploadLimitsHint")}</p>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={pending}>{t("save")}</Button>
                <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {filteredBase.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>{t("noDocuments")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-navy shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                      <Badge variant="default">{t(`categories.${doc.category}`)}</Badge>
                      {doc.isShareEnabled && (
                        <Badge variant="success">
                          <Link2 className="h-3 w-3 mr-0.5" />
                          {t("shared")}
                        </Badge>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-sm text-gray-500 truncate">{doc.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(doc.createdAt), "PP", { locale: dateLocale })}
                      {doc.uploadedByName && ` · ${doc.uploadedByName}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.fileUrl && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewer(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <a
                        href={doc.downloadUrl ?? doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-navy hover:underline"
                      >
                        {t("download")}
                      </a>
                    </>
                  )}
                  {documentSharingEnabled && canManage && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => handleShare(doc)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      {doc.isShareEnabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          disabled={pending}
                          onClick={() => handleDisableShare(doc.id)}
                        >
                          {t("stopShare")}
                        </Button>
                      )}
                    </>
                  )}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => setManaging(doc)}
                      title={t("manage.title")}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ListPagination
        page={safeDocPage}
        totalPages={docTotalPages}
        total={filteredBase.length}
        start={docStart}
        end={docEnd}
        onPageChange={setDocPage}
      />

      {managing && (
        <DocumentManageDialog
          document={managing}
          folders={folders}
          fileManagerEnabled={fileManagerEnabled}
          onClose={() => setManaging(null)}
          onUpdated={handleDocumentUpdated}
          onDeleted={handleDocumentDeleted}
        />
      )}

      {viewer?.fileUrl && (
        <DocumentViewerModal
          title={viewer.title}
          fileUrl={viewer.fileUrl}
          downloadUrl={viewer.downloadUrl}
          mimeType={viewer.mimeType}
          viewKind={viewer.viewKind}
          shareUrl={
            viewer.shareToken
              ? `/api/share/document/${viewer.shareToken}`
              : undefined
          }
          onClose={() => setViewer(null)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}