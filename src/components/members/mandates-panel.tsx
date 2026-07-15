"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertOfficerMandate, deleteOfficerMandate } from "@/actions/mandates";
import type { ClubRole } from "@/generated/prisma/client";

const OFFICER_ROLES: ClubRole[] = [
  "PRESIDENT",
  "VICE_PRESIDENT",
  "SECRETARY",
  "TREASURER",
  "MEMBERSHIP_CHAIR",
  "COMMISSION_CHAIR",
  "PUBLIC_IMAGE_CHAIR",
];

export function MandatesPanel({
  mandates,
  canManage,
}: {
  mandates: Array<{
    id: string;
    role: ClubRole;
    holderName: string;
    startDate: Date;
    endDate: Date;
    member?: { firstName: string; lastName: string } | null;
  }>;
  canManage: boolean;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isFr = locale === "fr";

  if (!canManage && mandates.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">
        {isFr ? "Mandat en cours" : "Current mandate"}
      </h3>
      {mandates.length === 0 ? (
        <p className="text-sm text-gray-500">
          {isFr ? "Aucun poste enregistré." : "No officers recorded."}
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {mandates.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2">
              <span>
                <strong>{m.role}</strong> — {m.holderName}
              </span>
              {canManage && (
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteOfficerMandate(m.id);
                      router.refresh();
                    })
                  }
                >
                  {isFr ? "Supprimer" : "Remove"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <form
          className="grid sm:grid-cols-2 gap-2 pt-2 border-t"
          action={(fd) => {
            startTransition(async () => {
              await upsertOfficerMandate({
                role: fd.get("role") as ClubRole,
                holderName: fd.get("holderName") as string,
                startDate: fd.get("startDate") as string,
                endDate: fd.get("endDate") as string,
              });
              router.refresh();
            });
          }}
        >
          <select name="role" className="h-10 rounded-lg border border-gray-200 px-3 text-sm" required>
            {OFFICER_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <Input name="holderName" placeholder={isFr ? "Nom du titulaire" : "Officer name"} required />
          <Input name="startDate" type="date" required />
          <Input name="endDate" type="date" required />
          <Button type="submit" variant="outline" size="sm" disabled={pending} className="sm:col-span-2">
            {isFr ? "Ajouter un poste" : "Add officer"}
          </Button>
        </form>
      )}
    </div>
  );
}