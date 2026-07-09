"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { registerForEvent } from "@/actions/events";
import type { PaymentMethod, TreasuryCollectionStatus } from "@/generated/prisma/client";

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CHECK", "STRIPE", "MOBILE_MONEY", "BANK_TRANSFER"];

type PriceTier = { id: string; label: string; price: number };
type TicketSlot = { id: string; ticketNumber: string; label: string | null; isReserved: boolean };

export function RegistrationForm({
  eventId,
  requiresPayment,
  price,
  currency,
  myMemberId,
  locale,
  eventsAdvanced = false,
  priceTiers = [],
  ticketSlots = [],
}: {
  eventId: string;
  requiresPayment: boolean;
  price: number | null;
  currency: string;
  myMemberId: string | null;
  locale: string;
  eventsAdvanced?: boolean;
  priceTiers?: PriceTier[];
  ticketSlots?: TicketSlot[];
}) {
  const t = useTranslations("events");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(!myMemberId);
  const [quantity, setQuantity] = useState(1);
  const [priceTierId, setPriceTierId] = useState(priceTiers[0]?.id ?? "");
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

  const availableTickets = useMemo(
    () => ticketSlots.filter((s) => !s.isReserved),
    [ticketSlots]
  );

  const unitPrice = useMemo(() => {
    if (priceTierId) {
      const tier = priceTiers.find((t) => t.id === priceTierId);
      return tier?.price ?? price ?? 0;
    }
    return price ?? 0;
  }, [priceTierId, priceTiers, price]);

  const totalAmount = unitPrice * quantity;

  function toggleTicket(id: string) {
    setSelectedTickets((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= quantity) return prev;
      return [...prev, id];
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await registerForEvent(eventId, {
        memberId: myMemberId ?? undefined,
        guestName: isGuest ? (fd.get("guestName") as string) : undefined,
        email: (fd.get("email") as string) || undefined,
        phone: (fd.get("phone") as string) || undefined,
        quantity: eventsAdvanced ? quantity : 1,
        priceTierId: eventsAdvanced && priceTierId ? priceTierId : undefined,
        ticketSlotIds: eventsAdvanced && selectedTickets.length > 0 ? selectedTickets : undefined,
        paymentMethod: requiresPayment ? (fd.get("paymentMethod") as PaymentMethod) : undefined,
        amount: requiresPayment ? unitPrice : undefined,
        notes: (fd.get("notes") as string) || undefined,
        collectionStatus:
          requiresPayment && fd.get("collectionStatus") === "RECEIVABLE"
            ? ("RECEIVABLE" as TreasuryCollectionStatus)
            : undefined,
      });
      if ("success" in result && result.success) {
        setToast("waitlisted" in result && result.waitlisted ? t("waitlisted") : t("registered"));
        router.refresh();
      } else if ("error" in result && result.error === "ALREADY_REGISTERED") {
        setToast(t("alreadyRegistered"));
      } else if ("error" in result && result.error === "TICKET_UNAVAILABLE") {
        setToast(t("ticketUnavailable"));
      } else {
        setToast(t("registerError"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!myMemberId && (
        <>
          <Input name="guestName" label={t("guestName")} required />
          <Input name="email" type="email" label={t("email")} />
          <Input name="phone" type="tel" label={t("phone")} />
        </>
      )}
      {myMemberId && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isGuest}
            onChange={(e) => setIsGuest(e.target.checked)}
            className="rounded"
          />
          {t("registerAsGuest")}
        </label>
      )}
      {isGuest && myMemberId && (
        <>
          <Input name="guestName" label={t("guestName")} required />
          <Input name="email" type="email" label={t("email")} />
          <Input name="phone" type="tel" label={t("phone")} />
        </>
      )}
      {myMemberId && !isGuest && (
        <Input name="phone" type="tel" label={t("phone")} />
      )}

      {eventsAdvanced && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">{t("ticketQuantity")}</label>
          <input
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(e) => {
              const q = Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1));
              setQuantity(q);
              setSelectedTickets((prev) => prev.slice(0, q));
            }}
            className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      )}

      {eventsAdvanced && priceTiers.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">{t("priceTier")}</label>
          <select
            value={priceTierId}
            onChange={(e) => setPriceTierId(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {priceTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.label} — {tier.price.toFixed(2)} {currency}
              </option>
            ))}
          </select>
        </div>
      )}

      {eventsAdvanced && availableTickets.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            {t("selectTickets")} ({selectedTickets.length}/{quantity})
          </label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {availableTickets.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => toggleTicket(slot.id)}
                className={`px-2.5 py-1 rounded-md text-xs border ${
                  selectedTickets.includes(slot.id)
                    ? "bg-navy text-white border-navy"
                    : "bg-white text-gray-700 border-gray-200 hover:border-navy/40"
                }`}
              >
                {slot.ticketNumber}
                {slot.label ? ` (${slot.label})` : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {requiresPayment && (unitPrice > 0 || price != null) && (
        <>
          <p className="text-sm font-medium text-navy">
            {t("amountDue")}: {totalAmount.toFixed(2)} {currency}
            {quantity > 1 && ` (${quantity} × ${unitPrice.toFixed(2)})`}
          </p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{t("paymentMethod")}</label>
            <select
              name="paymentMethod"
              required
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">{t("selectPayment")}</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`paymentMethods.${m}`)}
                </option>
              ))}
            </select>
          </div>
          {eventsAdvanced && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="collectionStatus" value="RECEIVABLE" className="rounded" />
              {t("markReceivable")}
            </label>
          )}
        </>
      )}
      <Input name="notes" label={t("notes")} />
      <Button type="submit" disabled={pending}>
        {quantity > 1 ? t("registerMultiple", { count: quantity }) : t("register")}
      </Button>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </form>
  );
}