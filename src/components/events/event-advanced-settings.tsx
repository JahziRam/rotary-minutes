"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { saveEventPriceTiers, saveEventTicketSlots } from "@/actions/events";

type PriceTier = { id: string; label: string; price: number; sortOrder: number; maxQty: number | null };
type TicketSlot = {
  id: string;
  ticketNumber: string;
  label: string | null;
  isReserved: boolean;
  registrationId: string | null;
};

export function EventAdvancedSettings({
  eventId,
  priceTiers: initialTiers,
  ticketSlots: initialSlots,
  currency,
}: {
  eventId: string;
  priceTiers: PriceTier[];
  ticketSlots: TicketSlot[];
  currency: string;
}) {
  const t = useTranslations("events");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [tiers, setTiers] = useState(
    initialTiers.length > 0
      ? initialTiers.map((t) => ({ label: t.label, price: String(t.price), maxQty: t.maxQty ? String(t.maxQty) : "" }))
      : [{ label: "", price: "", maxQty: "" }]
  );
  const [ticketInput, setTicketInput] = useState("");
  const [ticketLabel, setTicketLabel] = useState("");

  function saveTiers() {
    startTransition(async () => {
      const payload = tiers
        .filter((t) => t.label.trim() && t.price)
        .map((t, i) => ({
          label: t.label,
          price: parseFloat(t.price),
          sortOrder: i,
          maxQty: t.maxQty ? parseInt(t.maxQty, 10) : null,
        }));
      const result = await saveEventPriceTiers(eventId, payload);
      if ("success" in result && result.success) {
        setToast(t("tiersSaved"));
        router.refresh();
      }
    });
  }

  function saveTickets() {
    const numbers = ticketInput
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (numbers.length === 0) return;
    startTransition(async () => {
      const newSlots = numbers.map((n) => ({ ticketNumber: n, label: ticketLabel || undefined }));
      const result = await saveEventTicketSlots(eventId, newSlots);
      if ("success" in result && result.success) {
        setToast(t("ticketsSaved"));
        setTicketInput("");
        setTicketLabel("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("priceTiersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <Input
                label={t("tierLabel")}
                value={tier.label}
                onChange={(e) => {
                  const next = [...tiers];
                  next[i] = { ...next[i], label: e.target.value };
                  setTiers(next);
                }}
              />
              <Input
                label={`${t("price")} (${currency})`}
                type="number"
                step="0.01"
                value={tier.price}
                onChange={(e) => {
                  const next = [...tiers];
                  next[i] = { ...next[i], price: e.target.value };
                  setTiers(next);
                }}
              />
              <Input
                label={t("tierMaxQty")}
                type="number"
                value={tier.maxQty}
                onChange={(e) => {
                  const next = [...tiers];
                  next[i] = { ...next[i], maxQty: e.target.value };
                  setTiers(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500"
                onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTiers([...tiers, { label: "", price: "", maxQty: "" }])}
            >
              <Plus className="h-4 w-4" />
              {t("addTier")}
            </Button>
            <Button type="button" size="sm" variant="gold" disabled={pending} onClick={saveTiers}>
              {t("saveTiers")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ticketNumbersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {initialSlots.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {initialSlots.map((s) => (
                <span
                  key={s.id}
                  className={`text-xs px-2 py-0.5 rounded border ${
                    s.isReserved ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-white border-navy/20 text-navy"
                  }`}
                >
                  {s.ticketNumber}
                  {s.isReserved ? ` (${t("reserved")})` : ""}
                </span>
              ))}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{t("ticketNumbersInput")}</label>
            <textarea
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              placeholder="A1, A2, A3 ou un numéro par ligne"
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <Input
            label={t("ticketLabelOptional")}
            value={ticketLabel}
            onChange={(e) => setTicketLabel(e.target.value)}
          />
          <Button type="button" size="sm" variant="gold" disabled={pending || !ticketInput.trim()} onClick={saveTickets}>
            {t("saveTickets")}
          </Button>
        </CardContent>
      </Card>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}