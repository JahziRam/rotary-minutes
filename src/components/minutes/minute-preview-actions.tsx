"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Download, Mail, Users, Copy, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import {
  duplicateMinute,
  archiveMinute,
  sendMinuteByEmail,
  sendMinuteToAllMembers,
} from "@/actions/minutes";
import { MinuteNewsletterButton } from "./minute-newsletter-button";

export function MinutePreviewActions({
  minuteId,
  status,
  pdfEnabled = true,
  pdfVisible = true,
  emailsEnabled = true,
  emailsVisible = true,
  memberEmailCount = 0,
}: {
  minuteId: string;
  status?: string;
  pdfEnabled?: boolean;
  pdfVisible?: boolean;
  emailsEnabled?: boolean;
  emailsVisible?: boolean;
  memberEmailCount?: number;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const btnClass =
    "flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50";

  return (
    <>
      <div className="space-y-2">
        {pdfVisible &&
          (pdfEnabled ? (
            <a href={`/api/pdf/${minuteId}?download=1`} className={btnClass}>
              <Download className="h-4 w-4 text-gray-500" />
              {locale === "fr" ? "Télécharger le PDF" : "Download PDF"}
            </a>
          ) : (
            <Link
              href={`/${locale}/settings/subscription`}
              className={`${btnClass} text-amber-700 border-amber-200 bg-amber-50`}
            >
              <Download className="h-4 w-4" />
              {locale === "fr" ? "PDF — changer d'offre" : "PDF — upgrade plan"}
            </Link>
          ))}

        {!emailsVisible ? null : !emailsEnabled ? (
          <Link
            href={`/${locale}/settings/subscription`}
            className={`${btnClass} text-amber-700 border-amber-200 bg-amber-50`}
          >
            <Mail className="h-4 w-4" />
            {locale === "fr" ? "Email — changer d'offre" : "Email — upgrade plan"}
          </Link>
        ) : !showEmail ? (
          <>
            <button
              type="button"
              className={btnClass}
              onClick={() => setShowEmail(true)}
            >
              <Mail className="h-4 w-4 text-gray-500" />
              {locale === "fr" ? "Envoyer par email" : "Send by email"}
            </button>
            {memberEmailCount > 0 && (
              <button
                type="button"
                className={btnClass}
                disabled={pending}
                onClick={() => {
                  const msg =
                    locale === "fr"
                      ? `Envoyer le PV (PDF joint) à ${memberEmailCount} membre(s) actif(s) ?`
                      : `Send minutes (PDF attached) to ${memberEmailCount} active member(s)?`;
                  if (!window.confirm(msg)) return;
                  startTransition(async () => {
                    const result = await sendMinuteToAllMembers(minuteId, locale);
                    if (result.error === "NO_MEMBER_EMAILS") {
                      setToast({
                        message:
                          locale === "fr"
                            ? "Aucun membre avec email"
                            : "No members with email",
                        type: "error",
                      });
                    } else if (result.error) {
                      setToast({
                        message:
                          locale === "fr"
                            ? "Envoi impossible"
                            : "Could not send",
                        type: "error",
                      });
                    } else {
                      setToast({
                        message: result.message ?? "Envoyé",
                        type: "success",
                      });
                      router.refresh();
                    }
                  });
                }}
              >
                <Users className="h-4 w-4 text-gray-500" />
                {locale === "fr"
                  ? `Envoyer à tous les membres (${memberEmailCount})`
                  : `Send to all members (${memberEmailCount})`}
              </button>
            )}
          </>
        ) : (
          <div className="space-y-2 p-3 rounded-xl border border-gray-200 bg-gray-50">
            <Input
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="gold"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await sendMinuteByEmail(minuteId, email, locale);
                    if (result.error) {
                      setToast({ message: "Email invalide", type: "error" });
                    } else {
                      setToast({ message: result.message ?? "Envoyé", type: "success" });
                      setShowEmail(false);
                      setEmail("");
                      router.refresh();
                    }
                  })
                }
              >
                Envoyer
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowEmail(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        {status === "FINALIZED" && emailsEnabled && emailsVisible && (
          <MinuteNewsletterButton minuteId={minuteId} />
        )}

        <button
          type="button"
          className={btnClass}
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void duplicateMinute(minuteId, locale);
            })
          }
        >
          <Copy className="h-4 w-4 text-gray-500" />
          Dupliquer
        </button>

        <button
          type="button"
          className={btnClass}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await archiveMinute(minuteId, locale);
              if (result.success) {
                setToast({ message: "PV archivé", type: "success" });
                router.push(`/${locale}/minutes`);
                router.refresh();
              }
            })
          }
        >
          <Archive className="h-4 w-4 text-gray-500" />
          Archiver
        </button>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}