"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { sendAnnouncement } from "@/actions/admin-platform";
import { CLUB_ROLES } from "@/lib/rotary";
import { getRoleLabel } from "@/lib/role-labels";
import type { ClubRole } from "@/generated/prisma/client";

export function AnnouncementForm({
  clubs,
}: {
  clubs: Array<{ id: string; name: string }>;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<"ALL_CLUBS" | "CLUB" | "USERS" | "ROLE">(
    "ALL_CLUBS"
  );
  const [selectedRoles, setSelectedRoles] = useState<ClubRole[]>([]);

  function toggleRole(role: ClubRole) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  return (
    <>
      <form
        className="space-y-4 max-w-xl"
        action={(fd) => {
          startTransition(async () => {
            const result = await sendAnnouncement(
              {
                title: fd.get("title") as string,
                message: fd.get("message") as string,
                targetType,
                targetClubIds: targetType === "CLUB" ? [fd.get("clubId") as string] : undefined,
                targetRoles: targetType === "ROLE" ? selectedRoles : undefined,
                sendEmail: fd.get("sendEmail") === "on",
              },
              locale
            );
            if (result.success) {
              setToast(`Annonce envoyée à ${result.recipients} utilisateur(s)`);
              router.refresh();
            }
          });
        }}
      >
        <Input name="title" label="Titre" required />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Message</label>
          <textarea
            name="message"
            required
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Destinataires</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as typeof targetType)}
            className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
          >
            <option value="ALL_CLUBS">Tous les clubs</option>
            <option value="CLUB">Un club spécifique</option>
            <option value="ROLE">Par rôle</option>
          </select>
        </div>
        {targetType === "CLUB" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Club</label>
            <select
              name="clubId"
              required
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {targetType === "ROLE" && (
          <div className="space-y-2 rounded-lg border border-gray-200 p-3">
            <p className="text-sm text-gray-600">
              Utilisateurs actifs ayant au moins un de ces rôles dans un club.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {CLUB_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  {getRoleLabel(role, locale)}
                </label>
              ))}
            </div>
            {selectedRoles.length === 0 && (
              <p className="text-xs text-amber-700">Sélectionnez au moins un rôle.</p>
            )}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sendEmail" />
          Envoyer aussi par email (nécessite Resend)
        </label>
        <Button
          type="submit"
          variant="gold"
          disabled={pending || (targetType === "ROLE" && selectedRoles.length === 0)}
        >
          {pending ? "..." : "Envoyer l'annonce"}
        </Button>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}