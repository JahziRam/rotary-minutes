"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createMember } from "@/actions/members";
import { AppRolePicker } from "@/components/members/app-role-picker";
import { Toast } from "@/components/ui/toast";
import type { ClubRole } from "@/generated/prisma/client";

export function AddMemberForm({
  canManageRoles = false,
  roleOptions = [],
  customRoles = [],
}: {
  canManageRoles?: boolean;
  roleOptions?: Array<{ value: string; label: string }>;
  customRoles?: Array<{ id: string; label: string }>;
}) {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light transition-all"
      >
        <Plus className="h-4 w-4" />
        {t("add")}
      </button>
    );
  }

  return (
    <CardForm onClose={() => setOpen(false)}>
      <form
        action={(formData) => {
          startTransition(async () => {
            const email = (formData.get("email") as string) || undefined;
            const appRole = canManageRoles
              ? (formData.get("appRole") as ClubRole) || undefined
              : undefined;
            const customRoleId = canManageRoles
              ? (formData.get("customRoleId") as string) || null
              : null;

            const sendLogin = canManageRoles && formData.get("sendLogin") === "on";

            const result = await createMember({
              firstName: formData.get("firstName") as string,
              lastName: formData.get("lastName") as string,
              email,
              phone: (formData.get("phone") as string) || undefined,
              registrationNumber: (formData.get("registrationNumber") as string) || undefined,
              position: (formData.get("position") as string) || undefined,
              birthday: (formData.get("birthday") as string) || undefined,
              joinDate: (formData.get("joinDate") as string) || undefined,
              appRole,
              customRoleId,
              sendLogin: sendLogin && !!email,
              locale,
            });

            if ("error" in result && result.error === "DUPLICATE_MEMBER") {
              setToast(t("errors.duplicateMember"));
              return;
            }

            if (result.success) {
              if (result.loginSent) {
                setToast(t("loginSent"));
              } else if (canManageRoles && appRole && email && !result.roleAssigned) {
                setToast(t("roleNotAssignedYet"));
              }
              setOpen(false);
            }
          });
        }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{t("add")}</h3>
          <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input name="firstName" label="Prénom" required />
          <Input name="lastName" label="Nom" required />
        </div>
        <Input name="email" type="email" label="Email" />
        <Input name="phone" label={t("phone")} />
        <Input name="registrationNumber" label={t("registrationNumber")} />
        <Input name="position" label={t("position")} />
        <Input name="birthday" type="date" label={t("birthday")} />
        <Input name="joinDate" type="date" label={t("joinDate")} />
        {canManageRoles && (
          <div className="space-y-2">
            <div className="space-y-1.5">
              <AppRolePicker
                roleOptions={roleOptions}
                customRoles={customRoles}
              />
              <p className="text-xs text-gray-500">{t("appRoleOnCreateHint")}</p>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" name="sendLogin" className="mt-0.5" />
              <span>
                <span className="font-medium">{t("sendLoginOnCreate")}</span>
                <span className="block text-xs text-gray-500">{t("sendLoginHint")}</span>
              </span>
            </label>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" variant="gold" disabled={pending}>
            {pending ? "..." : tCommon("save")}
          </Button>
        </div>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </CardForm>
  );
}

function CardForm({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-lg p-5 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}