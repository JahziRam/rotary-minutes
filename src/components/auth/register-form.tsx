"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerClub, registerMember } from "@/actions/auth";
import { listPublicClubs } from "@/actions/registration";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { trackEvent } from "@/lib/analytics";
import { CompanyLegalFooter } from "@/components/legal/company-legal-footer";
import { ROTARACT_DISCOUNT_PERCENT } from "@/lib/registration-constants";
import { Building2, User, Search } from "lucide-react";

type RegisterMode = "member" | "club";
type ClubTypeChoice = "ROTARY" | "ROTARACT";

type PublicClub = {
  id: string;
  label: string;
  name: string;
  city: string;
  country: string;
  type: ClubTypeChoice;
};

export function RegisterForm({ referredByCode }: { referredByCode?: string }) {
  const t = useTranslations("auth");
  const tReg = useTranslations("auth.registration");
  const tLegal = useTranslations("legal.disclaimer");
  const locale = useLocale();
  const router = useRouter();

  const [mode, setMode] = useState<RegisterMode>("club");
  const [clubType, setClubType] = useState<ClubTypeChoice>("ROTARY");
  const [clubs, setClubs] = useState<PublicClub[]>([]);
  const [clubSearch, setClubSearch] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadClubs = useCallback(async (query: string) => {
    setLoadingClubs(true);
    try {
      const result = await listPublicClubs(query);
      setClubs(result);
    } finally {
      setLoadingClubs(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== "member") return;
    const timer = setTimeout(() => loadClubs(clubSearch), 300);
    return () => clearTimeout(timer);
  }, [mode, clubSearch, loadClubs]);

  function errorMessage(code: string): string {
    const map: Record<string, string> = {
      EMAIL_EXISTS: tReg("errors.emailExists"),
      CLUB_EXISTS: tReg("errors.clubExists"),
      CLUB_NOT_FOUND: tReg("errors.clubNotFound"),
      MEMBERSHIP_PENDING: tReg("errors.membershipPending"),
      MEMBERSHIP_REJECTED: tReg("errors.membershipRejected"),
      ALREADY_MEMBER: tReg("errors.alreadyMember"),
      MEMBER_EXISTS_IN_CLUB: tReg("errors.memberExistsInClub"),
      SIGNIN_FAILED: tReg("errors.generic"),
    };
    return map[code] ?? tReg("errors.generic");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const password = form.get("password") as string;
    const confirm = form.get("confirmPassword") as string;

    if (password !== confirm) {
      setError(tReg("errors.passwordMismatch"));
      setLoading(false);
      return;
    }

    const base = {
      firstName: form.get("firstName") as string,
      lastName: form.get("lastName") as string,
      email: form.get("email") as string,
      password,
      language: (locale === "en" ? "EN" : "FR") as "FR" | "EN",
    };

    if (mode === "member") {
      if (!selectedClubId) {
        setError(tReg("errors.selectClub"));
        setLoading(false);
        return;
      }

      const result = await registerMember({
        ...base,
        clubId: selectedClubId,
      });

      if (result.error) {
        setError(errorMessage(result.error));
        setLoading(false);
        return;
      }

      trackEvent(ANALYTICS_EVENTS.SIGN_UP, { method: "email", role: "member" });
      router.push(`/${locale}/pending-approval`);
      router.refresh();
      return;
    }

    const result = await registerClub({
      ...base,
      clubName: form.get("clubName") as string,
      clubType,
      country: form.get("country") as string,
      city: form.get("city") as string,
      referredByCode,
    });

    if (result.error) {
      setError(errorMessage(result.error));
      setLoading(false);
      return;
    }

    trackEvent(ANALYTICS_EVENTS.SIGN_UP, { method: "email", role: "club" });
    trackEvent(ANALYTICS_EVENTS.TRIAL_START);

    router.push(`/${locale}/onboarding`);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="h-1 bg-gold" />
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Link
              href={`/${locale}`}
              className="font-display text-2xl font-bold text-navy"
            >
              Rotary Minutes
            </Link>
            <p className="text-sm text-gray-500 mt-2">
              {mode === "club" ? t("trialInfo") : tReg("memberTrialHint")}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-4">
              {t("register")}
            </h1>

            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                type="button"
                onClick={() => setMode("club")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  mode === "club"
                    ? "border-navy bg-navy/5 text-navy"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Building2 className="h-4 w-4" />
                {tReg("modeClub")}
              </button>
              <button
                type="button"
                onClick={() => setMode("member")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  mode === "member"
                    ? "border-navy bg-navy/5 text-navy"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <User className="h-4 w-4" />
                {tReg("modeMember")}
              </button>
            </div>

            {referredByCode && mode === "club" && (
              <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3 mb-4">
                {tReg("referral", { code: referredByCode })}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input name="firstName" label={t("firstName")} required />
                <Input name="lastName" label={t("lastName")} required />
              </div>

              {mode === "club" ? (
                <>
                  <Input
                    name="clubName"
                    label={t("clubName")}
                    required
                    placeholder="Rotary Club de Paris"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {tReg("clubTypeLabel")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setClubType("ROTARY")}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          clubType === "ROTARY"
                            ? "border-navy bg-navy/5 text-navy"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {tReg("rotary")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setClubType("ROTARACT")}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          clubType === "ROTARACT"
                            ? "border-navy bg-navy/5 text-navy"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {tReg("rotaract")}
                      </button>
                    </div>
                    {clubType === "ROTARACT" && (
                      <p className="text-xs text-emerald-700 mt-2 bg-emerald-50 rounded-lg p-2">
                        {tReg("rotaractDiscount", {
                          percent: ROTARACT_DISCOUNT_PERCENT,
                        })}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input name="city" label={tReg("city")} required />
                    <Input name="country" label={tReg("country")} required />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {tReg("selectClubLabel")}
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={clubSearch}
                      onChange={(e) => setClubSearch(e.target.value)}
                      placeholder={tReg("searchClub")}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                    {loadingClubs ? (
                      <p className="p-3 text-sm text-gray-500 text-center">…</p>
                    ) : clubs.length === 0 ? (
                      <p className="p-3 text-sm text-gray-500 text-center">
                        {tReg("noClubsFound")}
                      </p>
                    ) : (
                      clubs.map((club) => (
                        <button
                          key={club.id}
                          type="button"
                          onClick={() => setSelectedClubId(club.id)}
                          className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                            selectedClubId === club.id
                              ? "bg-navy/5 text-navy font-medium"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          {club.label}
                        </button>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{tReg("memberApprovalHint")}</p>
                </div>
              )}

              <Input name="email" type="email" label={t("email")} required />
              <Input
                name="password"
                type="password"
                label={t("password")}
                required
                minLength={8}
              />
              <Input
                name="confirmPassword"
                type="password"
                label={t("confirmPassword")}
                required
              />

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  {error}
                </p>
              )}
              <p className="text-xs text-gray-500 leading-relaxed">
                {tLegal("text")}{" "}
                <Link
                  href={`/${locale}/terms`}
                  className="text-navy underline-offset-2 hover:underline"
                >
                  {tLegal("termsLink")}
                </Link>
              </p>
              <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                {loading ? "…" : t("register")}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-500">
              {t("hasAccount")}{" "}
              <Link
                href={`/${locale}/login`}
                className="text-navy font-medium hover:underline"
              >
                {t("login")}
              </Link>
            </p>
          </div>
        </div>
      </div>
      <CompanyLegalFooter />
    </div>
  );
}