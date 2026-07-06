"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { QrCode, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ensureMeetingCheckInToken } from "@/actions/check-in";

export function AttendanceQrPanel({ meetingId }: { meetingId: string }) {
  const locale = useLocale();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [checkInUrl, setCheckInUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isFr = locale === "fr";

  useEffect(() => {
    startTransition(async () => {
      const result = await ensureMeetingCheckInToken(meetingId);
      if ("token" in result && result.token) {
        const base = window.location.origin;
        const url = `${base}/${locale}/check-in/${result.token}`;
        setCheckInUrl(url);
        const { default: QRCode } = await import("qrcode");
        const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
        setQrDataUrl(dataUrl);
      }
    });
  }, [meetingId, locale]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
        <QrCode className="h-4 w-4 text-navy" />
        {isFr ? "Émargement QR" : "QR check-in"}
      </h3>
      <p className="text-xs text-gray-500">
        {isFr
          ? "Les membres scannent ce code pour s'enregistrer présents."
          : "Members scan this code to check in as present."}
      </p>
      {pending && !qrDataUrl ? (
        <p className="text-sm text-gray-400">…</p>
      ) : qrDataUrl ? (
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR check-in" className="rounded-lg border" />
          {checkInUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(checkInUrl)}
            >
              <Copy className="h-4 w-4" />
              {isFr ? "Copier le lien" : "Copy link"}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}