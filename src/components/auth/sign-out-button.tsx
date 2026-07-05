"use client";

import { useLocale } from "next-intl";
import { LogOut } from "lucide-react";
import { logoutUser } from "@/actions/auth";

export function SignOutButton({ label }: { label: string }) {
  const locale = useLocale();

  return (
    <form action={logoutUser}>
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white w-full transition-colors"
      >
        <LogOut className="h-5 w-5" />
        {label}
      </button>
    </form>
  );
}