"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { saveEmailTemplate, deleteEmailTemplate } from "@/actions/emails";

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  isSystem: boolean;
  slug: string;
};

export function TemplatesPanel({
  templates,
  canSend,
}: {
  templates: Template[];
  canSend: boolean;
}) {
  const t = useTranslations("emails");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);

  if (!canSend) {
    return <p className="text-sm text-gray-500">{t("noPermission")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{t("templatesHint")}</p>
        <Button variant="gold" size="sm" onClick={() => { setCreating(true); setEditing(null); }}>
          <Plus className="h-4 w-4 mr-1" />
          {t("addTemplate")}
        </Button>
      </div>

      {(creating || editing) && (
        <Card>
          <CardContent className="p-4">
            <TemplateForm
              initial={editing ?? undefined}
              pending={pending}
              onCancel={() => { setCreating(false); setEditing(null); }}
              onSave={(data) =>
                startTransition(async () => {
                  await saveEmailTemplate(data);
                  setCreating(false);
                  setEditing(null);
                })
              }
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {templates.map((tpl) => (
          <Card key={tpl.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{tpl.name}</h3>
                  {tpl.isSystem && <Badge variant="gold">{t("system")}</Badge>}
                </div>
                <p className="text-sm text-gray-600 mt-1 truncate">{tpl.subject}</p>
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{tpl.body.replace(/<[^>]+>/g, "")}</p>
              </div>
              {!tpl.isSystem && (
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(tpl); setCreating(false); }}>
                    {tCommon("edit")}
                  </Button>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-red-600 p-2"
                    onClick={() => startTransition(() => { void deleteEmailTemplate(tpl.id); })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TemplateForm({
  initial,
  pending,
  onCancel,
  onSave,
}: {
  initial?: Template;
  pending: boolean;
  onCancel: () => void;
  onSave: (data: { id?: string; name: string; subject: string; body: string }) => void;
}) {
  const t = useTranslations("emails");
  const tCommon = useTranslations("common");

  return (
    <form
      action={(fd) =>
        onSave({
          id: initial?.id,
          name: fd.get("name") as string,
          subject: fd.get("subject") as string,
          body: fd.get("body") as string,
        })
      }
      className="space-y-3"
    >
      <Input name="name" label={t("templateName")} defaultValue={initial?.name} required />
      <Input name="subject" label={t("subject")} defaultValue={initial?.subject} required />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">{t("body")}</label>
        <textarea
          name="body"
          defaultValue={initial?.body}
          required
          rows={8}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
        />
        <p className="text-xs text-gray-400">{t("variablesHint")}</p>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>{tCommon("cancel")}</Button>
        <Button type="submit" variant="gold" disabled={pending}>{tCommon("save")}</Button>
      </div>
    </form>
  );
}