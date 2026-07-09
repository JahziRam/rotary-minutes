"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Newspaper } from "lucide-react";
import { Toast } from "@/components/ui/toast";
import { createNewsletterFromMinute } from "@/actions/newsletter-minute";

export function MinuteNewsletterButton({ minuteId }: { minuteId: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );
  const isFr = locale === "fr";

  const btnClass =
    "flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        className={btnClass}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await createNewsletterFromMinute(minuteId, locale);
            if ("error" in result && result.error) {
              setToast({
                message: isFr ? "Impossible de créer la newsletter" : "Could not create newsletter",
                type: "error",
              });
              return;
            }
            if ("success" in result && result.success) {
              setToast({
                message: result.message ?? (isFr ? "Campagne créée" : "Campaign created"),
                type: "success",
              });
              router.push(`/${locale}/emails`);
              router.refresh();
            }
          })
        }
      >
        <Newspaper className="h-4 w-4 text-gray-500" />
        {isFr ? "Créer une newsletter" : "Create newsletter"}
      </button>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
}