"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { sendComposedEmail } from "@/actions/emails";

type Template = { id: string; name: string; subject: string; body: string };
type Group = { id: string; name: string; _count: { contacts: number } };
type CommissionOption = { id: string; name: string; memberCount: number };

export function ComposeForm({
  templates,
  groups,
  commissions = [],
  canSend,
  emailEnabled,
}: {
  templates: Template[];
  groups: Group[];
  commissions?: CommissionOption[];
  canSend: boolean;
  emailEnabled: boolean;
}) {
  const t = useTranslations("emails");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  if (!canSend) {
    return <p className="text-sm text-gray-500">{t("noPermission")}</p>;
  }

  const applyTemplate = (id: string) => {
    setSelectedTemplate(id);
    const tpl = templates.find((x) => x.id === id);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {!emailEnabled && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            {t("resendDisabled")}
          </CardContent>
        </Card>
      )}

      <form
        action={(fd) => {
          startTransition(async () => {
            const scheduledAt = fd.get("scheduledAt") as string;
            const source = ((fd.get("recipientSource") as string) || "").trim();
            let groupId: string | undefined;
            let commissionId: string | undefined;
            if (source.startsWith("group:")) {
              groupId = source.slice("group:".length) || undefined;
            } else if (source.startsWith("commission:")) {
              commissionId = source.slice("commission:".length) || undefined;
            } else if (source) {
              // Backward-compat: bare group id
              groupId = source;
            }

            const result = await sendComposedEmail({
              name: (fd.get("name") as string) || t("quickSend"),
              subject: fd.get("subject") as string,
              body: fd.get("body") as string,
              groupId,
              commissionId,
              recipients: (fd.get("recipients") as string) || undefined,
              cc: (fd.get("cc") as string) || undefined,
              bcc: (fd.get("bcc") as string) || undefined,
              replyTo: (fd.get("replyTo") as string) || undefined,
              scheduledAt: scheduledAt || undefined,
              templateId: selectedTemplate || undefined,
            });
            if ("error" in result && result.error) {
              setToast({ msg: t(`errors.${result.error}`), type: "error" });
            } else if ("scheduled" in result && result.scheduled) {
              setToast({ msg: t("scheduledSuccess"), type: "success" });
            } else if ("simulated" in result && result.simulated) {
              setToast({ msg: t("simulatedSuccess", { count: "sent" in result ? result.sent ?? 0 : 0 }), type: "success" });
            } else if ("sent" in result) {
              setToast({ msg: t("sendSuccess", { count: result.sent ?? 0 }), type: "success" });
            }
          });
        }}
        className="space-y-4"
      >
        <Input name="name" label={t("campaignName")} placeholder={t("quickSend")} />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">{t("useTemplate")}</label>
          <select
            value={selectedTemplate}
            onChange={(e) => applyTemplate(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm"
          >
            <option value="">—</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">{t("recipientGroup")}</label>
          <select
            name="recipientSource"
            className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm"
          >
            <option value="">—</option>
            {groups.length > 0 ? (
              <optgroup label={t("recipientGroupsCustom")}>
                {groups.map((g) => (
                  <option key={g.id} value={`group:${g.id}`}>
                    {g.name} ({g._count.contacts})
                  </option>
                ))}
              </optgroup>
            ) : null}
            {commissions.length > 0 ? (
              <optgroup label={t("recipientGroupsCommissions")}>
                {commissions.map((c) => (
                  <option key={c.id} value={`commission:${c.id}`}>
                    {c.name} ({c.memberCount})
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
          <p className="text-xs text-gray-500">{t("recipientGroupHint")}</p>
        </div>

        <Input
          name="recipients"
          label={t("recipientsManual")}
          placeholder="email1@exemple.fr, email2@exemple.fr"
        />

        <Input name="subject" label={t("subject")} value={subject} onChange={(e) => setSubject(e.target.value)} required />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">{t("body")}</label>
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={10}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input name="cc" label={t("cc")} placeholder="cc@exemple.fr" />
          <Input name="bcc" label={t("bcc")} placeholder="bcc@exemple.fr" />
        </div>
        <Input name="replyTo" type="email" label={t("replyTo")} />

        <Input name="scheduledAt" type="datetime-local" label={t("schedule")} />

        <div className="flex gap-2">
          <Button type="submit" variant="gold" disabled={pending}>
            <Send className="h-4 w-4 mr-1" />
            {pending ? tCommon("loading") : t("sendNow")}
          </Button>
        </div>
      </form>

      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}