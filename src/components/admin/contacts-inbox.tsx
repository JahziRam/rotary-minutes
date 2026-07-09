"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { format } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { updateContactSubmissionStatus } from "@/actions/admin-contacts";
import type { ContactSubmissionStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  name: string;
  email: string;
  clubName: string | null;
  topic: string;
  message: string;
  locale: string;
  status: ContactSubmissionStatus;
  emailSent: boolean;
  createdAt: string;
};

export function ContactsInbox({ items }: { items: Item[] }) {
  const locale = useLocale();
  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;
  const [selected, setSelected] = useState<string | null>(items[0]?.id ?? null);
  const [pending, startTransition] = useTransition();

  const active = items.find((i) => i.id === selected);

  function setStatus(id: string, status: ContactSubmissionStatus) {
    startTransition(async () => {
      await updateContactSubmissionStatus(id, status, locale);
    });
  }

  if (items.length === 0) {
    return <p className="text-gray-500 text-sm">Aucun message pour le moment.</p>;
  }

  return (
    <div className="grid lg:grid-cols-5 gap-4 min-h-[420px]">
      <ul className="lg:col-span-2 space-y-1 max-h-[520px] overflow-y-auto">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => {
                setSelected(item.id);
                if (item.status === "NEW") setStatus(item.id, "READ");
              }}
              className={cn(
                "w-full text-left rounded-lg border px-3 py-2.5 transition-colors",
                selected === item.id
                  ? "border-navy bg-navy/5"
                  : "border-gray-200 hover:bg-gray-50",
                item.status === "NEW" && "border-l-4 border-l-gold"
              )}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium text-sm text-gray-900 truncate">{item.name}</span>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {format(new Date(item.createdAt), "d MMM", { locale: dateLocale })}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">{item.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.topic}</p>
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold text-gray-900">{active.name}</h2>
              <a href={`mailto:${active.email}`} className="text-sm text-navy hover:underline">
                {active.email}
              </a>
            </div>
            <span className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-600 uppercase">
              {active.status}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-gray-400 text-xs">Club</dt>
              <dd>{active.clubName || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">Sujet</dt>
              <dd>{active.topic}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">Langue</dt>
              <dd>{active.locale}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">Email envoyé</dt>
              <dd>{active.emailSent ? "Oui" : "Non"}</dd>
            </div>
          </dl>
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {active.message}
          </div>
          <div className="flex gap-2">
            {active.status !== "ARCHIVED" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setStatus(active.id, "ARCHIVED")}
              >
                Archiver
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}