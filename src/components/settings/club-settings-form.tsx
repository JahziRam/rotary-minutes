"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { updateClubSettings } from "@/actions/settings";
import { uploadClubLogo, removeClubLogo } from "@/actions/uploads";
import { resolveClubLogoUrl } from "@/lib/media-url";

interface ClubData {
  id: string;
  name: string;
  district?: string | null;
  country: string;
  city: string;
  meetingLocation?: string | null;
  meetingDay?: string | null;
  meetingTime?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
}

export function ClubSettingsForm({ club }: { club: ClubData }) {
  const t = useTranslations("common");
  const tSettings = useTranslations("settings");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const logoPreview = resolveClubLogoUrl(club.id, club.logoUrl) ?? club.logoUrl;

  return (
    <>
      <ImageUpload
        label={tSettings("clubLogo")}
        hint={tSettings("clubLogoHint")}
        currentUrl={logoPreview}
        shape="square"
        fit="contain"
        onUpload={uploadClubLogo}
        onRemove={removeClubLogo}
      />

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
            if (result.success) setToast(tSettings("saved"));
          });
        }}
        className="space-y-4 mt-6"
      >
        <Input name="name" label={tSettings("clubName")} defaultValue={club.name} required />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input name="district" label={tSettings("district")} defaultValue={club.district ?? ""} />
          <Input name="country" label={tSettings("country")} defaultValue={club.country} required />
        </div>
        <Input name="city" label={tSettings("city")} defaultValue={club.city} required />
        <Input name="meetingLocation" label={tSettings("meetingLocation")} defaultValue={club.meetingLocation ?? ""} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input name="meetingDay" label={tSettings("meetingDay")} defaultValue={club.meetingDay ?? ""} />
          <Input name="meetingTime" label={tSettings("meetingTime")} defaultValue={club.meetingTime ?? ""} />
        </div>
        <Input name="email" type="email" label="Email" defaultValue={club.email ?? ""} />
        <Input name="website" type="url" label={tSettings("website")} defaultValue={club.website ?? ""} />
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? "..." : t("save")}
        </Button>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}