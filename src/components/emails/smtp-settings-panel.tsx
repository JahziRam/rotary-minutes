"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { updateClubEmailSettings, testClubSmtp } from "@/actions/club-email-settings";

type SmtpSettings = {
  useCustomSmtp: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpFrom: string;
  smtpFromName: string;
  hasPassword: boolean;
  lastSmtpError?: string | null;
  lastSmtpFallbackAt?: string | null;
};

export function SmtpSettingsPanel({
  initialSettings,
  canManage,
  userEmail,
}: {
  initialSettings: SmtpSettings;
  canManage: boolean;
  userEmail?: string | null;
}) {
  const t = useTranslations("emails.smtp");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({
    ...initialSettings,
    smtpPassword: "",
  });
  const [testEmail, setTestEmail] = useState(userEmail ?? "");

  function save() {
    startTransition(async () => {
      const result = await updateClubEmailSettings({
        useCustomSmtp: form.useCustomSmtp,
        smtpHost: form.smtpHost,
        smtpPort: form.smtpPort,
        smtpSecure: form.smtpSecure,
        smtpUser: form.smtpUser,
        smtpPassword: form.smtpPassword || undefined,
        smtpFrom: form.smtpFrom,
        smtpFromName: form.smtpFromName,
      });
      if ("success" in result && result.success) {
        setToast(t("saved"));
        setForm((f) => ({ ...f, smtpPassword: "" }));
        router.refresh();
      }
    });
  }

  function sendTest() {
    startTransition(async () => {
      const result = await testClubSmtp(testEmail);
      if ("success" in result && result.success) {
        setToast(t("testSent"));
      } else if ("error" in result) {
        setToast(t("testFailed"));
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-navy/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-navy" />
            </div>
            <div>
              <CardTitle className="text-base">{t("title")}</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">{t("description")}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            {t("resendDefault")}
          </p>

          {initialSettings.lastSmtpError && (
            <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="font-medium">{t("fallbackNotice")}</p>
              <p className="mt-1 text-amber-800">{initialSettings.lastSmtpError}</p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.useCustomSmtp}
              disabled={!canManage || pending}
              onChange={(e) => setForm({ ...form, useCustomSmtp: e.target.checked })}
              className="rounded"
            />
            {t("useCustomSmtp")}
          </label>

          {form.useCustomSmtp && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500">{t("host")}</label>
                <input
                  type="text"
                  value={form.smtpHost}
                  disabled={!canManage || pending}
                  onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                  placeholder="smtp.example.com"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t("port")}</label>
                <input
                  type="number"
                  value={form.smtpPort}
                  disabled={!canManage || pending}
                  onChange={(e) =>
                    setForm({ ...form, smtpPort: parseInt(e.target.value, 10) || 587 })
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm pb-2">
                  <input
                    type="checkbox"
                    checked={form.smtpSecure}
                    disabled={!canManage || pending}
                    onChange={(e) => setForm({ ...form, smtpSecure: e.target.checked })}
                    className="rounded"
                  />
                  {t("secure")}
                </label>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t("user")}</label>
                <input
                  type="text"
                  value={form.smtpUser}
                  disabled={!canManage || pending}
                  onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t("password")}</label>
                <input
                  type="password"
                  value={form.smtpPassword}
                  disabled={!canManage || pending}
                  onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
                  placeholder={initialSettings.hasPassword ? t("passwordPlaceholder") : ""}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t("fromEmail")}</label>
                <input
                  type="email"
                  value={form.smtpFrom}
                  disabled={!canManage || pending}
                  onChange={(e) => setForm({ ...form, smtpFrom: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t("fromName")}</label>
                <input
                  type="text"
                  value={form.smtpFromName}
                  disabled={!canManage || pending}
                  onChange={(e) => setForm({ ...form, smtpFromName: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
            </div>
          )}

          {canManage && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="gold" disabled={pending} onClick={save}>
                {t("save")}
              </Button>
              {form.useCustomSmtp && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    disabled={pending}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder={t("testEmail")}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
                  />
                  <Button size="sm" variant="outline" disabled={pending || !testEmail} onClick={sendTest}>
                    <Send className="h-4 w-4 mr-1" />
                    {t("test")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}