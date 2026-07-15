"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Bell, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import {
  generateVapidKeys,
  updateVapidSettings,
} from "@/actions/admin-platform";
import type { VapidAdminView } from "@/lib/vapid-config";

export function VapidConfigPanel({ vapid }: { vapid: VapidAdminView }) {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function save(form: FormData) {
    startTransition(async () => {
      const result = await updateVapidSettings(
        {
          publicKey: (form.get("publicKey") as string) || undefined,
          privateKey: (form.get("privateKey") as string) || undefined,
          subject: (form.get("subject") as string) || undefined,
        },
        locale
      );
      if ("success" in result && result.success) {
        setToast("Configuration VAPID enregistrée");
      }
    });
  }

  function generate() {
    startTransition(async () => {
      const subject = (
        document.getElementById("vapid-subject") as HTMLInputElement | null
      )?.value;
      const result = await generateVapidKeys(subject || undefined, locale);
      if ("success" in result && result.success) {
        setToast("Nouvelles clés VAPID générées et enregistrées");
      } else {
        setToast("Échec de la génération des clés");
      }
    });
  }

  return (
    <div className="space-y-4 mt-8 pt-8 border-t border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-navy" />
            Notifications push (VAPID)
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Clés Web Push pour les rappels de réunion et notifications navigateur.
            Les variables <code className="text-xs">VAPID_*</code> du .env servent de repli.
          </p>
        </div>
        <Badge variant={vapid.configured ? "success" : "muted"}>
          {vapid.configured ? "Configuré" : "Non configuré"}
        </Badge>
      </div>

      {vapid.envFallback && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
          Clés actives depuis les variables d&apos;environnement. Enregistrez des clés ici pour
          les gérer depuis l&apos;admin.
        </p>
      )}

      <form action={save} className="space-y-4 max-w-lg">
        <Input
          id="vapid-subject"
          name="subject"
          label="Sujet VAPID (mailto: ou URL HTTPS)"
          defaultValue={vapid.subject}
          placeholder="mailto:support@votredomaine.com"
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Clé publique</label>
          <input
            name="publicKey"
            placeholder={vapid.publicKeySet ? vapid.publicKeyPreview : "Clé publique VAPID"}
            className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm font-mono"
          />
          {vapid.publicKeySet && (
            <p className="text-xs text-gray-400">Laisser vide pour conserver la clé actuelle</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Clé privée</label>
          <input
            name="privateKey"
            type="password"
            placeholder={vapid.privateKeySet ? "••••••••" : "Clé privée VAPID"}
            className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm font-mono"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="gold" disabled={pending}>
            Enregistrer VAPID
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={generate}>
            <KeyRound className="h-4 w-4" />
            Générer des clés
          </Button>
        </div>
      </form>

      <div className="text-xs text-gray-500 space-y-1 rounded-lg bg-gray-50 p-4">
        <p className="font-medium text-gray-700">Guide rapide</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Cliquez sur « Générer des clés » ou collez des clés existantes.</li>
          <li>
            Définissez le sujet (email de contact ou URL du site, ex.{" "}
            <code>mailto:support@clubminutes.api.mg</code>).
          </li>
          <li>Enregistrez. Les membres pourront activer les notifications depuis Mon compte.</li>
          <li>
            En production, vous pouvez aussi définir{" "}
            <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> pour la clé publique côté client.
          </li>
        </ol>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}