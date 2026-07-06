"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import {
  createApiKey,
  revokeApiKey,
  createWebhook,
  deleteWebhook,
  testWebhook,
} from "@/actions/integrations";
import {
  exportTreasuryCsv,
  exportTreasuryOfx,
  syncEmailContacts,
} from "@/actions/accounting-export";
import { CLUB_WEBHOOK_EVENTS } from "@/lib/webhook-events";
import type { ApiKeyScope, WebhookEvent } from "@/generated/prisma/client";

type ApiKeyView = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
};

type WebhookView = {
  id: string;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  createdAt: Date;
  deliveryCount: number;
};

const ALL_SCOPES: ApiKeyScope[] = [
  "READ_MINUTES",
  "READ_MEETINGS",
  "READ_MEMBERS",
];

const ALL_EVENTS: WebhookEvent[] = CLUB_WEBHOOK_EVENTS;

export function IntegrationsPanel({
  apiKeys,
  webhooks,
  baseUrl,
}: {
  apiKeys: ApiKeyView[];
  webhooks: WebhookView[];
  baseUrl: string;
}) {
  const t = useTranslations("integrations");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState<ApiKeyScope[]>([
    "READ_MINUTES",
    "READ_MEETINGS",
  ]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([
    "MINUTE_FINALIZED",
  ]);

  function toggleScope(scope: ApiKeyScope) {
    setKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  function toggleEvent(event: WebhookEvent) {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  function handleCreateKey() {
    startTransition(async () => {
      const result = await createApiKey(
        { name: keyName, scopes: keyScopes },
        locale
      );
      if ("rawKey" in result && result.rawKey) {
        setNewKeyRaw(result.rawKey);
        setKeyName("");
        setToast(t("apiKey.created"));
      } else {
        setToast(t("apiKey.error"));
      }
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokeApiKey(id, locale);
      setToast(t("apiKey.revoked"));
    });
  }

  function handleCreateWebhook() {
    startTransition(async () => {
      const result = await createWebhook(
        { url: webhookUrl, events: webhookEvents },
        locale
      );
      if ("secret" in result && result.secret) {
        setNewWebhookSecret(result.secret);
        setWebhookUrl("");
        setToast(t("webhooks.created"));
      } else {
        setToast(t("webhooks.error"));
      }
    });
  }

  function handleDeleteWebhook(id: string) {
    startTransition(async () => {
      await deleteWebhook(id, locale);
      setToast(t("webhooks.deleted"));
    });
  }

  function handleTestWebhook(id: string) {
    startTransition(async () => {
      await testWebhook(id, locale);
      setToast(t("webhooks.testSent"));
    });
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <p>{t("docsIntro")}</p>
        <p className="mt-2 font-mono text-xs break-all">
          {baseUrl}/api/v1/openapi
        </p>
      </div>

      {newKeyRaw && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-medium text-amber-900">{t("apiKey.copyOnce")}</p>
          <code className="block text-xs break-all bg-white p-2 rounded border">
            {newKeyRaw}
          </code>
          <Button type="button" size="sm" variant="outline" onClick={() => setNewKeyRaw(null)}>
            {t("apiKey.dismiss")}
          </Button>
        </div>
      )}

      <section className="space-y-4">
        <h3 className="font-semibold text-gray-900">{t("apiKey.title")}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label={t("apiKey.name")}
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {ALL_SCOPES.map((scope) => (
            <label key={scope} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={keyScopes.includes(scope)}
                onChange={() => toggleScope(scope)}
              />
              {t(`scopes.${scope}`)}
            </label>
          ))}
        </div>
        <Button
          type="button"
          variant="gold"
          size="sm"
          disabled={pending || !keyName.trim()}
          onClick={handleCreateKey}
        >
          {t("apiKey.create")}
        </Button>

        {apiKeys.length > 0 && (
          <div className="space-y-2">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{key.keyPrefix}…</p>
                  <p className="text-xs text-gray-400">
                    {key.scopes.map((s) => t(`scopes.${s}`)).join(", ")}
                    {!key.isActive && ` · ${t("apiKey.revokedLabel")}`}
                  </p>
                </div>
                {key.isActive && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => handleRevoke(key.id)}
                  >
                    {t("apiKey.revoke")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {newWebhookSecret && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-medium text-amber-900">{t("webhooks.secretOnce")}</p>
          <code className="block text-xs break-all bg-white p-2 rounded border">
            {newWebhookSecret}
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setNewWebhookSecret(null)}
          >
            {t("webhooks.dismiss")}
          </Button>
        </div>
      )}

      <section className="space-y-4">
        <h3 className="font-semibold text-gray-900">{t("accounting.title")}</h3>
        <p className="text-sm text-gray-600">{t("accounting.description")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await exportTreasuryCsv({ locale });
                if ("content" in result && result.content) {
                  const blob = new Blob([result.content], { type: result.mimeType });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = result.filename;
                  a.click();
                  URL.revokeObjectURL(url);
                  setToast(t("accounting.csvDownloaded"));
                }
              })
            }
          >
            {t("accounting.exportCsv")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await exportTreasuryOfx();
                if ("content" in result && result.content) {
                  const blob = new Blob([result.content], { type: result.mimeType });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = result.filename;
                  a.click();
                  URL.revokeObjectURL(url);
                  setToast(t("accounting.ofxDownloaded"));
                }
              })
            }
          >
            {t("accounting.exportOfx")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await syncEmailContacts();
                if ("synced" in result) {
                  setToast(t("accounting.contactsSynced", { count: result.synced }));
                }
              })
            }
          >
            {t("accounting.syncContacts")}
          </Button>
        </div>
        <p className="text-xs text-gray-500">{t("accounting.paymentMethodsHint")}</p>
      </section>

      <section className="space-y-4">
        <h3 className="font-semibold text-gray-900">{t("webhooks.title")}</h3>
        <Input
          label={t("webhooks.url")}
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://example.com/webhooks/rotary"
        />
        <div className="flex flex-wrap gap-3 text-sm">
          {ALL_EVENTS.map((event) => (
            <label key={event} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={webhookEvents.includes(event)}
                onChange={() => toggleEvent(event)}
              />
              {t(`events.${event}`)}
            </label>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || !webhookUrl.trim()}
          onClick={handleCreateWebhook}
        >
          {t("webhooks.create")}
        </Button>

        {webhooks.length > 0 && (
          <div className="space-y-2">
            {webhooks.map((hook) => (
              <div
                key={hook.id}
                className="rounded-lg border border-gray-200 bg-white p-3 text-sm space-y-2"
              >
                <p className="font-mono text-xs break-all">{hook.url}</p>
                <p className="text-xs text-gray-500">
                  {hook.events.map((e) => t(`events.${e}`)).join(", ")} ·{" "}
                  {t("webhooks.deliveries", { count: hook.deliveryCount })}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => handleTestWebhook(hook.id)}
                  >
                    {t("webhooks.test")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => handleDeleteWebhook(hook.id)}
                  >
                    {t("webhooks.delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}