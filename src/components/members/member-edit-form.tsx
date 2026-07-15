"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { updateMember } from "@/actions/members";
import { uploadMemberPhoto, removeMemberPhoto } from "@/actions/uploads";
import { resolveMemberPhotoUrl } from "@/lib/media-url";

export function MemberEditForm({
  member,
  commissions,
  canManage,
}: {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    registrationNumber: string | null;
    position: string | null;
    birthday: Date | null;
    joinDate: Date | null;
    sponsorName: string | null;
    commissionId: string | null;
    bio: string | null;
    photoUrl: string | null;
    isActive: boolean;
    isHonoraryMember: boolean;
  };
  commissions: Array<{ id: string; name: string }>;
  canManage: boolean;
}) {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canManage) {
    return (
      <div className="text-sm text-gray-600 space-y-2">
        <p><strong>{member.firstName} {member.lastName}</strong></p>
        {member.position && <p>{member.position}</p>}
        {member.email && <p>{member.email}</p>}
        {member.bio && <p className="text-gray-500">{member.bio}</p>}
      </div>
    );
  }

  const photoPreview =
    resolveMemberPhotoUrl(member.id, member.photoUrl) ?? member.photoUrl;

  return (
    <form
      className="space-y-4"
      action={(fd) => {
        startTransition(async () => {
          await updateMember(member.id, {
            firstName: fd.get("firstName") as string,
            lastName: fd.get("lastName") as string,
            email: (fd.get("email") as string) || undefined,
            phone: (fd.get("phone") as string) || undefined,
            registrationNumber: (fd.get("registrationNumber") as string) || undefined,
            position: (fd.get("position") as string) || undefined,
            sponsorName: (fd.get("sponsorName") as string) || undefined,
            commissionId: (fd.get("commissionId") as string) || null,
            bio: (fd.get("bio") as string) || undefined,
            birthday: (fd.get("birthday") as string) || undefined,
            joinDate: (fd.get("joinDate") as string) || undefined,
            isActive: fd.get("isActive") === "on",
            isHonoraryMember: fd.get("isHonoraryMember") === "on",
          });
          router.refresh();
        });
      }}
    >
      <ImageUpload
        label={t("profilePhoto")}
        hint={t("profilePhotoHint")}
        currentUrl={photoPreview}
        shape="circle"
        onUpload={(formData) => uploadMemberPhoto(member.id, formData)}
        onRemove={() => removeMemberPhoto(member.id)}
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <Input name="firstName" label={t("firstName")} defaultValue={member.firstName} required />
        <Input name="lastName" label={t("lastName")} defaultValue={member.lastName} required />
        <Input name="email" type="email" label="Email" defaultValue={member.email ?? ""} />
        <Input name="phone" label={t("phone")} defaultValue={member.phone ?? ""} />
        <Input
          name="registrationNumber"
          label={t("registrationNumber")}
          defaultValue={member.registrationNumber ?? ""}
        />
        <Input name="position" label={t("position")} defaultValue={member.position ?? ""} />
        <Input name="sponsorName" label={t("sponsor")} defaultValue={member.sponsorName ?? ""} />
        <Input
          name="birthday"
          type="date"
          label={t("birthday")}
          defaultValue={member.birthday ? member.birthday.toISOString().split("T")[0] : ""}
        />
        <Input
          name="joinDate"
          type="date"
          label={t("joinDate")}
          defaultValue={member.joinDate ? member.joinDate.toISOString().split("T")[0] : ""}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">{t("commission")}</label>
          <select
            name="commissionId"
            defaultValue={member.commissionId ?? ""}
            className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
          >
            <option value="">—</option>
            {commissions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">{t("bio")}</label>
        <textarea
          name="bio"
          rows={3}
          defaultValue={member.bio ?? ""}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={member.isActive} />
        {t("active")}
      </label>
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="isHonoraryMember"
          className="mt-0.5"
          defaultChecked={member.isHonoraryMember}
        />
        <span>
          <span className="font-medium">{t("honoraryMember")}</span>
          <span className="block text-xs text-gray-500">{t("honoraryMemberHint")}</span>
        </span>
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="gold" disabled={pending}>
          {tCommon("save")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/members`)}>
          {tCommon("back")}
        </Button>
      </div>
    </form>
  );
}