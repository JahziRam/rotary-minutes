"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createMember } from "@/actions/members";

export function AddMemberForm() {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

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
            await createMember({
              firstName: formData.get("firstName") as string,
              lastName: formData.get("lastName") as string,
              email: (formData.get("email") as string) || undefined,
              phone: (formData.get("phone") as string) || undefined,
              registrationNumber: (formData.get("registrationNumber") as string) || undefined,
              position: (formData.get("position") as string) || undefined,
              birthday: (formData.get("birthday") as string) || undefined,
              joinDate: (formData.get("joinDate") as string) || undefined,
            });
            setOpen(false);
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
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" variant="gold" disabled={pending}>
            {pending ? "..." : tCommon("save")}
          </Button>
        </div>
      </form>
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