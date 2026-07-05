"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { updateClubSettings } from "@/actions/settings";

interface ClubData {
  name: string;
  district?: string | null;
  country: string;
  city: string;
  meetingLocation?: string | null;
  meetingDay?: string | null;
  meetingTime?: string | null;
  email?: string | null;
  website?: string | null;
}

export function ClubSettingsForm({ club }: { club: ClubData }) {
  const t = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <form
        action={(formData) => {
          startTransition(async () => {
            const result = await updateClubSettings({
              name: formData.get("name") as string,
              district: formData.get("district") as string,
              country: formData.get("country") as string,
              city: formData.get("city") as string,
              meetingLocation: formData.get("meetingLocation") as string,
              meetingDay: formData.get("meetingDay") as string,
              meetingTime: formData.get("meetingTime") as string,
              email: formData.get("email") as string,
              website: formData.get("website") as string,
            });
            if (result.success) setToast("Paramètres enregistrés");
          });
        }}
        className="space-y-4"
      >
        <Input name="name" label="Nom du club" defaultValue={club.name} required />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input name="district" label="District" defaultValue={club.district ?? ""} />
          <Input name="country" label="Pays" defaultValue={club.country} required />
        </div>
        <Input name="city" label="Ville" defaultValue={club.city} required />
        <Input name="meetingLocation" label="Lieu de réunion" defaultValue={club.meetingLocation ?? ""} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input name="meetingDay" label="Jour" defaultValue={club.meetingDay ?? ""} />
          <Input name="meetingTime" label="Heure" defaultValue={club.meetingTime ?? ""} />
        </div>
        <Input name="email" type="email" label="Email" defaultValue={club.email ?? ""} />
        <Input name="website" type="url" label="Site web" defaultValue={club.website ?? ""} />
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? "..." : t("save")}
        </Button>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}