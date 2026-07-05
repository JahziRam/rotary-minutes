"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Gift, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReferralPanel({
  referralCode,
  referralLink,
  referralsCount,
  rewardsEarned,
}: {
  referralCode: string;
  referralLink: string;
  referralsCount: number;
  rewardsEarned: number;
}) {
  const t = useTranslations("subscription");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(value: string, kind: "code" | "link") {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-gold/20 flex items-center justify-center shrink-0">
          <Gift className="h-5 w-5 text-navy" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{t("referral.title")}</h3>
          <p className="text-sm text-gray-500 mt-1">{t("referral.description")}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-gray-500">{t("referral.referrals")}</p>
          <p className="text-lg font-semibold text-navy">{referralsCount}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-gray-500">{t("referral.rewards")}</p>
          <p className="text-lg font-semibold text-navy">{rewardsEarned}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t("referral.codeLabel")}
        </p>
        <div className="flex gap-2">
          <code className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-navy">
            {referralCode}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copy(referralCode, "code")}
            className="shrink-0"
          >
            {copied === "code" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t("referral.linkLabel")}
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={referralLink}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 truncate"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copy(referralLink, "link")}
            className="shrink-0"
          >
            {copied === "link" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}