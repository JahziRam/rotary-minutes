"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Search, Upload, Archive, FileText, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { searchDocuments, uploadDocumentFile, archiveDocument } from "@/actions/documents";
import type { DocumentCategory } from "@/generated/prisma/client";

type DocumentRow = {
  id: string;
  title: string;
  category: DocumentCategory;
  description: string | null;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  minuteId: string | null;
  isArchived: boolean;
  tags: string[];
  createdAt: string;
  uploadedByName: string | null;
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
  canManage,
  locale,
}: {
  documents: DocumentRow[];
  canManage: boolean;
  locale: string;
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [documents, setDocuments] = useState(initialDocs);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [showUpload, setShowUpload] = useState(false);
  const dateLocale = locale === "fr" ? fr : enUS;

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
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await uploadDocumentFile(fd);
      if ("success" in result && result.success) {
        setToast(t("uploaded"));
        setShowUpload(false);
        router.refresh();
      } else if ("error" in result && result.error === "TOO_LARGE") {
        setToast(t("fileTooLarge"));
      } else if ("error" in result && result.error === "INVALID_TYPE") {
        setToast(t("invalidType"));
      } else {
        setToast(t("uploadError"));
      }
    });
  }

  function handleArchive(documentId: string) {
    startTransition(async () => {
      const result = await archiveDocument(documentId);
      if ("success" in result && result.success) {
        setToast(t("archived"));
        setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      }
    });
  }

  const filtered = category
    ? documents.filter((d) => d.category === category)
    : documents;

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

      {showUpload && canManage && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleUpload} className="grid sm:grid-cols-2 gap-4">
              <Input name="title" label={t("docTitle")} required />
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
                <label className="text-sm font-medium text-gray-700">{t("file")}</label>
                <input
                  type="file"
                  name="file"
                  required
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
                  className="flex w-full text-sm"
                />
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

      {filtered.length === 0 ? (
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
                    <a
                      href={doc.fileUrl.startsWith("data:") ? doc.fileUrl : doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.fileName ?? undefined}
                      className="text-sm text-navy hover:underline"
                    >
                      {t("download")}
                    </a>
                  )}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => handleArchive(doc.id)}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}