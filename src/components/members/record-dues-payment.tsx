"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { markDuesPaid } from "@/actions/dues";
import type { PaymentMethod } from "@/generated/prisma/client";

export function RecordDuesPayment({
  duesId,
  remaining,
  currency,
  paymentMethod,
  locale,
  compact = false,
  onToast,
}: {
  duesId: string;
  remaining: number;
  currency: string;
  paymentMethod: PaymentMethod;
  locale: string;
  compact?: boolean;
  onToast: (message: string) => void;
}) {
  const t = useTranslations("dues");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(remaining.toFixed(2));

  function submit() {
    const parsed = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      onToast(t("invalidAmount"));
      return;
    }

    startTransition(async () => {
      const result = await markDuesPaid(
        duesId,
        { amount: parsed, paymentMethod },
        locale
      );
      if ("error" in result && result.error) {
        if (result.error === "ALREADY_PAID") onToast(t("alreadyPaid"));
        else if (result.error === "AMOUNT_EXCEEDS_REMAINING") onToast(t("amountExceedsRemaining"));
        else if (result.error === "INVALID_AMOUNT") onToast(t("invalidAmount"));
        return;
      }
      if ("success" in result && result.success) {
        onToast(
          result.partial ? t("partialPaymentRecorded") : t("markedPaid")
        );
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant={compact ? "ghost" : "outline"}
        className={compact ? "h-6 text-[10px] px-2" : "h-7 text-xs"}
        disabled={pending || remaining <= 0}
        data-assist={compact ? undefined : "dues-record-payment"}
        onClick={() => {
          setAmount(remaining.toFixed(2));
          setOpen(true);
        }}
      >
        <CheckCircle className={compact ? "h-3 w-3 mr-0.5" : "h-3 w-3 mr-1"} />
        {t("recordPayment")}
      </Button>
    );
  }

  return (
    <div
      className={
        compact
          ? "inline-flex items-center gap-1"
          : "inline-flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-2"
      }
    >
      <div className={compact ? "w-20" : "w-28"}>
        <Input
          type="number"
          min={0.01}
          max={remaining}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          label={compact ? undefined : t("paymentAmount")}
          className="h-7 text-xs"
        />
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="gold"
          className="h-7 text-xs px-2"
          disabled={pending}
          onClick={submit}
        >
          {t("confirmPayment")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}