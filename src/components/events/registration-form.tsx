"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { registerForEvent } from "@/actions/events";
import type { PaymentMethod } from "@/generated/prisma/client";

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CHECK", "STRIPE", "MOBILE_MONEY"];

export function RegistrationForm({
  eventId,
  requiresPayment,
  price,
  currency,
  myMemberId,
  locale,
}: {
  eventId: string;
  requiresPayment: boolean;
  price: number | null;
  currency: string;
  myMemberId: string | null;
  locale: string;
}) {
  const t = useTranslations("events");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(!myMemberId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await registerForEvent(eventId, {
        memberId: myMemberId ?? undefined,
        guestName: isGuest ? (fd.get("guestName") as string) : undefined,
        email: (fd.get("email") as string) || undefined,
        paymentMethod: requiresPayment ? (fd.get("paymentMethod") as PaymentMethod) : undefined,
        amount: price ?? undefined,
        notes: (fd.get("notes") as string) || undefined,
      });
      if ("success" in result && result.success) {
        setToast("waitlisted" in result && result.waitlisted ? t("waitlisted") : t("registered"));
        router.refresh();
      } else if ("error" in result && result.error === "ALREADY_REGISTERED") {
        setToast(t("alreadyRegistered"));
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
        </>
      )}
      {requiresPayment && price != null && (
        <>
          <p className="text-sm font-medium text-navy">
            {t("amountDue")}: {price.toFixed(2)} {currency}
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
        </>
      )}
      <Input name="notes" label={t("notes")} />
      <Button type="submit" disabled={pending}>
        {t("register")}
      </Button>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </form>
  );
}